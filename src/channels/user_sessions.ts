/**
 * Per-user session manager for non-owner channel messages.
 *
 * Creates and caches ephemeral sessions keyed by `{channelType}:{senderId}`.
 * Each non-owner user gets an independent session starting at PUBLIC taint,
 * with a classification ceiling derived from channel config or per-user overrides.
 *
 * @module
 */

import type { ClassificationLevel } from "../core/types/classification.ts";
import { createSession } from "../core/types/session.ts";
import type { SessionState, UserId, ChannelId } from "../core/types/session.ts";

/** Configuration for per-user classification resolution. */
export interface UserClassificationConfig {
  /** Default classification for users without an explicit override. */
  readonly channelDefault: ClassificationLevel;
  /** Per-user classification overrides keyed by platform-native user ID. */
  readonly userOverrides: ReadonlyMap<string, ClassificationLevel>;
}

/** Manages ephemeral per-user sessions for non-owner channel messages. */
export interface UserSessionManager {
  /** Get an existing session or create a new one for this user. */
  getOrCreate(channelType: string, senderId: string): SessionState;
  /** Resolve the classification ceiling for a user (override or channel default). */
  getClassification(senderId: string): ClassificationLevel;
  /** Whether this user has an explicit classification override in config. */
  hasExplicitClassification(senderId: string): boolean;
  /** Look up an existing session without creating one. */
  getSession(channelType: string, senderId: string): SessionState | undefined;
  /** Replace the cached session state (e.g. after taint escalation). */
  updateSession(channelType: string, senderId: string, session: SessionState): void;
}

/**
 * Create a UserSessionManager for a single channel.
 *
 * Sessions are keyed by `{channelType}:{senderId}` and start at PUBLIC taint.
 * The classification returned by `getClassification` is the ceiling for tool
 * access — the orchestrator's `targetClassification` parameter.
 */
export function createUserSessionManager(
  config: UserClassificationConfig,
): UserSessionManager {
  const sessions = new Map<string, SessionState>();

  function sessionKey(channelType: string, senderId: string): string {
    return `${channelType}:${senderId}`;
  }

  function getClassification(senderId: string): ClassificationLevel {
    return config.userOverrides.get(senderId) ?? config.channelDefault;
  }

  function getOrCreate(channelType: string, senderId: string): SessionState {
    const key = sessionKey(channelType, senderId);
    const existing = sessions.get(key);
    if (existing) return existing;

    const session = createSession({
      userId: senderId as UserId,
      channelId: `${channelType}-user` as ChannelId,
    });
    sessions.set(key, session);
    return session;
  }

  function getSession(channelType: string, senderId: string): SessionState | undefined {
    return sessions.get(sessionKey(channelType, senderId));
  }

  function updateSession(channelType: string, senderId: string, session: SessionState): void {
    sessions.set(sessionKey(channelType, senderId), session);
  }

  function hasExplicitClassification(senderId: string): boolean {
    return config.userOverrides.has(senderId);
  }

  return { getOrCreate, getClassification, hasExplicitClassification, getSession, updateSession };
}

/**
 * Parse a raw `user_classifications` config object into a Map.
 *
 * Config values may be string keys (Discord snowflakes, Slack IDs) or
 * numeric keys (Telegram user IDs). All are normalised to strings.
 */
export function parseUserOverrides(
  raw: Record<string, string> | undefined,
): ReadonlyMap<string, ClassificationLevel> {
  const map = new Map<string, ClassificationLevel>();
  if (!raw) return map;
  for (const [key, value] of Object.entries(raw)) {
    map.set(String(key), value as ClassificationLevel);
  }
  return map;
}
