/**
 * Keypress routing and interrupt handling for the CLI chat REPL.
 *
 * Routes individual keypresses to the appropriate handler (editing,
 * history, clipboard, mode toggle, etc.) and manages interrupt signals
 * (ESC, Ctrl+C, SIGINT, SIGWINCH).
 *
 * @module
 */

import type { Logger } from "../../core/logger/logger.ts";
import type { TriggerFishConfig } from "../../core/config.ts";
import type { LineEditor } from "../../cli/terminal/terminal.ts";
import { createSuggestionEngine } from "../../cli/terminal/terminal.ts";
import type { ScreenManager } from "../../cli/terminal/screen.ts";
import type { WsRouterState } from "./chat_ws_router.ts";
import type { ChatReplState } from "./chat_input.ts";
import { handleClipboardPaste, handleEnterKeypress } from "./chat_input.ts";
import {
  deleteWordBackward,
  navigateHistoryDown,
  navigateHistoryUp,
  refreshAutocompleteSuggestion,
} from "./chat_commands.ts";

/** Send a cancel message to the daemon WebSocket. */
export function sendCancelMessage(ws: WebSocket, log: Logger): void {
  try {
    ws.send(JSON.stringify({ type: "cancel" }));
  } catch (err: unknown) {
    log.debug("WebSocket cancel message send failed", { err });
  }
}

/** Handle the ESC key during active processing (interrupt). */
export function handleEscInterrupt(
  ws: WebSocket,
  screen: ScreenManager,
  log: Logger,
): void {
  sendCancelMessage(ws, log);
  screen.writeOutput("  \x1b[33m\u26a0 Interrupted\x1b[0m");
}

/** Handle Ctrl+C: cancel or exit depending on processing state. */
export function handleCtrlCKeypress(
  rs: ChatReplState,
  state: WsRouterState,
  ws: WebSocket,
  screen: ScreenManager,
  log: Logger,
  cleanup: () => void,
): "exit" | "continue" {
  if (!state.isProcessing) {
    cleanup();
    return "exit";
  }
  const now = Date.now();
  if (now - rs.lastCtrlCTime < 1000) {
    cleanup();
    return "exit";
  }
  rs.lastCtrlCTime = now;
  sendCancelMessage(ws, log);
  screen.writeOutput(
    "  \x1b[33m\u26a0 Interrupted (Ctrl+C again to exit)\x1b[0m",
  );
  return "continue";
}

/** Install SIGINT and SIGWINCH signal handlers for TTY mode. */
export function installChatSignalHandlers(
  state: WsRouterState,
  ws: WebSocket,
  screen: ScreenManager,
  getEditor: () => LineEditor,
  cleanup: () => void,
  log: Logger,
): void {
  installSigintHandler(state, ws, screen, cleanup, log);
  installSigwinchHandler(screen, getEditor, log);
}

/** Install a SIGINT handler that cancels or exits. */
function installSigintHandler(
  state: WsRouterState,
  ws: WebSocket,
  screen: ScreenManager,
  cleanup: () => void,
  log: Logger,
): void {
  try {
    Deno.addSignalListener("SIGINT", () => {
      if (state.isProcessing) {
        sendCancelMessage(ws, log);
        screen.writeOutput("  \x1b[33m\u26a0 Interrupted\x1b[0m");
      } else {
        cleanup();
        Deno.exit(0);
      }
    });
  } catch (_err: unknown) {
    log.debug("Signal listener not supported", { signal: "SIGINT" });
  }
}

/** Install a SIGWINCH handler for terminal resize. */
function installSigwinchHandler(
  screen: ScreenManager,
  getEditor: () => LineEditor,
  log: Logger,
): void {
  const resizeHandler = () => {
    screen.handleResize();
    screen.redrawInput(getEditor());
  };
  try {
    Deno.addSignalListener("SIGWINCH", resizeHandler);
  } catch (_err: unknown) {
    log.debug("Signal listener not supported", { signal: "SIGWINCH" });
    screen.startResizePolling(resizeHandler);
  }
}

/**
 * Route an input keypress to the appropriate handler.
 *
 * Returns "exit" to leave the loop, or void to continue.
 */
export async function routeInputKeypress(
  key: string,
  char: string | null,
  rs: ChatReplState,
  state: WsRouterState,
  ws: WebSocket,
  screen: ScreenManager,
  config: TriggerFishConfig,
  messageQueue: string[],
  historyFilePath: string,
  log: Logger,
  suggestionEngine: ReturnType<typeof createSuggestionEngine>,
  cleanup: () => void,
): Promise<"exit" | void> {
  switch (key) {
    case "shift+enter":
      handleShiftEnter(rs, screen);
      break;

    case "enter": {
      const result = handleEnterKeypress(
        rs,
        state,
        ws,
        screen,
        config,
        messageQueue,
        historyFilePath,
        log,
      );
      if (result.shouldExit) {
        cleanup();
        return "exit";
      }
      break;
    }

    case "backspace":
      rs.editor = rs.editor.backspace();
      refreshAutocompleteSuggestion(rs, suggestionEngine);
      screen.redrawInput(rs.editor);
      break;

    case "delete":
      rs.editor = rs.editor.deleteChar();
      refreshAutocompleteSuggestion(rs, suggestionEngine);
      screen.redrawInput(rs.editor);
      break;

    case "left":
    case "right":
    case "home":
    case "end":
    case "ctrl+a":
    case "ctrl+e":
      handleCursorMovement(key, rs, screen);
      break;

    case "up":
      navigateHistoryUp(rs, screen);
      break;

    case "down":
      navigateHistoryDown(rs, screen);
      break;

    case "tab":
      rs.editor = rs.editor.acceptSuggestion();
      screen.redrawInput(rs.editor);
      break;

    case "ctrl+v":
      rs.pendingImages = await handleClipboardPaste(
        rs.pendingImages,
        screen,
        log,
      );
      break;

    case "ctrl+o":
      toggleDisplayMode(rs, screen);
      break;

    case "ctrl+d":
      if (rs.editor.text.length === 0) {
        cleanup();
        return "exit";
      }
      break;

    case "ctrl+u":
      rs.editor = rs.editor.clear();
      screen.redrawInput(rs.editor);
      break;

    case "ctrl+w":
      rs.editor = deleteWordBackward(rs.editor);
      screen.redrawInput(rs.editor);
      break;

    case "esc":
      break;

    default:
      if (char !== null) {
        handlePrintableChar(rs, char, screen, suggestionEngine);
      }
      break;
  }
}

/** Handle shift+enter: insert a newline. */
function handleShiftEnter(
  rs: ChatReplState,
  screen: ScreenManager,
): void {
  rs.editor = rs.editor.insert("\n");
  rs.editor = rs.editor.setSuggestion("");
  screen.redrawInput(rs.editor);
}

/** Handle cursor movement keys. */
function handleCursorMovement(
  key: string,
  rs: ChatReplState,
  screen: ScreenManager,
): void {
  const directionMap: Record<string, string> = {
    "left": "left",
    "right": "right",
    "home": "home",
    "end": "end",
    "ctrl+a": "home",
    "ctrl+e": "end",
  };
  const direction = directionMap[key];
  if (direction) {
    rs.editor = rs.editor.moveCursor(
      direction as "left" | "right" | "home" | "end",
    );
    screen.redrawInput(rs.editor);
  }
}

/** Toggle the tool display mode between compact and expanded. */
function toggleDisplayMode(
  rs: ChatReplState,
  screen: ScreenManager,
): void {
  rs.displayMode = rs.displayMode === "compact" ? "expanded" : "compact";
  screen.setStatus("Display: " + rs.displayMode);
  setTimeout(() => screen.clearStatus(), 1500);
}

/** Handle a printable character insertion. */
function handlePrintableChar(
  rs: ChatReplState,
  char: string,
  screen: ScreenManager,
  suggestionEngine: ReturnType<typeof createSuggestionEngine>,
): void {
  rs.editor = rs.editor.insert(char);
  rs.inputHistory = rs.inputHistory.resetNavigation();
  rs.stashedInput = "";
  refreshAutocompleteSuggestion(rs, suggestionEngine);
  screen.redrawInput(rs.editor);
}
