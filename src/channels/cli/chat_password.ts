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
import type {
  PasswordModeState,
  CredentialModeState,
  WsRouterState,
} from "./chat_ws_router.ts";

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

// ─── Credential mode keypress handling ──────────────────────────

/**
 * Route a keypress while credential mode (credential_prompt) is active.
 *
 * In the username phase, characters are shown (not masked).
 * In the password phase, characters are masked with bullets.
 * Enter advances from username to password, or submits from password.
 * Esc/Ctrl+C cancels the entire flow.
 */
export function routeCredentialKeypress(
  keypress: { readonly key: string; readonly char: string | null },
  cm: CredentialModeState,
  state: WsRouterState,
  ws: WebSocket,
  screen: ScreenManager,
  editor: LineEditor,
  log: Logger,
): void {
  if (keypress.key === "esc" || keypress.key === "ctrl+c") {
    cancelCredentialEntry(cm, state, ws, screen, editor, log);
    return;
  }

  if (cm.phase === "username") {
    routeCredentialUsernameKeypress(keypress, cm, state, screen);
  } else {
    routeCredentialPasswordKeypress(keypress, cm, state, ws, screen, editor, log);
  }
}

/** Route keypresses during the username phase. */
function routeCredentialUsernameKeypress(
  keypress: { readonly key: string; readonly char: string | null },
  cm: CredentialModeState,
  state: WsRouterState,
  screen: ScreenManager,
): void {
  if (keypress.key === "enter") {
    advanceToPasswordPhase(cm, state, screen);
    return;
  }
  if (keypress.key === "backspace") {
    if (cm.username.length > 0) {
      cm.username.pop();
      screen.setStatus(
        "\u{1f512} " + cm.name + " username: " + cm.username.join(""),
      );
    }
    return;
  }
  if (keypress.char !== null) {
    cm.username.push(keypress.char);
    screen.setStatus(
      "\u{1f512} " + cm.name + " username: " + cm.username.join(""),
    );
  }
}

/** Advance from the username phase to the password phase. */
function advanceToPasswordPhase(
  cm: CredentialModeState,
  state: WsRouterState,
  screen: ScreenManager,
): void {
  // Mutate phase to password — CredentialModeState.phase is typed as
  // a union but the object is mutable via the WsRouterState holder.
  (cm as { phase: string }).phase = "password";
  state.credentialMode = cm;
  screen.setStatus(
    "\u{1f512} Type password, Enter to submit, Esc to cancel",
  );
}

/** Route keypresses during the password phase. */
function routeCredentialPasswordKeypress(
  keypress: { readonly key: string; readonly char: string | null },
  cm: CredentialModeState,
  state: WsRouterState,
  ws: WebSocket,
  screen: ScreenManager,
  editor: LineEditor,
  log: Logger,
): void {
  if (keypress.key === "enter") {
    submitCredentialValue(cm, state, ws, screen, editor, log);
    return;
  }
  if (keypress.key === "backspace") {
    if (cm.password.length > 0) {
      cm.password.pop();
      const masked = "\u25cf".repeat(cm.password.length);
      screen.setStatus("\u{1f512} " + cm.name + " password: " + masked);
    }
    return;
  }
  if (keypress.char !== null) {
    cm.password.push(keypress.char);
    const masked = "\u25cf".repeat(cm.password.length);
    screen.setStatus("\u{1f512} " + cm.name + " password: " + masked);
  }
}

/** Submit the accumulated credential (username + password) via WebSocket. */
function submitCredentialValue(
  cm: CredentialModeState,
  state: WsRouterState,
  ws: WebSocket,
  screen: ScreenManager,
  editor: LineEditor,
  log: Logger,
): void {
  const username = cm.username.join("");
  const password = cm.password.join("");
  try {
    ws.send(JSON.stringify({
      type: "credential_prompt_response",
      nonce: cm.nonce,
      username,
      password,
    }));
  } catch (_err: unknown) {
    log.debug("WebSocket send failed: connection closed");
  }
  screen.writeOutput("  \x1b[32m\u2713 Credential submitted\x1b[0m");
  screen.clearStatus();
  state.credentialMode = null;
  screen.redrawInput(editor);
}

/** Cancel the credential entry and notify the daemon. */
function cancelCredentialEntry(
  cm: CredentialModeState,
  state: WsRouterState,
  ws: WebSocket,
  screen: ScreenManager,
  editor: LineEditor,
  log: Logger,
): void {
  try {
    ws.send(JSON.stringify({
      type: "credential_prompt_response",
      nonce: cm.nonce,
      username: null,
      password: null,
    }));
  } catch (_err: unknown) {
    log.debug("WebSocket send failed: connection closed");
  }
  screen.writeOutput("  \x1b[33m\u2717 Credential entry cancelled\x1b[0m");
  screen.clearStatus();
  state.credentialMode = null;
  screen.redrawInput(editor);
}
