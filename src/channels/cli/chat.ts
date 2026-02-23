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
import type { TriggerFishConfig } from "../../core/config.ts";
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
  config: TriggerFishConfig,
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

// ─── Chat REPL state ─────────────────────────────────────────────

/** Mutable state for the interactive chat REPL keypress loop. */
interface ChatReplState {
  editor: LineEditor;
  displayMode: ToolDisplayMode;
  stashedInput: string;
  pendingImages: ImageContentBlock[];
  lastCtrlCTime: number;
  inputHistory: import("../../cli/chat/history.ts").InputHistory;
}

// ─── Chat REPL helpers ──────────────────────────────────────────

/** Load config and prepare the data directory. Returns config and dataDir. */
async function loadChatConfig(): Promise<{
  readonly config: TriggerFishConfig;
  readonly dataDir: string;
}> {
  const configPath = resolveConfigPath();
  const configResult = loadConfig(configPath);
  if (!configResult.ok) {
    console.log(`Configuration error: ${configResult.error}`);
    console.log("Run 'triggerfish dive' to fix your configuration.\n");
    Deno.exit(1);
  }
  const baseDir = resolveBaseDir();
  const dataDir = join(baseDir, "data");
  await Deno.mkdir(dataDir, { recursive: true });
  return { config: configResult.value, dataDir };
}

/** Open a WebSocket to the gateway chat endpoint. */
function openChatWebSocket(log: Logger): WebSocket {
  const gatewayUrl = "ws://127.0.0.1:18789/chat";
  try {
    return new WebSocket(gatewayUrl);
  } catch {
    log.debug("WebSocket construction failed for gateway chat");
    console.log("Cannot connect to daemon. Is it running?");
    console.log("Run 'triggerfish start' or 'triggerfish run' first.\n");
    Deno.exit(1);
    // Unreachable, but satisfies return type
    throw new Error("WebSocket connection failed");
  }
}

/** Install WS event listeners and wait for the "connected" event. */
async function awaitDaemonConnection(
  ws: WebSocket,
  screen: ScreenManager,
  isTty: boolean,
  state: WsRouterState,
  messageQueue: string[],
  getEditor: () => LineEditor,
  eventHandler: (evt: OrchestratorEvent) => void,
): Promise<void> {
  const connected = Promise.withResolvers<void>();

  ws.addEventListener("error", () => {
    console.log("Cannot connect to daemon. Is it running?");
    console.log("Run 'triggerfish start' or 'triggerfish run' first.\n");
    Deno.exit(1);
  });
  ws.addEventListener("open", () => {});

  const wsRouter = createWsMessageRouter({
    screen,
    isTty,
    getEditor,
    eventHandler,
    state,
    messageQueue,
    ws,
    resolveConnected: () => connected.resolve(),
  });
  ws.addEventListener("message", wsRouter);

  installWsCloseHandler(ws, isTty, screen, getEditor, state);

  const timeout = setTimeout(() => {
    console.log("Timed out waiting for daemon. Is it running?");
    console.log("Run 'triggerfish start' or 'triggerfish run' first.\n");
    ws.close();
    Deno.exit(1);
  }, 5000);
  await connected.promise;
  clearTimeout(timeout);
}

/** Handle WebSocket close by showing a disconnect message. */
function installWsCloseHandler(
  ws: WebSocket,
  isTty: boolean,
  screen: ScreenManager,
  getEditor: () => LineEditor,
  state: WsRouterState,
): void {
  ws.addEventListener("close", () => {
    if (isTty) {
      screen.writeOutput("  \x1b[31mDisconnected from daemon.\x1b[0m");
      screen.writeOutput("");
      screen.redrawInput(getEditor());
    } else {
      console.log("\n  Disconnected from daemon.\n");
    }
    state.isProcessing = false;
  });
}

/** Send a cancel message to the daemon WebSocket. */
function sendCancelMessage(ws: WebSocket, log: Logger): void {
  try {
    ws.send(JSON.stringify({ type: "cancel" }));
  } catch (_err: unknown) {
    log.debug("WebSocket send failed: connection closed");
  }
}

/** Handle the ESC key during active processing (interrupt). */
function handleEscInterrupt(
  ws: WebSocket,
  screen: ScreenManager,
  log: Logger,
): void {
  sendCancelMessage(ws, log);
  screen.writeOutput(`  \x1b[33m\u26a0 Interrupted\x1b[0m`);
}

/** Handle Ctrl+C: cancel or exit depending on processing state. */
function handleCtrlCKeypress(
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
    `  \x1b[33m\u26a0 Interrupted (Ctrl+C again to exit)\x1b[0m`,
  );
  return "continue";
}

/** Echo the submitted text into the output region with taint coloring. */
function echoSubmittedText(
  text: string,
  screen: ScreenManager,
): void {
  const displayText = text.includes("\n")
    ? text.split("\n").join(`\n  ${"\x1b[2m"}\xb7\x1b[0m `)
    : text;
  screen.writeOutput(
    `  ${taintColor(screen.getTaint())}\x1b[1m\u276f\x1b[0m ${displayText}`,
  );
  screen.writeOutput("");
}

/** Record text in input history and persist to disk. */
function recordInputHistory(
  rs: ChatReplState,
  text: string,
  historyFilePath: string,
  log: Logger,
): void {
  rs.inputHistory = rs.inputHistory.push(text);
  rs.inputHistory = rs.inputHistory.resetNavigation();
  saveInputHistory(historyFilePath, rs.inputHistory).catch(
    (err: unknown) => {
      log.debug("Input history save failed", {
        error: err instanceof Error ? err.message : String(err),
      });
    },
  );
}

/** Result of handling the enter keypress. */
interface EnterKeypressResult {
  readonly shouldExit: boolean;
}

/** Handle the enter keypress: echo, history, slash commands, or send message. */
function handleEnterKeypress(
  rs: ChatReplState,
  state: WsRouterState,
  ws: WebSocket,
  screen: ScreenManager,
  config: TriggerFishConfig,
  messageQueue: string[],
  historyFilePath: string,
  log: Logger,
): EnterKeypressResult {
  const text = rs.editor.text.trim();
  if (text.length === 0) return { shouldExit: false };

  echoSubmittedText(text, screen);
  recordInputHistory(rs, text, historyFilePath, log);

  rs.editor = rs.editor.clear();
  screen.redrawInput(rs.editor);
  rs.stashedInput = "";

  if (!state.isProcessing) {
    return dispatchEnterIdleMode(
      rs,
      text,
      state,
      ws,
      screen,
      config,
      log,
    );
  }
  messageQueue.push(text);
  screen.writeOutput(
    `  \x1b[2m(queued \u2014 will send after current response)\x1b[0m`,
  );
  return { shouldExit: false };
}

/** Dispatch slash commands or send a chat message in idle mode. */
function dispatchEnterIdleMode(
  rs: ChatReplState,
  text: string,
  state: WsRouterState,
  ws: WebSocket,
  screen: ScreenManager,
  config: TriggerFishConfig,
  log: Logger,
): EnterKeypressResult {
  const cmd = dispatchSlashCommand(
    text,
    ws,
    screen,
    rs.editor,
    config,
    state.providerName,
    rs.displayMode,
  );
  if (cmd.shouldExit) {
    screen.writeOutput("  Goodbye.");
    return { shouldExit: true };
  }
  if (cmd.newDisplayMode !== undefined) {
    rs.displayMode = cmd.newDisplayMode;
  }
  if (!cmd.handled) {
    rs.pendingImages = submitChatMessage(
      text,
      rs.pendingImages,
      state,
      ws,
      screen,
      rs.editor,
      log,
    );
  }
  return { shouldExit: false };
}

/** Navigate input history upward (older entries). */
function navigateHistoryUp(
  rs: ChatReplState,
  screen: ScreenManager,
): void {
  if (rs.inputHistory.index === -1 && rs.editor.text.length > 0) {
    rs.stashedInput = rs.editor.text;
  }
  rs.inputHistory = rs.inputHistory.up();
  const histText = rs.inputHistory.current();
  if (histText !== null) {
    rs.editor = rs.editor.setText(histText);
    rs.editor = rs.editor.setSuggestion("");
    screen.redrawInput(rs.editor);
  }
}

/** Navigate input history downward (newer entries or back to stashed). */
function navigateHistoryDown(
  rs: ChatReplState,
  screen: ScreenManager,
): void {
  rs.inputHistory = rs.inputHistory.down();
  const histText = rs.inputHistory.current();
  if (histText !== null) {
    rs.editor = rs.editor.setText(histText);
  } else {
    rs.editor = rs.editor.setText(rs.stashedInput);
    rs.stashedInput = "";
  }
  rs.editor = rs.editor.setSuggestion("");
  screen.redrawInput(rs.editor);
}

/** Refresh the autocomplete suggestion based on current editor text. */
function refreshAutocompleteSuggestion(
  rs: ChatReplState,
  suggestionEngine: ReturnType<typeof createSuggestionEngine>,
): void {
  const suggestion = suggestionEngine.suggest(
    rs.editor.text,
    rs.inputHistory.entries as string[],
  );
  if (suggestion) {
    const remainder = suggestion.slice(rs.editor.text.length);
    rs.editor = rs.editor.setSuggestion(remainder);
  } else {
    rs.editor = rs.editor.setSuggestion("");
  }
}

/** Install SIGINT and SIGWINCH signal handlers for TTY mode. */
function installChatSignalHandlers(
  state: WsRouterState,
  ws: WebSocket,
  screen: ScreenManager,
  getEditor: () => LineEditor,
  cleanup: () => void,
  log: Logger,
): void {
  try {
    Deno.addSignalListener("SIGINT", () => {
      if (state.isProcessing) {
        sendCancelMessage(ws, log);
        screen.writeOutput(`  \x1b[33m\u26a0 Interrupted\x1b[0m`);
      } else {
        cleanup();
        Deno.exit(0);
      }
    });
  } catch (_err: unknown) {
    log.debug("Signal listener not supported", { signal: "SIGINT" });
  }

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

/** Route an input keypress to the appropriate handler. Returns "exit" to leave the loop. */
async function routeInputKeypress(
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
      rs.editor = rs.editor.insert("\n");
      rs.editor = rs.editor.setSuggestion("");
      screen.redrawInput(rs.editor);
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
      rs.editor = rs.editor.moveCursor("left");
      screen.redrawInput(rs.editor);
      break;

    case "right":
      rs.editor = rs.editor.moveCursor("right");
      screen.redrawInput(rs.editor);
      break;

    case "home":
    case "ctrl+a":
      rs.editor = rs.editor.moveCursor("home");
      screen.redrawInput(rs.editor);
      break;

    case "end":
    case "ctrl+e":
      rs.editor = rs.editor.moveCursor("end");
      screen.redrawInput(rs.editor);
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
      );
      break;

    case "ctrl+o":
      rs.displayMode = rs.displayMode === "compact" ? "expanded" : "compact";
      screen.setStatus(`Display: ${rs.displayMode}`);
      setTimeout(() => screen.clearStatus(), 1500);
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
        rs.editor = rs.editor.insert(char);
        rs.inputHistory = rs.inputHistory.resetNavigation();
        rs.stashedInput = "";
        refreshAutocompleteSuggestion(rs, suggestionEngine);
        screen.redrawInput(rs.editor);
      }
      break;
  }
}

// ─── Main chat REPL ─────────────────────────────────────────────

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
  const { config, dataDir } = await loadChatConfig();
  const ws = openChatWebSocket(log);

  const isTty = Deno.stdin.isTerminal();
  const screen = createScreenManager();
  const state: WsRouterState = {
    isProcessing: false,
    passwordMode: null,
    providerName: "unknown",
  };
  const messageQueue: string[] = [];

  const rs: ChatReplState = {
    editor: createLineEditor(),
    displayMode: "compact",
    stashedInput: "",
    pendingImages: [],
    lastCtrlCTime: 0,
    inputHistory: await loadInputHistory(join(dataDir, "input_history.json")),
  };

  const eventHandler = isTty
    ? createScreenEventHandler(screen, () => rs.displayMode)
    : createEventHandler();

  await awaitDaemonConnection(
    ws,
    screen,
    isTty,
    state,
    messageQueue,
    () => rs.editor,
    eventHandler as (evt: OrchestratorEvent) => void,
  );

  if (!isTty) {
    printBanner(state.providerName, config.models.primary.model, "");
    await runSimpleWsRepl(ws, state.providerName, config);
    return;
  }

  await runTtyKeypressLoop(
    rs,
    state,
    ws,
    screen,
    config,
    messageQueue,
    dataDir,
    log,
  );
}

/** Run the TTY keypress loop until the user exits or EOF. */
async function runTtyKeypressLoop(
  rs: ChatReplState,
  state: WsRouterState,
  ws: WebSocket,
  screen: ScreenManager,
  config: TriggerFishConfig,
  messageQueue: string[],
  dataDir: string,
  log: Logger,
): Promise<void> {
  const historyFilePath = join(dataDir, "input_history.json");
  const suggestionEngine = createSuggestionEngine();
  const keypressReader = createKeypressReader();

  screen.init();
  screen.writeOutput(
    formatBanner(state.providerName, config.models.primary.model, ""),
  );

  const cleanup = () =>
    cleanupChatRepl(
      keypressReader,
      screen,
      historyFilePath,
      rs.inputHistory,
      ws,
      log,
    );

  installChatSignalHandlers(
    state,
    ws,
    screen,
    () => rs.editor,
    cleanup,
    log,
  );

  screen.redrawInput(rs.editor);
  keypressReader.start();

  for await (const keypress of keypressReader) {
    const action = routeTopLevelKeypress(
      keypress,
      rs,
      state,
      ws,
      screen,
      log,
      cleanup,
    );
    if (action === "exit") return;
    if (action === "continue") continue;

    const result = await routeInputKeypress(
      keypress.key,
      keypress.char,
      rs,
      state,
      ws,
      screen,
      config,
      messageQueue,
      historyFilePath,
      log,
      suggestionEngine,
      cleanup,
    );
    if (result === "exit") return;
  }

  cleanup();
}

/** Route top-level keypresses (interrupts, password mode) before input dispatch. */
function routeTopLevelKeypress(
  keypress: { readonly key: string; readonly char: string | null },
  rs: ChatReplState,
  state: WsRouterState,
  ws: WebSocket,
  screen: ScreenManager,
  log: Logger,
  cleanup: () => void,
): "exit" | "continue" | "dispatch" {
  if (keypress.key === "esc" && state.isProcessing) {
    handleEscInterrupt(ws, screen, log);
    return "continue";
  }
  if (keypress.key === "ctrl+c") {
    return handleCtrlCKeypress(rs, state, ws, screen, log, cleanup);
  }
  if (state.passwordMode !== null) {
    routePasswordKeypress(
      keypress,
      state.passwordMode,
      state,
      ws,
      screen,
      rs.editor,
      log,
    );
    return "continue";
  }
  return "dispatch";
}

/** Clean up resources on REPL exit: stop reader, persist history, close WS. */
function cleanupChatRepl(
  keypressReader: ReturnType<typeof createKeypressReader>,
  screen: ScreenManager,
  historyFilePath: string,
  inputHistory: import("../../cli/chat/history.ts").InputHistory,
  ws: WebSocket,
  log: Logger,
): void {
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
