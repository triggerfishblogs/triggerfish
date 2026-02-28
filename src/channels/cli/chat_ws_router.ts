/**
 * WebSocket message routing for the CLI chat REPL.
 *
 * Parses incoming daemon events and dispatches them to the screen
 * manager, event handler, or state callbacks as appropriate.
 * @module
 */

import { createLogger } from "../../core/logger/logger.ts";
import {
  formatError,
  renderError,
  renderPrompt,
} from "../../cli/chat/chat_ui.ts";
import type { ScreenManager } from "../../cli/terminal/screen.ts";
import type { LineEditor } from "../../cli/terminal/terminal.ts";
import type { OrchestratorEvent } from "../../agent/orchestrator/orchestrator_types.ts";
import type { ChatEvent } from "../../core/types/chat_event.ts";
import type { ClassificationLevel } from "../../core/types/classification.ts";
import { canFlowTo } from "../../core/types/classification.ts";

import type { WsRouterDeps, WsRouterState } from "./chat_ws_types.ts";
import type { TriggerPromptModeState } from "./chat_ws_types.ts";
import { sendNextQueuedMessage } from "./chat_ws_types.ts";

export type { PasswordModeState, CredentialModeState, TriggerPromptModeState, WsRouterState, WsRouterDeps } from "./chat_ws_types.ts";
export { sendNextQueuedMessage } from "./chat_ws_types.ts";

const log = createLogger("cli");

/** Resolved context passed to each per-event-type handler. */
interface RouterContext {
  readonly screen: ScreenManager;
  readonly isTty: boolean;
  readonly editor: LineEditor;
  readonly eventHandler: (evt: OrchestratorEvent) => void;
  readonly state: WsRouterState;
  readonly deps: WsRouterDeps;
}

// ─── Per-event-type handlers (unexported) ───────────────────────

function routeConnectedEvent(
  evt: Extract<ChatEvent, { type: "connected" }>,
  ctx: RouterContext,
  resolveConnected: () => void,
): void {
  ctx.state.providerName = evt.provider;
  if (evt.taint) {
    ctx.screen.setTaint(evt.taint);
  }
  resolveConnected();
}

function routeTaintChangedEvent(
  evt: Extract<ChatEvent, { type: "taint_changed" }>,
  ctx: RouterContext,
): void {
  ctx.screen.setTaint(evt.level);
  if (ctx.isTty) ctx.screen.redrawInput(ctx.editor);
}

function routeMcpStatusEvent(
  evt: Extract<ChatEvent, { type: "mcp_status" }>,
  ctx: RouterContext,
): void {
  if (ctx.isTty) {
    ctx.screen.setMcpStatus(evt.connected, evt.configured);
    ctx.screen.redrawInput(ctx.editor);
  }
}

function routeNotificationEvent(
  evt: Extract<ChatEvent, { type: "notification" }>,
  ctx: RouterContext,
): void {
  if (ctx.isTty) {
    ctx.screen.writeOutput(`  \x1b[33m⚡ [trigger]\x1b[0m ${evt.message}`);
    ctx.screen.writeOutput("");
    ctx.screen.redrawInput(ctx.editor);
  } else {
    console.log(`\n  [trigger] ${evt.message}\n`);
    renderPrompt();
  }
}

function routeSecretPromptEvent(
  evt: Extract<ChatEvent, { type: "secret_prompt" }>,
  ctx: RouterContext,
): void {
  if (!ctx.isTty) return;
  log.info("Secret prompt received", { operation: "routeSecretPromptEvent", secretName: evt.name, nonce: evt.nonce });
  ctx.state.passwordMode = {
    nonce: evt.nonce,
    name: evt.name,
    hint: evt.hint,
    chars: [],
  };
  ctx.screen.stopSpinner();
  const hintStr = evt.hint ? ` (${evt.hint})` : "";
  ctx.screen.writeOutput(
    `  \x1b[33m\u{1f512} Enter value for '${evt.name}'${hintStr}\x1b[0m`,
  );
  ctx.screen.setStatus(
    "\u{1f512} Type secret, Enter to submit, Esc to cancel",
  );
  ctx.screen.redrawInput(ctx.editor);
}

function routeCredentialPromptEvent(
  evt: Extract<ChatEvent, { type: "credential_prompt" }>,
  ctx: RouterContext,
): void {
  if (!ctx.isTty) return;
  log.info("Credential prompt received", { operation: "routeCredentialPromptEvent", credentialName: evt.name, nonce: evt.nonce });
  ctx.state.credentialMode = {
    nonce: evt.nonce,
    name: evt.name,
    hint: evt.hint,
    phase: "username",
    username: [],
    password: [],
  };
  ctx.screen.stopSpinner();
  const hintStr = evt.hint ? ` (${evt.hint})` : "";
  ctx.screen.writeOutput(
    `  \x1b[33m\u{1f512} Enter credentials for '${evt.name}'${hintStr}\x1b[0m`,
  );
  ctx.screen.setStatus(
    "\u{1f512} Type username, Enter to continue, Esc to cancel",
  );
  ctx.screen.redrawInput(ctx.editor);
}

/** Build the consequence clause for the trigger prompt question. */
function describeTriggerConsequence(
  sessionTaint: ClassificationLevel,
  triggerClassification: ClassificationLevel,
  isWriteDown: boolean,
): string {
  if (isWriteDown) {
    return "Your context will be reset to incorporate this result.";
  }
  const addedMsg = "This result will be added to your current conversation context.";
  if (sessionTaint === triggerClassification) {
    return addedMsg;
  }
  return `Your session will escalate from ${sessionTaint} to ${triggerClassification}. ${addedMsg}`;
}

/** Activate a trigger prompt — show the question and enter prompt mode. */
function activateTriggerPrompt(
  prompt: TriggerPromptModeState,
  ctx: RouterContext,
): void {
  const sessionTaint = ctx.screen.getTaint();
  const isWriteDown = !canFlowTo(sessionTaint, prompt.classification);
  log.debug("Trigger prompt classification check", {
    operation: "activateTriggerPrompt",
    sessionTaint,
    triggerClassification: prompt.classification,
    isWriteDown,
  });
  const consequence = describeTriggerConsequence(
    sessionTaint,
    prompt.classification,
    isWriteDown,
  );

  ctx.screen.stopSpinner();
  ctx.screen.writeOutput(
    `  \x1b[33m\u26a1\x1b[0m \x1b[1mWould you like to allow this trigger result into context? ${consequence}\x1b[0m`,
  );
  ctx.screen.setStatus(
    isWriteDown
      ? "\u26a0 Session will reset. [Y] Accept  [N/Esc] Dismiss"
      : "\u26a1 Add to context? [Y] Accept  [N/Esc] Dismiss",
  );
  ctx.state.triggerPromptMode = prompt;
  ctx.screen.redrawInput(ctx.editor);
}

function routeTriggerPromptEvent(
  evt: Extract<ChatEvent, { type: "trigger_prompt" }>,
  ctx: RouterContext,
): void {
  if (!ctx.isTty) return;
  const prompt: TriggerPromptModeState = {
    source: evt.source,
    classification: evt.classification,
  };
  if (ctx.state.isProcessing) {
    ctx.state.pendingTriggerPrompt = prompt;
    log.debug("Trigger prompt queued (agent is processing)", {
      operation: "routeTriggerPromptEvent",
      source: evt.source,
    });
    return;
  }
  log.debug("Trigger prompt activating immediately", {
    operation: "routeTriggerPromptEvent",
    source: evt.source,
  });
  activateTriggerPrompt(prompt, ctx);
}

/** Show a pending trigger prompt if one was queued while processing. */
function drainPendingTriggerPrompt(ctx: RouterContext): void {
  if (!ctx.isTty) return;
  const pending = ctx.state.pendingTriggerPrompt;
  if (pending && !ctx.state.isProcessing) {
    ctx.state.pendingTriggerPrompt = null;
    activateTriggerPrompt(pending, ctx);
  }
}

function routeCancelledEvent(ctx: RouterContext): void {
  if (ctx.isTty) {
    ctx.screen.stopSpinner();
    ctx.screen.redrawInput(ctx.editor);
  }
  ctx.state.isProcessing = false;
  sendNextQueuedMessage(ctx.deps);
  drainPendingTriggerPrompt(ctx);
}

function routeErrorEvent(
  evt: Extract<ChatEvent, { type: "error" }>,
  ctx: RouterContext,
): void {
  if (ctx.isTty) {
    ctx.screen.stopSpinner();
    ctx.screen.writeOutput(formatError(evt.message));
    ctx.screen.writeOutput("");
    ctx.screen.redrawInput(ctx.editor);
  } else {
    renderError(evt.message);
    renderPrompt();
  }
  ctx.state.isProcessing = false;
  sendNextQueuedMessage(ctx.deps);
  drainPendingTriggerPrompt(ctx);
}

function routeCompactStartEvent(ctx: RouterContext): void {
  if (ctx.isTty) {
    ctx.screen.startSpinner("Summarizing history...");
  } else {
    console.log("  Summarizing history...");
  }
}

function routeCompactCompleteEvent(
  evt: Extract<ChatEvent, { type: "compact_complete" }>,
  ctx: RouterContext,
): void {
  const saved = evt.tokensBefore - evt.tokensAfter;
  const msg =
    `  Compacted: ${evt.messagesBefore} → ${evt.messagesAfter} messages (saved ~${saved} tokens)`;
  if (ctx.isTty) {
    ctx.screen.stopSpinner();
    ctx.screen.writeOutput(msg);
    ctx.screen.redrawInput(ctx.editor);
  } else {
    console.log(msg);
    renderPrompt();
  }
}

function routeResponseChunkEvent(
  evt: ChatEvent,
  ctx: RouterContext,
): void {
  ctx.eventHandler(evt as OrchestratorEvent);
  if (ctx.isTty) ctx.screen.redrawInput(ctx.editor);
}

function routeResponseCompleteEvent(
  evt: ChatEvent,
  ctx: RouterContext,
): void {
  ctx.eventHandler(evt as OrchestratorEvent);
  ctx.state.isProcessing = false;
  if (ctx.isTty) {
    ctx.screen.writeOutput("");
    ctx.screen.redrawInput(ctx.editor);
  } else {
    renderPrompt();
  }
  sendNextQueuedMessage(ctx.deps);
  drainPendingTriggerPrompt(ctx);
}

function forwardOrchestratorEvent(
  evt: ChatEvent,
  ctx: RouterContext,
): void {
  ctx.eventHandler(evt as OrchestratorEvent);
  if (ctx.isTty) {
    ctx.screen.redrawInput(ctx.editor);
  }
}

/** Decode a raw WebSocket message payload to a string. */
function decodeWsPayload(data: unknown): string {
  return typeof data === "string"
    ? data
    : new TextDecoder().decode(data as ArrayBuffer);
}

// ─── Factory ────────────────────────────────────────────────────

/**
 * Create a WebSocket "message" event handler that routes daemon events
 * to the appropriate screen/state callbacks.
 *
 * @returns An EventListener suitable for `ws.addEventListener("message", ...)`.
 */
export function createWsMessageRouter(
  deps: WsRouterDeps,
): (event: MessageEvent) => void {
  const { screen, isTty, eventHandler, state, resolveConnected } = deps;

  return (event: MessageEvent) => {
    try {
      const evt = JSON.parse(decodeWsPayload(event.data)) as ChatEvent;
      const ctx: RouterContext = {
        screen,
        isTty,
        editor: deps.getEditor(),
        eventHandler,
        state,
        deps,
      };

      dispatchChatEvent(evt, ctx, resolveConnected);
    } catch (err: unknown) {
      log.warn("Message parse failed", { error: err });
    }
  };
}

/** Dispatch a parsed chat event to the appropriate handler. */
function dispatchChatEvent(
  evt: ChatEvent,
  ctx: RouterContext,
  resolveConnected: () => void,
): void {
  switch (evt.type) {
    case "connected":
      return routeConnectedEvent(evt, ctx, resolveConnected);
    case "taint_changed":
      return routeTaintChangedEvent(evt, ctx);
    case "mcp_status":
      return routeMcpStatusEvent(evt, ctx);
    case "notification":
      return routeNotificationEvent(evt, ctx);
    case "trigger_prompt":
      return routeTriggerPromptEvent(evt, ctx);
    case "secret_prompt":
      return routeSecretPromptEvent(evt, ctx);
    case "credential_prompt":
      return routeCredentialPromptEvent(
        evt as Extract<ChatEvent, { type: "credential_prompt" }>,
        ctx,
      );
    case "cancelled":
      return routeCancelledEvent(ctx);
    case "error":
      return routeErrorEvent(evt, ctx);
    case "compact_start":
      return routeCompactStartEvent(ctx);
    case "compact_complete":
      return routeCompactCompleteEvent(evt, ctx);
    case "response_chunk":
      return routeResponseChunkEvent(evt, ctx);
    case "response":
      return routeResponseCompleteEvent(evt, ctx);
    default:
      return forwardOrchestratorEvent(evt, ctx);
  }
}
