/**
 * Interactive chat REPL for the CLI channel.
 *
 * Connects to the gateway WebSocket and provides a full terminal UI
 * (TTY mode with scroll regions, raw keypress handling, history, suggestions)
 * and a simple line-buffered fallback for piped/non-TTY input.
 *
 * Sub-modules:
 * - chat_ws_router.ts: WebSocket message routing
 * - chat_simple_repl.ts: Non-TTY fallback REPL
 *
 * @module
 */

import { join } from "@std/path";
import { createLogger } from "../../core/logger/logger.ts";
import type { Logger } from "../../core/logger/logger.ts";
import { loadConfig } from "../../core/config.ts";
import { resolveBaseDir, resolveConfigPath } from "../../cli/config/paths.ts";
import {
  createEventHandler,
  createScreenEventHandler,
  formatBanner,
  formatError,
  printBanner,
} from "../../cli/chat/chat_ui.ts";
import type { ToolDisplayMode } from "../../cli/chat/chat_ui.ts";
import {
  createKeypressReader,
  createLineEditor,
  createSuggestionEngine,
} from "../../cli/terminal/terminal.ts";
import type { LineEditor } from "../../cli/terminal/terminal.ts";
import { loadInputHistory, saveInputHistory } from "../../cli/chat/history.ts";
import { createScreenManager, taintColor } from "../../cli/terminal/screen.ts";
import type { ScreenManager } from "../../cli/terminal/screen.ts";
import type { OrchestratorEvent } from "../../agent/orchestrator.ts";
import { imageBlock } from "../../core/image/content.ts";
import type {
  ContentBlock,
  ImageContentBlock,
  MessageContent,
} from "../../core/image/content.ts";
import { readClipboardImage } from "../../tools/image/clipboard.ts";
import { createWsMessageRouter } from "./chat_ws_router.ts";
import type { PasswordModeState, WsRouterState } from "./chat_ws_router.ts";
import { runSimpleWsRepl } from "./chat_simple_repl.ts";

// Re-export for external importers
export { runSimpleWsRepl } from "./chat_simple_repl.ts";

/** Result of dispatching a slash command. */
interface SlashCommandResult {
  /** Whether the input was recognized as a slash command. */
  readonly handled: boolean;
  /** Whether the caller should exit the REPL. */
  readonly shouldExit: boolean;
  /** New display mode, if the command toggled it. */
  readonly newDisplayMode?: ToolDisplayMode;
}

/**
 * Route a keypress while password mode (secret_prompt) is active.
 *
 * Handles enter (submit), esc/ctrl+c (cancel), backspace, and
 * printable character input. Mutates `pm.chars` and `state.passwordMode`
 * as side effects.
 */
function routePasswordKeypress(
  keypress: { readonly key: string; readonly char: string | null },
  pm: PasswordModeState,
  state: WsRouterState,
  ws: WebSocket,
  screen: ScreenManager,
  editor: LineEditor,
  log: Logger,
): void {
  if (keypress.key === "enter") {
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
    screen.writeOutput(`  \x1b[32m\u2713 Secret submitted\x1b[0m`);
    screen.clearStatus();
    state.passwordMode = null;
    screen.redrawInput(editor);
    return;
  }
  if (keypress.key === "esc" || keypress.key === "ctrl+c") {
    try {
      ws.send(JSON.stringify({
        type: "secret_prompt_response",
        nonce: pm.nonce,
        value: null,
      }));
    } catch (_err: unknown) {
      log.debug("WebSocket send failed: connection closed");
    }
    screen.writeOutput(`  \x1b[33m\u2717 Secret entry cancelled\x1b[0m`);
    screen.clearStatus();
    state.passwordMode = null;
    screen.redrawInput(editor);
    return;
  }
  if (keypress.key === "backspace") {
    if (pm.chars.length > 0) {
      pm.chars.pop();
      const masked = "\u25cf".repeat(pm.chars.length);
      screen.setStatus(`\u{1f512} ${pm.name}: ${masked}`);
    }
    return;
  }
  if (keypress.char !== null) {
    pm.chars.push(keypress.char);
    const masked = "\u25cf".repeat(pm.chars.length);
    screen.setStatus(`\u{1f512} ${pm.name}: ${masked}`);
  }
}

/**
 * Dispatch a slash command entered by the user.
 *
 * Recognizes /quit, /exit, /q, /clear, /help, /verbose, and /compact.
 * Returns whether the command was handled and whether the REPL should exit.
 */
function dispatchSlashCommand(
  text: string,
  ws: WebSocket,
  screen: ScreenManager,
  editor: LineEditor,
  config: { readonly models: { readonly primary: { readonly model: string } } },
  providerName: string,
  displayMode: ToolDisplayMode,
): SlashCommandResult {
  if (text === "/quit" || text === "/exit" || text === "/q") {
    return { handled: true, shouldExit: true };
  }

  if (text === "/clear") {
    ws.send(JSON.stringify({ type: "clear" }));
    screen.setTaint("PUBLIC");
    screen.cleanup();
    screen.init();
    screen.writeOutput(
      formatBanner(providerName, config.models.primary.model, ""),
    );
    screen.redrawInput(editor);
    return { handled: true, shouldExit: false };
  }

  if (text === "/help") {
    screen.writeOutput(
      "  Commands:\n" +
        "    /quit, /exit, /q     \u2014 Exit chat\n" +
        "    /clear               \u2014 Clear screen\n" +
        "    /compact             \u2014 Summarize conversation history\n" +
        "    /verbose             \u2014 Toggle tool display detail\n" +
        "    /help                \u2014 Show this help\n" +
        "    Ctrl+V               \u2014 Paste image from clipboard\n" +
        "    Ctrl+O               \u2014 Toggle tool display mode\n" +
        "    ESC                  \u2014 Interrupt current operation\n" +
        "    Shift+Enter          \u2014 New line in message\n" +
        "    Up/Down              \u2014 Navigate input history\n" +
        "    Tab                  \u2014 Accept suggestion",
    );
    return { handled: true, shouldExit: false };
  }

  if (text === "/verbose") {
    const newMode: ToolDisplayMode = displayMode === "compact"
      ? "expanded"
      : "compact";
    screen.writeOutput(`  Tool display: ${newMode}`);
    return { handled: true, shouldExit: false, newDisplayMode: newMode };
  }

  if (text === "/compact") {
    screen.writeOutput("  Compacting conversation history...");
    ws.send(JSON.stringify({ type: "compact" }));
    return { handled: true, shouldExit: false };
  }

  return { handled: false, shouldExit: false };
}

/**
 * Build multimodal message content and send it to the daemon.
 *
 * If `pendingImages` is non-empty, wraps both images and text into a
 * ContentBlock array. Sets `state.isProcessing` and handles send failures.
 * Returns the new (emptied) pending images array.
 */
function submitChatMessage(
  text: string,
  pendingImages: ImageContentBlock[],
  state: WsRouterState,
  ws: WebSocket,
  screen: ScreenManager,
  editor: LineEditor,
  log: Logger,
): ImageContentBlock[] {
  let messageContent: MessageContent = text;
  if (pendingImages.length > 0) {
    const blocks: ContentBlock[] = [
      ...pendingImages,
      { type: "text" as const, text },
    ];
    messageContent = blocks;
    pendingImages = [];
  }

  state.isProcessing = true;
  try {
    ws.send(
      JSON.stringify({ type: "message", content: messageContent }),
    );
  } catch (err: unknown) {
    log.debug("WebSocket send failed: connection closed", { error: err });
    screen.writeOutput(formatError("Lost connection to daemon"));
    state.isProcessing = false;
    screen.writeOutput("");
    screen.redrawInput(editor);
  }
  return pendingImages.length > 0 ? pendingImages : [];
}

/**
 * Handle Ctrl+V clipboard image paste.
 *
 * Reads an image from the OS clipboard and appends it to the pending
 * images list. Shows a status message indicating success or failure.
 */
async function handleClipboardPaste(
  pendingImages: ImageContentBlock[],
  screen: ScreenManager,
): Promise<ImageContentBlock[]> {
  const clipResult = await readClipboardImage();
  if (clipResult.ok) {
    const img = imageBlock(
      clipResult.value.data,
      clipResult.value.mimeType,
    );
    pendingImages = [...pendingImages, img];
    const sizeKb = (clipResult.value.data.length / 1024).toFixed(1);
    screen.setStatus(
      `Image pasted (${clipResult.value.mimeType}, ${sizeKb}KB) \u2014 will send with next message`,
    );
    setTimeout(() => screen.clearStatus(), 3000);
  } else {
    screen.setStatus(clipResult.error);
    setTimeout(() => screen.clearStatus(), 3000);
  }
  return pendingImages;
}

/**
 * Delete one word backward from the cursor position.
 *
 * Skips trailing spaces, then deletes back to the previous space boundary.
 * Returns the updated line editor.
 */
function deleteWordBackward(editor: LineEditor): LineEditor {
  const text = editor.text;
  let cursor = editor.cursor;
  while (cursor > 0 && text[cursor - 1] === " ") cursor--;
  while (cursor > 0 && text[cursor - 1] !== " ") cursor--;
  return editor.setText(
    text.slice(0, cursor) + text.slice(editor.cursor),
  );
}

/**
 * Run an interactive chat REPL.
 *
 * Connects to the daemon's gateway WebSocket at /chat for the shared
 * session. All terminal UI (raw mode, scroll regions, keypress reader,
 * input history, suggestions, ESC interrupt, Ctrl+O toggle) is preserved.
 * The daemon owns the session, orchestrator, and policy engine.
 */
export async function runChat(): Promise<void> {
  const log = createLogger("cli");
  const configPath = resolveConfigPath();

  // Load config (for banner display only)
  const configResult = loadConfig(configPath);
  if (!configResult.ok) {
    console.log(`Configuration error: ${configResult.error}`);
    console.log("Run 'triggerfish dive' to fix your configuration.\n");
    Deno.exit(1);
  }

  const config = configResult.value;
  const baseDir = resolveBaseDir();
  const dataDir = join(baseDir, "data");
  await Deno.mkdir(dataDir, { recursive: true });

  // Connect to the daemon's chat WebSocket
  const gatewayUrl = "ws://127.0.0.1:18789/chat";
  let ws: WebSocket;
  try {
    ws = new WebSocket(gatewayUrl);
  } catch {
    console.log("Cannot connect to daemon. Is it running?");
    console.log("Run 'triggerfish start' or 'triggerfish run' first.\n");
    Deno.exit(1);
    return;
  }

  // Wait for connection + connected event
  const connected = Promise.withResolvers<void>();

  ws.addEventListener("error", () => {
    console.log("Cannot connect to daemon. Is it running?");
    console.log("Run 'triggerfish start' or 'triggerfish run' first.\n");
    Deno.exit(1);
  });

  ws.addEventListener("open", () => {
    // Connection established, wait for "connected" event
  });

  // Determine if we're in TTY mode
  const isTty = Deno.stdin.isTerminal();

  // Set up display mode toggle (Ctrl+O)
  let displayMode: ToolDisplayMode = "compact";

  // Set up screen manager
  const screen = createScreenManager();

  // Create event handler — use screen-aware handler for TTY, legacy for pipes
  const eventHandler = isTty
    ? createScreenEventHandler(screen, () => displayMode)
    : createEventHandler();

  // Shared mutable state
  const state: WsRouterState = {
    isProcessing: false,
    passwordMode: null,
    providerName: "unknown",
  };
  const messageQueue: string[] = [];

  // Create line editor (needed by WS router for redraw)
  let editor: LineEditor = createLineEditor();

  // Install WebSocket message router
  const wsRouter = createWsMessageRouter({
    screen,
    isTty,
    getEditor: () => editor,
    eventHandler: eventHandler as (evt: OrchestratorEvent) => void,
    state,
    messageQueue,
    ws,
    resolveConnected: () => connected.resolve(),
  });
  ws.addEventListener("message", wsRouter);

  // Handle WebSocket close
  ws.addEventListener("close", () => {
    if (isTty) {
      screen.writeOutput("  \x1b[31mDisconnected from daemon.\x1b[0m");
      screen.writeOutput("");
      screen.redrawInput(editor);
    } else {
      console.log("\n  Disconnected from daemon.\n");
    }
    state.isProcessing = false;
  });

  // Wait for the connected event before showing UI
  // Timeout after 5 seconds
  const timeout = setTimeout(() => {
    console.log("Timed out waiting for daemon. Is it running?");
    console.log("Run 'triggerfish start' or 'triggerfish run' first.\n");
    ws.close();
    Deno.exit(1);
  }, 5000);
  await connected.promise;
  clearTimeout(timeout);

  // Load input history
  const historyFilePath = join(dataDir, "input_history.json");
  let inputHistory = await loadInputHistory(historyFilePath);

  // Set up suggestion engine
  const suggestionEngine = createSuggestionEngine();

  // If not a TTY, fall back to the simple line-buffered REPL
  if (!isTty) {
    printBanner(state.providerName, config.models.primary.model, "");
    await runSimpleWsRepl(ws, state.providerName, config);
    return;
  }

  // ─── TTY mode: raw terminal with scroll regions ──────────────

  // Print banner via screen manager
  screen.init();
  screen.writeOutput(
    formatBanner(state.providerName, config.models.primary.model, ""),
  );

  // Create keypress reader
  const keypressReader = createKeypressReader();
  let stashedInput = ""; // Stash current input when entering history navigation
  let pendingImages: ImageContentBlock[] = []; // Images pasted with Ctrl+V, sent with next message

  // Cleanup function — must run on exit
  function cleanup(): void {
    keypressReader.stop();
    screen.cleanup();
    saveInputHistory(historyFilePath, inputHistory).catch((err: unknown) => {
      log.debug("Input history save failed during cleanup", {
        error: err instanceof Error ? err.message : String(err),
      });
    });
    try {
      ws.close();
    } catch (_err: unknown) {
      log.debug("WebSocket send failed: connection closed");
    }
  }

  // Handle SIGINT (Ctrl+C from outside raw mode, e.g. kill signal)
  try {
    Deno.addSignalListener("SIGINT", () => {
      if (state.isProcessing) {
        try {
          ws.send(JSON.stringify({ type: "cancel" }));
        } catch (_err: unknown) {
          log.debug("WebSocket send failed: connection closed");
        }
        screen.writeOutput(`  \x1b[33m⚠ Interrupted\x1b[0m`);
      } else {
        cleanup();
        Deno.exit(0);
      }
    });
  } catch (_err: unknown) {
    log.debug("Signal listener not supported", { signal: "SIGINT" });
  }

  // Handle terminal resize — SIGWINCH on Unix, polling fallback on Windows
  const resizeHandler = () => {
    screen.handleResize();
    screen.redrawInput(editor);
  };
  try {
    Deno.addSignalListener("SIGWINCH", resizeHandler);
  } catch (_err: unknown) {
    log.debug("Signal listener not supported", { signal: "SIGWINCH" });
    // SIGWINCH not supported (Windows/PowerShell) — poll for size changes
    screen.startResizePolling(resizeHandler);
  }

  // Draw initial input prompt
  screen.redrawInput(editor);

  // Start reading keypresses
  keypressReader.start();

  let lastCtrlCTime = 0;

  for await (const keypress of keypressReader) {
    // ─── Interrupt keys (work in any mode) ──────────────────
    if (keypress.key === "esc" && state.isProcessing) {
      try {
        ws.send(JSON.stringify({ type: "cancel" }));
      } catch (_err: unknown) {
        log.debug("WebSocket send failed: connection closed");
      }
      screen.writeOutput(`  \x1b[33m⚠ Interrupted\x1b[0m`);
      continue;
    }

    if (keypress.key === "ctrl+c") {
      if (state.isProcessing) {
        const now = Date.now();
        if (now - lastCtrlCTime < 1000) {
          cleanup();
          return;
        }
        lastCtrlCTime = now;
        try {
          ws.send(JSON.stringify({ type: "cancel" }));
        } catch (_err: unknown) {
          log.debug("WebSocket send failed: connection closed");
        }
        screen.writeOutput(
          `  \x1b[33m⚠ Interrupted (Ctrl+C again to exit)\x1b[0m`,
        );
      } else {
        cleanup();
        return;
      }
      continue;
    }

    // ─── Password mode (secret_prompt active) ─────────────
    if (state.passwordMode !== null) {
      routePasswordKeypress(
        keypress,
        state.passwordMode,
        state,
        ws,
        screen,
        editor,
        log,
      );
      continue;
    }

    // ─── Input handling (works in both idle and processing) ─
    switch (keypress.key) {
      case "shift+enter": {
        editor = editor.insert("\n");
        editor = editor.setSuggestion("");
        screen.redrawInput(editor);
        break;
      }

      case "enter": {
        const text = editor.text.trim();

        if (text.length === 0) {
          break;
        }

        // Echo the submitted text into the output region
        const displayText = text.includes("\n")
          ? text.split("\n").join(`\n  ${"\x1b[2m"}·\x1b[0m `)
          : text;
        screen.writeOutput(
          `  ${taintColor(screen.getTaint())}\x1b[1m❯\x1b[0m ${displayText}`,
        );
        screen.writeOutput("");

        // Add to history and save
        inputHistory = inputHistory.push(text);
        inputHistory = inputHistory.resetNavigation();
        saveInputHistory(historyFilePath, inputHistory).catch(
          (err: unknown) => {
            log.debug("Input history save failed", {
              error: err instanceof Error ? err.message : String(err),
            });
          },
        );

        // Clear editor
        editor = editor.clear();
        screen.redrawInput(editor);
        stashedInput = "";

        // Handle slash commands locally (only in idle mode)
        if (!state.isProcessing) {
          const cmd = dispatchSlashCommand(
            text,
            ws,
            screen,
            editor,
            config,
            state.providerName,
            displayMode,
          );
          if (cmd.shouldExit) {
            screen.writeOutput("  Goodbye.");
            cleanup();
            return;
          }
          if (cmd.newDisplayMode !== undefined) {
            displayMode = cmd.newDisplayMode;
          }
          if (cmd.handled) {
            break;
          }

          pendingImages = submitChatMessage(
            text,
            pendingImages,
            state,
            ws,
            screen,
            editor,
            log,
          );
        } else {
          // Processing mode — queue the message
          messageQueue.push(text);
          screen.writeOutput(
            `  \x1b[2m(queued — will send after current response)\x1b[0m`,
          );
        }

        break;
      }

      case "backspace":
        editor = editor.backspace();
        refreshAutocompleteSuggestion();
        screen.redrawInput(editor);
        break;

      case "delete":
        editor = editor.deleteChar();
        refreshAutocompleteSuggestion();
        screen.redrawInput(editor);
        break;

      case "left":
        editor = editor.moveCursor("left");
        screen.redrawInput(editor);
        break;

      case "right":
        editor = editor.moveCursor("right");
        screen.redrawInput(editor);
        break;

      case "home":
      case "ctrl+a":
        editor = editor.moveCursor("home");
        screen.redrawInput(editor);
        break;

      case "end":
      case "ctrl+e":
        editor = editor.moveCursor("end");
        screen.redrawInput(editor);
        break;

      case "up": {
        // Stash current input when first entering history
        if (inputHistory.index === -1 && editor.text.length > 0) {
          stashedInput = editor.text;
        }
        inputHistory = inputHistory.up();
        const histText = inputHistory.current();
        if (histText !== null) {
          editor = editor.setText(histText);
          editor = editor.setSuggestion("");
          screen.redrawInput(editor);
        }
        break;
      }

      case "down": {
        inputHistory = inputHistory.down();
        const histText = inputHistory.current();
        if (histText !== null) {
          editor = editor.setText(histText);
        } else {
          // Back to fresh input — restore stashed text
          editor = editor.setText(stashedInput);
          stashedInput = "";
        }
        editor = editor.setSuggestion("");
        screen.redrawInput(editor);
        break;
      }

      case "tab":
        editor = editor.acceptSuggestion();
        screen.redrawInput(editor);
        break;

      case "ctrl+v": {
        pendingImages = await handleClipboardPaste(pendingImages, screen);
        break;
      }

      case "ctrl+o":
        displayMode = displayMode === "compact" ? "expanded" : "compact";
        screen.setStatus(`Display: ${displayMode}`);
        setTimeout(() => screen.clearStatus(), 1500);
        break;

      case "ctrl+d":
        if (editor.text.length === 0) {
          cleanup();
          return;
        }
        break;

      case "ctrl+u":
        // Clear line
        editor = editor.clear();
        screen.redrawInput(editor);
        break;

      case "ctrl+w": {
        editor = deleteWordBackward(editor);
        screen.redrawInput(editor);
        break;
      }

      case "esc":
        // ESC in idle mode — ignore
        break;

      default:
        // Printable character
        if (keypress.char !== null) {
          editor = editor.insert(keypress.char);
          inputHistory = inputHistory.resetNavigation();
          stashedInput = "";
          refreshAutocompleteSuggestion();
          screen.redrawInput(editor);
        }
        break;
    }
  }

  // EOF reached
  cleanup();

  /** Refresh the autocomplete suggestion based on current editor text. */
  function refreshAutocompleteSuggestion(): void {
    const suggestion = suggestionEngine.suggest(
      editor.text,
      inputHistory.entries as string[],
    );
    if (suggestion) {
      const remainder = suggestion.slice(editor.text.length);
      editor = editor.setSuggestion(remainder);
    } else {
      editor = editor.setSuggestion("");
    }
  }
}
