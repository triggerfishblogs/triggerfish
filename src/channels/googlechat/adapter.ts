/**
 * Google Chat channel adapter via PubSub pull delivery.
 *
 * Receives incoming messages by polling a Google Cloud PubSub subscription
 * and sends replies via the Google Chat API. No permanent public endpoint
 * required — all connections are outbound.
 *
 * Follows the same polling pattern as the Email/IMAP adapter.
 *
 * @module
 */

import { createLogger } from "../../core/logger/logger.ts";
import type { ClassificationLevel } from "../../core/types/classification.ts";
import type {
  ChannelAdapter,
  ChannelMessage,
  ChannelStatus,
  MessageHandler,
} from "../types.ts";
import type {
  GoogleChatConfig,
  GoogleChatEvent,
  PubSubAckFn,
  PubSubPullFn,
} from "./types.ts";
import {
  createPubSubAcknowledger,
  createPubSubPuller,
  parseGoogleChatEventData,
  sendGoogleChatMessage,
  sendGoogleChatTyping,
} from "./client.ts";

const log = createLogger("googlechat");

/** Default poll interval in milliseconds. */
const DEFAULT_POLL_INTERVAL = 5000;

/** Extended Google Chat adapter with typing indicator support. */
export interface GoogleChatChannelAdapter extends ChannelAdapter {
  /** Send a typing indicator to the given session. */
  sendTyping(sessionId: string): Promise<void>;
}

// ─── Mutable adapter state ──────────────────────────────────────────────────

/** Mutable state shared across Google Chat adapter helpers. */
interface GoogleChatAdapterState {
  connected: boolean;
  handler: MessageHandler | null;
  pollTimer: ReturnType<typeof setInterval> | null;
  readonly pullFn: PubSubPullFn;
  readonly ackFn: PubSubAckFn;
}

// ─── Space / session helpers ────────────────────────────────────────────────

/** Determine if a Google Chat space is a DM (direct message). */
function isDirectMessage(event: GoogleChatEvent): boolean {
  const space = event.message?.space ?? event.space;
  if (!space) return false;
  if (space.singleUserBotDm) return true;
  return space.type === "DM";
}

/** Encode a space resource name for use in a session ID (URL-encode slashes). */
function encodeSpaceName(spaceName: string): string {
  return spaceName.replace(/\//g, "%2F");
}

/** Decode a space resource name from a session ID (restore slashes). */
function decodeSpaceName(encoded: string): string {
  return encoded.replace(/%2F/g, "/");
}

/** Build a session ID from a Google Chat event. */
function buildSessionId(event: GoogleChatEvent): string | undefined {
  const space = event.message?.space ?? event.space;
  if (!space?.name) return undefined;
  const encoded = encodeSpaceName(space.name);
  return isDirectMessage(event)
    ? `googlechat-${encoded}`
    : `googlechat-group-${encoded}`;
}

/** Extract the space resource name from a session ID. */
function spaceNameFromSessionId(sessionId: string): string | undefined {
  const stripped = sessionId
    .replace("googlechat-group-", "")
    .replace("googlechat-", "");
  if (!stripped) return undefined;
  return decodeSpaceName(stripped);
}

// ─── Mention / group filtering ──────────────────────────────────────────────

/** Check if the bot was @mentioned in a Google Chat event. */
function isBotMentioned(event: GoogleChatEvent): boolean {
  const annotations = event.message?.annotations;
  if (!annotations) return false;
  return annotations.some(
    (a) =>
      a.type === "USER_MENTION" &&
      a.userMention?.user?.type === "BOT",
  );
}

/** Determine if a group space message should be dispatched based on group mode. */
function isGroupMessageAllowed(
  event: GoogleChatEvent,
  config: GoogleChatConfig,
): boolean {
  const space = event.message?.space ?? event.space;
  const spaceName = space?.name ?? "";
  const mode = config.groups?.[spaceName]?.mode ??
    config.defaultGroupMode ?? "mentioned-only";

  switch (mode) {
    case "always":
      return true;
    case "mentioned-only":
      return isBotMentioned(event);
    case "owner-only":
      return false;
    default:
      return false;
  }
}

// ─── Ownership resolution ───────────────────────────────────────────────────

/** Determine if the event sender is the configured owner. */
function resolveOwnership(
  event: GoogleChatEvent,
  ownerEmail: string | undefined,
): boolean {
  if (!ownerEmail) return true;
  const senderEmail = event.message?.sender?.email ?? event.user?.email;
  return senderEmail === ownerEmail;
}

// ─── Event dispatch ─────────────────────────────────────────────────────────

/** Extract the message text from a Google Chat event. */
function extractMessageText(event: GoogleChatEvent): string | undefined {
  return event.message?.argumentText?.trim() ||
    event.message?.text?.trim();
}

/** Dispatch a parsed Google Chat event to the message handler. */
function dispatchGoogleChatEvent(
  event: GoogleChatEvent,
  handler: MessageHandler,
  config: GoogleChatConfig,
): void {
  if (event.type !== "MESSAGE") return;

  const text = extractMessageText(event);
  if (!text) return;

  const sessionId = buildSessionId(event);
  if (!sessionId) return;

  const isDm = isDirectMessage(event);
  const isOwner = resolveOwnership(event, config.ownerEmail);
  const senderEmail = event.message?.sender?.email ??
    event.user?.email ?? "unknown";

  if (!isDm && !isGroupMessageAllowed(event, config)) {
    log.debug("Google Chat group message filtered by group mode", {
      space: event.message?.space?.name,
      sender: senderEmail,
    });
    return;
  }

  log.debug("Google Chat message received", {
    sessionId,
    sender: senderEmail,
    isDm,
    isOwner,
  });

  handler({
    content: text,
    sessionId,
    senderId: senderEmail,
    isOwner,
    sessionTaint: isOwner ? undefined : ("PUBLIC" as ClassificationLevel),
    isGroup: !isDm,
    groupId: !isDm
      ? (event.message?.space?.name ?? undefined)
      : undefined,
  });
}

// ─── Polling logic ──────────────────────────────────────────────────────────

/** Poll PubSub for new messages and dispatch them. */
async function pollGoogleChatMessages(
  state: GoogleChatAdapterState,
  config: GoogleChatConfig,
): Promise<void> {
  if (!state.handler) return;

  try {
    const response = await state.pullFn(
      config.pubsubSubscription,
      10,
    );

    const messages = response.receivedMessages ?? [];
    if (messages.length === 0) return;

    const ackIds: string[] = [];

    for (const received of messages) {
      ackIds.push(received.ackId);

      const event = parseGoogleChatEventData(received.message.data);
      if (!event) continue;

      dispatchGoogleChatEvent(event, state.handler, config);
    }

    await state.ackFn(config.pubsubSubscription, ackIds);
  } catch (err: unknown) {
    log.warn("Google Chat PubSub poll failed", {
      operation: "pollGoogleChatMessages",
      err,
    });
  }
}

// ─── Factory ────────────────────────────────────────────────────────────────

/**
 * Create a Google Chat channel adapter.
 *
 * Receives messages via PubSub pull and sends replies via the Chat API.
 * Each conversation is mapped to a session ID based on the space name.
 *
 * @param config - Google Chat adapter configuration.
 * @returns A GoogleChatChannelAdapter wired to Google Chat.
 */
export function createGoogleChatChannel(
  config: GoogleChatConfig,
): GoogleChatChannelAdapter {
  const classification = (config.classification ??
    "INTERNAL") as ClassificationLevel;

  const state: GoogleChatAdapterState = {
    connected: false, handler: null, pollTimer: null,
    pullFn: config._pullFn ?? createPubSubPuller(config),
    ackFn: config._ackFn ?? createPubSubAcknowledger(config),
  };
  return {
    classification,
    isOwner: true,

    async connect(): Promise<void> {
      await pollGoogleChatMessages(state, config);
      state.pollTimer = setInterval(async () => {
        await pollGoogleChatMessages(state, config);
      }, DEFAULT_POLL_INTERVAL);
      state.connected = true;
      log.info("Google Chat adapter connected", {
        subscription: config.pubsubSubscription,
      });
    },

    disconnect(): Promise<void> {
      if (state.pollTimer) {
        clearInterval(state.pollTimer);
        state.pollTimer = null;
      }
      state.connected = false;
      log.info("Google Chat adapter disconnected");
      return Promise.resolve();
    },

    async send(message: ChannelMessage): Promise<void> {
      if (!message.sessionId) return;
      const spaceName = spaceNameFromSessionId(message.sessionId);
      if (!spaceName) return;
      try {
        await sendGoogleChatMessage(config, spaceName, message.content);
        log.info("Google Chat message delivered", {
          operation: "send",
          sessionId: message.sessionId,
          spaceId: spaceName,
        });
      } catch (err: unknown) {
        log.error("Google Chat message delivery failed", {
          operation: "send",
          err,
          sessionId: message.sessionId,
          spaceId: spaceName,
        });
        throw err;
      }
    },

    onMessage(handler: MessageHandler): void {
      state.handler = handler;
    },

    status(): ChannelStatus {
      return { connected: state.connected, channelType: "googlechat" };
    },

    sendTyping(sessionId: string): Promise<void> {
      if (!sessionId) return Promise.resolve();
      const spaceName = spaceNameFromSessionId(sessionId);
      if (!spaceName) return Promise.resolve();
      sendGoogleChatTyping(spaceName);
      return Promise.resolve();
    },
  };
}
