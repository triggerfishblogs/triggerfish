/**
 * Trigger prompt keypress handling for the CLI chat REPL.
 *
 * Routes keypresses while the terminal is in trigger-prompt mode
 * (trigger_prompt event), handling Y/Enter (accept) and N/Esc (dismiss).
 *
 * @module
 */

import type { Logger } from "../../core/logger/logger.ts";
import type { LineEditor } from "../../cli/terminal/terminal.ts";
import type { ScreenManager } from "../../cli/terminal/screen.ts";
import type {
  TriggerPromptModeState,
  WsRouterState,
} from "./chat_ws_types.ts";

/**
 * Route a keypress while trigger-prompt mode is active.
 *
 * Handles Y/Enter (accept), N/Esc (dismiss). All other keys are ignored.
 */
export function routeTriggerPromptKeypress(
  keypress: { readonly key: string; readonly char: string | null },
  pm: TriggerPromptModeState,
  state: WsRouterState,
  ws: WebSocket,
  screen: ScreenManager,
  editor: LineEditor,
  log: Logger,
): void {
  const lower = keypress.key === "y" ||
    (keypress.char !== null && keypress.char.toLowerCase() === "y");

  if (lower || keypress.key === "enter") {
    acceptTriggerPrompt(pm, state, ws, screen, editor, log);
    return;
  }
  const isN = keypress.key === "n" ||
    (keypress.char !== null && keypress.char.toLowerCase() === "n");

  if (isN || keypress.key === "esc") {
    dismissTriggerPrompt(pm, state, ws, screen, editor, log);
    return;
  }
  // All other keys: ignored while trigger prompt is active
}

/** Accept the trigger prompt and notify the daemon. */
function acceptTriggerPrompt(
  pm: TriggerPromptModeState,
  state: WsRouterState,
  ws: WebSocket,
  screen: ScreenManager,
  editor: LineEditor,
  log: Logger,
): void {
  try {
    ws.send(JSON.stringify({
      type: "trigger_prompt_response",
      source: pm.source,
      accepted: true,
    }));
    log.debug("Trigger prompt accepted", {
      operation: "acceptTriggerPrompt",
      source: pm.source,
    });
  } catch (err: unknown) {
    log.debug("WebSocket trigger prompt send failed", {
      operation: "acceptTriggerPrompt",
      err,
    });
  }
  screen.clearStatus();
  state.triggerPromptMode = null;
  state.isProcessing = true;
  screen.startSpinner("Loading trigger output...");
  screen.redrawInput(editor);
}

/** Dismiss the trigger prompt and notify the daemon. */
function dismissTriggerPrompt(
  pm: TriggerPromptModeState,
  state: WsRouterState,
  ws: WebSocket,
  screen: ScreenManager,
  editor: LineEditor,
  log: Logger,
): void {
  try {
    ws.send(JSON.stringify({
      type: "trigger_prompt_response",
      source: pm.source,
      accepted: false,
    }));
    log.debug("Trigger prompt dismissed", {
      operation: "dismissTriggerPrompt",
      source: pm.source,
    });
  } catch (err: unknown) {
    log.debug("WebSocket trigger dismiss send failed", {
      operation: "dismissTriggerPrompt",
      err,
    });
  }
  screen.writeOutput("  \x1b[2mTrigger dismissed\x1b[0m");
  screen.clearStatus();
  state.triggerPromptMode = null;
  screen.redrawInput(editor);
}
