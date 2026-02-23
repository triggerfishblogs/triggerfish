/**
 * Message submission and enter key dispatch for the CLI chat REPL.
 *
 * Handles building multimodal message content, clipboard image paste,
 * echo/history recording, and slash command dispatch on enter.
 *
 * @module
 */

import type { Logger } from "../../core/logger/logger.ts";
import type { TriggerFishConfig } from "../../core/config.ts";
import type { ToolDisplayMode } from "../../cli/chat/chat_ui.ts";
import { formatError } from "../../cli/chat/chat_ui.ts";
import type { LineEditor } from "../../cli/terminal/terminal.ts";
import type { ScreenManager } from "../../cli/terminal/screen.ts";
import { taintColor } from "../../cli/terminal/screen.ts";
import { imageBlock } from "../../core/image/content.ts";
import type {
  ContentBlock,
  ImageContentBlock,
  MessageContent,
} from "../../core/image/content.ts";
import { readClipboardImage } from "../../tools/image/clipboard.ts";
import { saveInputHistory } from "../../cli/chat/history.ts";
import type { WsRouterState } from "./chat_ws_router.ts";
import { dispatchSlashCommand } from "./chat_commands.ts";

/** Mutable state for the interactive chat REPL keypress loop. */
export interface ChatReplState {
  editor: LineEditor;
  displayMode: ToolDisplayMode;
  stashedInput: string;
  pendingImages: ImageContentBlock[];
  lastCtrlCTime: number;
  inputHistory: import("../../cli/chat/history.ts").InputHistory;
}

/**
 * Build multimodal message content and send it to the daemon.
 *
 * If `pendingImages` is non-empty, wraps both images and text into a
 * ContentBlock array. Sets `state.isProcessing` and handles send failures.
 * Returns the new (emptied) pending images array.
 */
export function submitChatMessage(
  text: string,
  pendingImages: ImageContentBlock[],
  state: WsRouterState,
  ws: WebSocket,
  screen: ScreenManager,
  editor: LineEditor,
  log: Logger,
): ImageContentBlock[] {
  const messageContent = buildMessageContent(text, pendingImages);
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
  return [];
}

/** Build message content from text and optional pending images. */
function buildMessageContent(
  text: string,
  pendingImages: ImageContentBlock[],
): MessageContent {
  if (pendingImages.length > 0) {
    const blocks: ContentBlock[] = [
      ...pendingImages,
      { type: "text" as const, text },
    ];
    return blocks;
  }
  return text;
}

/**
 * Handle Ctrl+V clipboard image paste.
 *
 * Reads an image from the OS clipboard and appends it to the pending
 * images list. Shows a status message indicating success or failure.
 */
export async function handleClipboardPaste(
  pendingImages: ImageContentBlock[],
  screen: ScreenManager,
): Promise<ImageContentBlock[]> {
  const clipResult = await readClipboardImage();
  if (clipResult.ok) {
    const img = imageBlock(
      clipResult.value.data,
      clipResult.value.mimeType,
    );
    const sizeKb = (clipResult.value.data.length / 1024).toFixed(1);
    screen.setStatus(
      "Image pasted (" + clipResult.value.mimeType + ", " + sizeKb + "KB) \u2014 will send with next message",
    );
    setTimeout(() => screen.clearStatus(), 3000);
    return [...pendingImages, img];
  }
  screen.setStatus(clipResult.error);
  setTimeout(() => screen.clearStatus(), 3000);
  return pendingImages;
}

/** Echo the submitted text into the output region with taint coloring. */
export function echoSubmittedText(
  text: string,
  screen: ScreenManager,
): void {
  const displayText = text.includes("\n")
    ? text.split("\n").join("\n  \x1b[2m\xb7\x1b[0m ")
    : text;
  screen.writeOutput(
    "  " + taintColor(screen.getTaint()) + "\x1b[1m\u276f\x1b[0m " + displayText,
  );
  screen.writeOutput("");
}

/** Record text in input history and persist to disk. */
export function recordInputHistory(
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
export interface EnterKeypressResult {
  readonly shouldExit: boolean;
}

/** Handle the enter keypress: echo, history, slash commands, or send message. */
export function handleEnterKeypress(
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
    "  \x1b[2m(queued \u2014 will send after current response)\x1b[0m",
  );
  return { shouldExit: false };
}

/** Dispatch slash commands or send a chat message in idle mode. */
export function dispatchEnterIdleMode(
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
