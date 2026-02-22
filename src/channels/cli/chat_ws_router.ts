/**
 * WebSocket message routing for the CLI chat REPL.
 *
 * Parses incoming daemon events and dispatches them to the screen
 * manager, event handler, or state callbacks as appropriate.
 * @module
 */

import { createLogger } from "../../core/logger/logger.ts";
import { formatError, renderError, renderPrompt } from "../../cli/chat/chat_ui.ts";
import type { ToolDisplayMode } from "../../cli/chat/chat_ui.ts";
import type { ScreenManager } from "../../cli/terminal/screen.ts";
import { taintColor } from "../../cli/terminal/screen.ts";
import type { LineEditor } from "../../cli/terminal/terminal.ts";
import type { OrchestratorEvent } from "../../agent/orchestrator.ts";
import type { ChatEvent } from "../../core/types/chat_event.ts";

const log = createLogger("cli");

/** Password-mode state — active when the daemon sends a secret_prompt event. */
export interface PasswordModeState {
  readonly nonce: string;
  readonly name: string;
  readonly hint?: string;
  /** Whether to also collect a username (username-collection phase comes first). */
  readonly needsUsername: boolean;
  /** Password characters collected in masked mode. */
  readonly chars: string[];
  /** Username characters collected in visible mode (used when needsUsername is true). */
  readonly usernameChars: string[];
  /**
   * When needsUsername is true, false = currently collecting username,
   * true = currently collecting password. Always true when needsUsername is false.
   */
  usernameCollected: boolean;
}

/** Mutable refs shared between the WS router and the keypress loop. */
export interface WsRouterState {
  isProcessing: boolean;
  passwordMode: PasswordModeState | null;
  providerName: string;
}

/** Dependencies injected into the WebSocket message router. */
export interface WsRouterDeps {
  readonly screen: ScreenManager;
  readonly isTty: boolean;
  readonly getEditor: () => LineEditor;
  readonly eventHandler: (evt: OrchestratorEvent) => void;
  readonly state: WsRouterState;
  readonly messageQueue: string[];
  readonly ws: WebSocket;
  readonly resolveConnected: () => void;
}

/**
 * Send the next queued message over the WebSocket.
 *
 * Called after a response completes to drain any messages queued
 * while the previous turn was processing.
 */
export function sendNextQueuedMessage(deps: WsRouterDeps): void {
  const { messageQueue, screen, state, ws } = deps;
  if (messageQueue.length === 0) return;
  const next = messageQueue.shift()!;
  const editor = deps.getEditor();
  screen.writeOutput(`  ${taintColor(screen.getTaint())}\x1b[1m❯\x1b[0m ${next}`);
  screen.writeOutput(`  \x1b[2m(queued)\x1b[0m`);
  screen.writeOutput("");
  state.isProcessing = true;
  try {
    ws.send(JSON.stringify({ type: "message", content: next }));
  } catch (err: unknown) {
    log.debug("WebSocket send failed: connection closed", { error: err });
    screen.writeOutput(formatError("Lost connection to daemon"));
    state.isProcessing = false;
    screen.redrawInput(editor);
  }
}

/**
 * Create a WebSocket "message" event handler that routes daemon events
 * to the appropriate screen/state callbacks.
 *
 * @returns An EventListener suitable for `ws.addEventListener("message", ...)`.
 */
export function createWsMessageRouter(deps: WsRouterDeps): (event: MessageEvent) => void {
  const { screen, isTty, eventHandler, state, resolveConnected } = deps;

  return (event: MessageEvent) => {
    try {
      const data = typeof event.data === "string"
        ? event.data
        : new TextDecoder().decode(event.data as ArrayBuffer);
      const evt = JSON.parse(data) as ChatEvent;
      const editor = deps.getEditor();

      if (evt.type === "connected") {
        state.providerName = evt.provider;
        if (evt.taint) {
          screen.setTaint(evt.taint);
        }
        resolveConnected();
        return;
      }

      if (evt.type === "taint_changed") {
        screen.setTaint(evt.level);
        if (isTty) screen.redrawInput(editor);
        return;
      }

      if (evt.type === "mcp_status") {
        if (isTty) {
          screen.setMcpStatus(evt.connected, evt.configured);
          screen.redrawInput(editor);
        }
        return;
      }

      if (evt.type === "notification") {
        if (isTty) {
          screen.writeOutput(`  \x1b[33m⚡ [trigger]\x1b[0m ${evt.message}`);
          screen.writeOutput("");
          screen.redrawInput(editor);
        } else {
          console.log(`\n  [trigger] ${evt.message}\n`);
          renderPrompt();
        }
        return;
      }

      if (evt.type === "secret_prompt") {
        if (isTty) {
          const needsUsername = evt.needsUsername === true;
          state.passwordMode = {
            nonce: evt.nonce,
            name: evt.name,
            hint: evt.hint,
            needsUsername,
            chars: [],
            usernameChars: [],
            usernameCollected: !needsUsername,
          };
          screen.stopSpinner();
          const hintStr = evt.hint ? ` (${evt.hint})` : "";
          if (needsUsername) {
            screen.writeOutput(`  \x1b[33m\u{1f512} Enter credentials for '${evt.name}'${hintStr}\x1b[0m`);
            screen.setStatus(`\u{1f512} ${evt.name} username: `);
          } else {
            screen.writeOutput(`  \x1b[33m\u{1f512} Enter value for '${evt.name}'${hintStr}\x1b[0m`);
            screen.setStatus("\u{1f512} Type secret, Enter to submit, Esc to cancel");
          }
          screen.redrawInput(editor);
        }
        return;
      }

      if (evt.type === "cancelled") {
        if (isTty) {
          screen.stopSpinner();
          screen.redrawInput(editor);
        }
        state.isProcessing = false;
        sendNextQueuedMessage(deps);
        return;
      }

      if (evt.type === "error") {
        if (isTty) {
          screen.stopSpinner();
          screen.writeOutput(formatError(evt.message));
          screen.writeOutput("");
          screen.redrawInput(editor);
        } else {
          renderError(evt.message);
          renderPrompt();
        }
        state.isProcessing = false;
        sendNextQueuedMessage(deps);
        return;
      }

      if (evt.type === "compact_start") {
        if (isTty) {
          screen.startSpinner("Summarizing history...");
        } else {
          console.log("  Summarizing history...");
        }
        return;
      }

      if (evt.type === "compact_complete") {
        const saved = evt.tokensBefore - evt.tokensAfter;
        const msg =
          `  Compacted: ${evt.messagesBefore} → ${evt.messagesAfter} messages (saved ~${saved} tokens)`;
        if (isTty) {
          screen.stopSpinner();
          screen.writeOutput(msg);
          screen.redrawInput(editor);
        } else {
          console.log(msg);
          renderPrompt();
        }
        return;
      }

      if (evt.type === "response_chunk") {
        eventHandler(evt as OrchestratorEvent);
        if (isTty) screen.redrawInput(editor);
        return;
      }

      if (evt.type === "response") {
        eventHandler(evt as OrchestratorEvent);
        state.isProcessing = false;
        if (isTty) {
          screen.writeOutput("");
          screen.redrawInput(editor);
        } else {
          renderPrompt();
        }
        sendNextQueuedMessage(deps);
        return;
      }

      // Forward all other events (llm_start, llm_complete, tool_call, tool_result)
      eventHandler(evt as OrchestratorEvent);
      if (isTty) {
        screen.redrawInput(editor);
      }
    } catch (err: unknown) {
      log.warn("Message parse failed", { error: err });
    }
  };
}
