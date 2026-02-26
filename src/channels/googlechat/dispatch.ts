/**
 * Google Chat event dispatch — message parsing, filtering, and routing.
 *
 * Extracts helpers from the adapter to keep file sizes within limits.
 * All functions are pure (no adapter state) and operate on event data.
 *
 * @module
 */

import { createLogger } from "../../core/logger/logger.ts";
import type { ClassificationLevel } from "../../core/types/classification.ts";
import type { MessageHandler } from "../types.ts";
import type { GoogleChatConfig, GoogleChatEvent } from "./types.ts";

const log = createLogger("googlechat-dispatch");

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
export function spaceNameFromSessionId(
  sessionId: string,
): string | undefined {
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
  if (!ownerEmail) {
    log.warn("Google Chat ownerEmail not configured, defaulting to non-owner", {
      operation: "resolveOwnership",
    });
    return false;
  }
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
export function dispatchGoogleChatEvent(
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
