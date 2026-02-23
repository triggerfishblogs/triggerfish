/**
 * Password/secret prompt keypress handling for the CLI chat REPL.
 *
 * Routes keypresses while the terminal is in password mode (secret_prompt),
 * handling enter (submit), esc/ctrl+c (cancel), backspace, and printable
 * character input.
 *
 * @module
 */

import type { Logger } from "../../core/logger/logger.ts";
import type { LineEditor } from "../../cli/terminal/terminal.ts";
import type { ScreenManager } from "../../cli/terminal/screen.ts";
import type { PasswordModeState, WsRouterState } from "./chat_ws_router.ts";

/**
 * Route a keypress while password mode (secret_prompt) is active.
 *
 * Handles enter (submit), esc/ctrl+c (cancel), backspace, and
 * printable character input. Mutates `pm.chars` and `state.passwordMode`
 * as side effects.
 */
export function routePasswordKeypress(
  keypress: { readonly key: string; readonly char: string | null },
  pm: PasswordModeState,
  state: WsRouterState,
  ws: WebSocket,
  screen: ScreenManager,
  editor: LineEditor,
  log: Logger,
): void {
  if (keypress.key === "enter") {
    submitPasswordValue(pm, state, ws, screen, editor, log);
    return;
  }
  if (keypress.key === "esc" || keypress.key === "ctrl+c") {
    cancelPasswordEntry(pm, state, ws, screen, editor, log);
    return;
  }
  if (keypress.key === "backspace") {
    deletePasswordChar(pm, screen);
    return;
  }
  if (keypress.char !== null) {
    appendPasswordChar(pm, keypress.char, screen);
  }
}

/** Submit the accumulated password value via WebSocket. */
function submitPasswordValue(
  pm: PasswordModeState,
  state: WsRouterState,
  ws: WebSocket,
  screen: ScreenManager,
  editor: LineEditor,
  log: Logger,
): void {
  const value = pm.chars.join("");
  try {
    ws.send(JSON.stringify({
      type: "secret_prompt_response",
      nonce: pm.nonce,
      value,
    }));
  } catch (_err: unknown) {
    log.debug("WebSocket send failed: connection closed");
  }
  screen.writeOutput("  \x1b[32m\u2713 Secret submitted\x1b[0m");
  screen.clearStatus();
  state.passwordMode = null;
  screen.redrawInput(editor);
}

/** Cancel the password entry and notify the daemon. */
function cancelPasswordEntry(
  pm: PasswordModeState,
  state: WsRouterState,
  ws: WebSocket,
  screen: ScreenManager,
  editor: LineEditor,
  log: Logger,
): void {
  try {
    ws.send(JSON.stringify({
      type: "secret_prompt_response",
      nonce: pm.nonce,
      value: null,
    }));
  } catch (_err: unknown) {
    log.debug("WebSocket send failed: connection closed");
  }
  screen.writeOutput("  \x1b[33m\u2717 Secret entry cancelled\x1b[0m");
  screen.clearStatus();
  state.passwordMode = null;
  screen.redrawInput(editor);
}

/** Delete the last character from the password buffer. */
function deletePasswordChar(
  pm: PasswordModeState,
  screen: ScreenManager,
): void {
  if (pm.chars.length > 0) {
    pm.chars.pop();
    const masked = "\u25cf".repeat(pm.chars.length);
    screen.setStatus("\u{1f512} " + pm.name + ": " + masked);
  }
}

/** Append a printable character to the password buffer. */
function appendPasswordChar(
  pm: PasswordModeState,
  char: string,
  screen: ScreenManager,
): void {
  pm.chars.push(char);
  const masked = "\u25cf".repeat(pm.chars.length);
  screen.setStatus("\u{1f512} " + pm.name + ": " + masked);
}
