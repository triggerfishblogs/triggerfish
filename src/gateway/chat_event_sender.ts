/**
 * Event sending and typing indicator helpers for chat sessions.
 *
 * Provides `buildSendEvent` — the factory that creates a `ChatEventSender`
 * for a channel adapter, handling typing indicators, response delivery,
 * and error forwarding.
 *
 * @module
 */

import { createLogger } from "../core/logger/mod.ts";
import type { ChannelAdapter, ChannelMessage } from "../channels/types.ts";
import type { ChatEventSender } from "./chat_types.ts";

const chatLog = createLogger("chat");

/** Start or restart typing indicator interval for a channel. */
function startTypingIndicator(
  adapter: ChannelAdapter,
  channelName: string,
  sessionId: string,
): number {
  const sendTyping = () => {
    adapter.sendTyping?.(sessionId).catch((err: unknown) => {
      chatLog.debug("Typing indicator send failed", {
        channel: channelName,
        error: err instanceof Error ? err.message : String(err),
      });
    });
  };
  sendTyping();
  return setInterval(sendTyping, 4000) as unknown as number;
}

/** Send a message through the adapter, logging errors. */
function sendAdapterMessage(
  adapter: ChannelAdapter,
  channelName: string,
  sessionId: string | undefined,
  content: string,
): void {
  adapter.send({ content, sessionId })
    .catch((err) => chatLog.warn(`${channelName} send error:`, err));
}

/**
 * Build a ChatEventSender for a channel adapter that handles typing
 * indicators, response sending, and error delivery.
 */
export function buildSendEvent(
  adapter: ChannelAdapter,
  channelName: string,
  msg: ChannelMessage,
): ChatEventSender {
  let typingInterval: number | undefined;

  return (event) => {
    if (event.type === "llm_start") {
      clearInterval(typingInterval);
      typingInterval = startTypingIndicator(
        adapter,
        channelName,
        msg.sessionId ?? "",
      );
    }
    if (event.type === "tool_result" && event.blocked) {
      sendAdapterMessage(adapter, channelName, msg.sessionId, event.result);
    }
    if (event.type === "response") {
      clearInterval(typingInterval);
      typingInterval = undefined;
      const text = event.text.trim();
      if (text.length > 0) {
        sendAdapterMessage(adapter, channelName, msg.sessionId, text);
      } else {
        chatLog.warn(
          `${channelName}: skipping empty response (LLM returned no text)`,
        );
      }
    }
    if (event.type === "error") {
      clearInterval(typingInterval);
      typingInterval = undefined;
      sendAdapterMessage(
        adapter,
        channelName,
        msg.sessionId,
        `Error: ${event.message}`,
      );
    }
  };
}
