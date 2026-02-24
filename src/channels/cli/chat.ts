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
 * - chat_password.ts: Password/secret prompt handling
 * - chat_commands.ts: Slash command dispatch and text editing
 * - chat_input.ts: Message submission and enter key dispatch
 * - chat_keypress.ts: Keypress routing and interrupt handling
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
  printBanner,
} from "../../cli/chat/chat_ui.ts";
import {
  createKeypressReader,
  createLineEditor,
  createSuggestionEngine,
} from "../../cli/terminal/terminal.ts";
import type { LineEditor } from "../../cli/terminal/terminal.ts";
import { loadInputHistory, saveInputHistory } from "../../cli/chat/history.ts";
import { createScreenManager } from "../../cli/terminal/screen.ts";
import type { ScreenManager } from "../../cli/terminal/screen.ts";
import type { OrchestratorEvent } from "../../agent/orchestrator/orchestrator_types.ts";
import { createWsMessageRouter } from "./chat_ws_router.ts";
import type { WsRouterState } from "./chat_ws_router.ts";
import { runSimpleWsRepl } from "./chat_simple_repl.ts";
import { routePasswordKeypress, routeCredentialKeypress } from "./chat_password.ts";
import { handleCtrlCKeypress, handleEscInterrupt } from "./chat_keypress.ts";
import { installChatSignalHandlers, routeInputKeypress } from "./chat_keypress.ts";
import type { ChatReplState } from "./chat_input.ts";

// Re-export for external importers
export { runSimpleWsRepl } from "./chat_simple_repl.ts";

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
    credentialMode: null,
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
  if (state.credentialMode !== null) {
    routeCredentialKeypress(
      keypress,
      state.credentialMode,
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
