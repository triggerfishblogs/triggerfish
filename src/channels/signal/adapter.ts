/**
 * Signal channel adapter for Triggerfish.
 *
 * Bridges Triggerfish to Signal via signal-cli daemon. Implements the
 * standard ChannelAdapter interface with Signal-specific extensions
 * for typing indicators.
 *
 * Key difference from bot-based adapters: Signal (via signal-cli) logs in
 * as the owner's real phone number. The owner IS the adapter. Every inbound
 * message comes from someone else, so isOwner is always false.
 *
 * @module
 */

import type { ClassificationLevel } from "../../core/types/classification.ts";
import type {
  ChannelAdapter,
  ChannelMessage,
  ChannelStatus,
  MessageHandler,
} from "../types.ts";
import { createLogger } from "../../core/logger/logger.ts";

const log = createLogger("signal");
import { chunkMessage } from "../telegram/adapter.ts";
import { createSignalClient } from "./client.ts";
import type {
  SignalClientInterface,
  SignalConfig,
  SignalContactEntry,
  SignalGroupEntry,
  SignalNotification,
} from "./types.ts";
import type { Result } from "../../core/types/classification.ts";

/** Maximum message length for Signal before chunking. */
const MAX_MESSAGE_LENGTH = 4000;

/** Extended Signal adapter with typing indicator support and discovery. */
export interface SignalChannelAdapter extends ChannelAdapter {
  /** Send a typing indicator to the recipient for the given session. */
  sendTyping(sessionId: string): Promise<void>;
  /** Stop typing indicator for the given session. */
  stopTyping(sessionId: string): Promise<void>;
  /** List all Signal groups the account belongs to. */
  listGroups(): Promise<Result<readonly SignalGroupEntry[], string>>;
  /** List all known Signal contacts. */
  listContacts(): Promise<Result<readonly SignalContactEntry[], string>>;
}

/**
 * Create a Signal channel adapter.
 *
 * Connects to signal-cli daemon via JSON-RPC over TCP or Unix socket.
 * Routes incoming messages to the registered handler with group mode
 * enforcement. DM access control is handled by the shared
 * ChatSession.handleChannelMessage() layer, not by the adapter.
 *
 * @param config - Signal adapter configuration.
 * @returns A SignalChannelAdapter wired to signal-cli.
 */
export function createSignalChannel(config: SignalConfig): SignalChannelAdapter {
  const classification = (config.classification ?? "PUBLIC") as ClassificationLevel;
  const defaultGroupMode = config.defaultGroupMode ?? "always";

  let client: SignalClientInterface | null = config._client ?? null;
  let connected = false;
  let handler: MessageHandler | null = null;

  /** Extract phone number from a DM session ID. */
  function phoneFromSessionId(sessionId: string): string | null {
    if (sessionId.startsWith("signal-group-")) return null;
    if (sessionId.startsWith("signal-")) return sessionId.slice("signal-".length);
    return null;
  }

  /** Extract group ID from a group session ID. */
  function groupIdFromSessionId(sessionId: string): string | null {
    if (sessionId.startsWith("signal-group-")) return sessionId.slice("signal-group-".length);
    return null;
  }

  /** Check if a group message should be processed. */
  function isGroupMessageAllowed(groupId: string, message: string, mentions: ReadonlyArray<{ readonly uuid: string }> | undefined): boolean {
    const groupConfig = config.groups?.[groupId];
    const mode = groupConfig?.mode ?? defaultGroupMode;

    switch (mode) {
      case "always":
        return true;
      case "mentioned-only":
        // Check if the bot account is mentioned in the message
        if (mentions && mentions.length > 0) return true;
        // Also check for @account pattern in message text
        if (message.includes(`@${config.account}`)) return true;
        return false;
      case "owner-only":
        // The adapter IS the owner — no inbound is from owner
        return false;
      default:
        return false;
    }
  }

  /** Handle an incoming signal-cli notification. */
  function handleNotification(notification: SignalNotification): void {
    if (!handler) return;

    const envelope = notification.envelope;
    if (!envelope.dataMessage) return;

    const dataMessage = envelope.dataMessage;
    const messageText = dataMessage.message;
    if (!messageText) return;

    const senderPhone = envelope.source;
    const groupInfo = dataMessage.groupInfo;

    if (groupInfo && groupInfo.groupId) {
      // Group message
      const groupId = groupInfo.groupId;
      if (!isGroupMessageAllowed(groupId, messageText, dataMessage.mentions)) return;

      const _groupClassification = config.groups?.[groupId]?.classification ?? classification;

      log.debug("Group message received", { groupId, sender: senderPhone });
      handler({
        content: messageText,
        sessionId: `signal-group-${groupId}`,
        senderId: senderPhone,
        isOwner: false,
        sessionTaint: "PUBLIC" as ClassificationLevel,
      });
    } else {
      // DM — access control handled by ChatSession.handleChannelMessage()
      log.debug("DM received", { sender: senderPhone });
      handler({
        content: messageText,
        sessionId: `signal-${senderPhone}`,
        senderId: senderPhone,
        isOwner: false,
        sessionTaint: "PUBLIC" as ClassificationLevel,
      });
    }
  }

  return {
    classification,
    isOwner: false, // The adapter IS the owner's phone — all messages are from others

    async connect(): Promise<void> {
      if (!client) {
        client = createSignalClient({ endpoint: config.endpoint });
      }

      client.onNotification(handleNotification);

      const result = await client.connect();
      if (!result.ok) {
        throw new Error(`Signal connect failed: ${result.error}`);
      }

      // Verify connectivity — retry up to 5 times (500ms apart) to handle
      // the TCP-ready-but-JSON-RPC-not-ready window after daemon startup.
      let pingResult: Result<void, string> = { ok: false, error: "not attempted" };
      for (let attempt = 0; attempt < 5; attempt++) {
        if (attempt > 0) {
          await new Promise((r) => setTimeout(r, 500));
        }
        pingResult = await client.ping();
        if (pingResult.ok) break;
      }
      if (!pingResult.ok) {
        throw new Error(`Signal ping failed after retries: ${pingResult.error}`);
      }

      connected = true;
      log.info("Signal adapter connected", { endpoint: config.endpoint });
    },

    async disconnect(): Promise<void> {
      if (client) {
        await client.disconnect();
      }
      connected = false;
      log.info("Signal adapter disconnected");
    },

    async send(message: ChannelMessage): Promise<void> {
      if (!message.sessionId || !client) return;

      const phone = phoneFromSessionId(message.sessionId);
      const groupId = groupIdFromSessionId(message.sessionId);

      if (!phone && !groupId) return;

      const chunks = chunkMessage(message.content, MAX_MESSAGE_LENGTH);

      // Send typing before first chunk
      if (phone) {
        await client.sendTyping(phone);
      }

      for (const chunk of chunks) {
        if (phone) {
          await client.sendMessage(phone, chunk);
        } else if (groupId) {
          await client.sendGroupMessage(groupId, chunk);
        }
      }

      // Stop typing after last chunk
      if (phone) {
        await client.sendTypingStop(phone);
      }
    },

    onMessage(msgHandler: MessageHandler): void {
      handler = msgHandler;
    },

    status(): ChannelStatus {
      return {
        connected,
        channelType: "signal",
      };
    },

    async sendTyping(sessionId: string): Promise<void> {
      if (!client || !sessionId) return;
      const phone = phoneFromSessionId(sessionId);
      if (phone) {
        await client.sendTyping(phone);
      }
    },

    async stopTyping(sessionId: string): Promise<void> {
      if (!client || !sessionId) return;
      const phone = phoneFromSessionId(sessionId);
      if (phone) {
        await client.sendTypingStop(phone);
      }
    },

    listGroups(): Promise<Result<readonly SignalGroupEntry[], string>> {
      if (!client) return Promise.resolve({ ok: false, error: "Not connected" });
      return client.listGroups();
    },

    listContacts(): Promise<Result<readonly SignalContactEntry[], string>> {
      if (!client) return Promise.resolve({ ok: false, error: "Not connected" });
      return client.listContacts();
    },
  };
}
