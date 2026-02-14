/**
 * Telegram channel adapter using grammY.
 *
 * Connects to the Telegram Bot API and routes incoming messages to the
 * message handler. Supports text messages, reply formatting, and
 * message chunking for Telegram's 4096-character limit.
 *
 * @module
 */

import { Bot } from "grammy";
import type { ClassificationLevel } from "../../core/types/classification.ts";
import type {
  ChannelAdapter,
  ChannelMessage,
  ChannelStatus,
  MessageHandler,
} from "../types.ts";

/** Maximum message length for Telegram. */
const MAX_MESSAGE_LENGTH = 4096;

/** Configuration for the Telegram channel adapter. */
export interface TelegramConfig {
  /** Telegram Bot API token from @BotFather. */
  readonly botToken: string;
  /** Classification level for this channel. Default: INTERNAL */
  readonly classification?: ClassificationLevel;
  /** Owner's Telegram user ID for isOwner checks. */
  readonly ownerId?: number;
}

/** Extended Telegram adapter with typing indicator support. */
export interface TelegramChannelAdapter extends ChannelAdapter {
  /** Send a "typing..." chat action to the given Telegram chat. */
  sendTyping(sessionId: string): Promise<void>;
  /** Delete all tracked messages in a chat (both bot and user messages). */
  clearChat(sessionId: string): Promise<void>;
}

/**
 * Create a Telegram channel adapter.
 *
 * Uses grammY to connect to the Telegram Bot API. The bot listens for
 * text messages and forwards them to the registered message handler.
 *
 * @param config - Telegram bot configuration.
 * @returns A TelegramChannelAdapter wired to Telegram.
 */
export function createTelegramChannel(config: TelegramConfig): TelegramChannelAdapter {
  const bot = new Bot(config.botToken);
  const classification = (config.classification ?? "PUBLIC") as ClassificationLevel;
  const ownerId = config.ownerId;
  let connected = false;
  let handler: MessageHandler | null = null;

  // Track message IDs per chat for clearChat
  const chatMessageIds = new Map<number, number[]>();

  function trackMessage(chatId: number, messageId: number): void {
    let ids = chatMessageIds.get(chatId);
    if (!ids) {
      ids = [];
      chatMessageIds.set(chatId, ids);
    }
    ids.push(messageId);
  }

  // Wire up incoming message handler
  bot.on("message:text", (ctx) => {
    if (!handler) return;

    const numericOwnerId = typeof ownerId === "number" ? ownerId : Number(ownerId);
    const isOwner = ownerId !== undefined && Number.isFinite(numericOwnerId)
      ? ctx.from.id === numericOwnerId
      : ownerId === undefined; // No ownerId → treat as owner; invalid ownerId → never owner

    trackMessage(ctx.chat.id, ctx.message.message_id);

    handler({
      content: ctx.message.text,
      sessionId: `telegram-${ctx.chat.id}`,
      senderId: String(ctx.from.id),
      isOwner,
      sessionTaint: isOwner ? undefined : ("PUBLIC" as ClassificationLevel),
    });
  });

  return {
    classification,
    isOwner: true, // Determined per-message via ownerId check

    // deno-lint-ignore require-await
    async connect(): Promise<void> {
      bot.start();
      connected = true;
    },

    async disconnect(): Promise<void> {
      await bot.stop();
      connected = false;
    },

    async send(message: ChannelMessage): Promise<void> {
      if (!message.sessionId) return;

      // Extract chat ID from session ID
      const chatIdStr = message.sessionId.replace("telegram-", "");
      const chatId = parseInt(chatIdStr, 10);
      if (isNaN(chatId)) return;

      // Chunk messages that exceed Telegram's limit
      const chunks = chunkMessage(message.content, MAX_MESSAGE_LENGTH);
      for (const chunk of chunks) {
        const sent = await bot.api.sendMessage(chatId, chunk);
        trackMessage(chatId, sent.message_id);
      }
    },

    onMessage(msgHandler: MessageHandler): void {
      handler = msgHandler;
    },

    status(): ChannelStatus {
      return {
        connected,
        channelType: "telegram",
      };
    },

    async sendTyping(sessionId: string): Promise<void> {
      if (!sessionId) return;
      const chatId = parseInt(sessionId.replace("telegram-", ""), 10);
      if (isNaN(chatId)) return;
      await bot.api.sendChatAction(chatId, "typing");
    },

    async clearChat(sessionId: string): Promise<void> {
      if (!sessionId) return;
      const chatId = parseInt(sessionId.replace("telegram-", ""), 10);
      if (isNaN(chatId)) return;

      const ids = chatMessageIds.get(chatId);
      if (!ids || ids.length === 0) return;

      // deleteMessages handles up to 100 at a time
      while (ids.length > 0) {
        const batch = ids.splice(0, 100);
        try {
          await bot.api.deleteMessages(chatId, batch);
        } catch {
          // Best-effort: some messages may already be deleted or >48h old
        }
      }
      chatMessageIds.delete(chatId);
    },
  };
}

/**
 * Split a message into chunks that fit within a character limit.
 * Tries to split on newlines or spaces for readability.
 */
export function chunkMessage(text: string, maxLength: number): string[] {
  if (text.length <= maxLength) return [text];

  const chunks: string[] = [];
  let remaining = text;

  while (remaining.length > 0) {
    if (remaining.length <= maxLength) {
      chunks.push(remaining);
      break;
    }

    // Find a good split point (newline or space near the limit)
    let splitAt = remaining.lastIndexOf("\n", maxLength);
    if (splitAt <= 0 || splitAt < maxLength * 0.5) {
      splitAt = remaining.lastIndexOf(" ", maxLength);
    }
    if (splitAt <= 0) {
      splitAt = maxLength; // Hard split
    }

    chunks.push(remaining.slice(0, splitAt));
    remaining = remaining.slice(splitAt).trimStart();
  }

  return chunks;
}
