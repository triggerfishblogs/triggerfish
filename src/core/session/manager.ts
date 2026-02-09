/**
 * Session Manager — CRUD and taint lifecycle for sessions.
 *
 * Wraps the core session types from `types/session.ts` with a
 * storage-backed manager that persists sessions via `StorageProvider`.
 * All mutations return new objects — session state is immutable.
 *
 * @module
 */

import type { ClassificationLevel } from "../types/classification.ts";
import type {
  CreateSessionOptions,
  SessionId,
  SessionState,
} from "../types/session.ts";
import {
  createSession,
  resetSession,
  updateTaint,
} from "../types/session.ts";
import type { StorageProvider } from "../storage/provider.ts";

/** Key prefix for sessions stored via StorageProvider. */
const SESSION_PREFIX = "sessions:";

/** Session Manager interface — async CRUD + taint operations. */
export interface SessionManager {
  /** Create a new session with PUBLIC taint. */
  create(options: CreateSessionOptions): Promise<SessionState>;

  /** Retrieve a session by ID. Returns `null` when not found. */
  get(id: SessionId): Promise<SessionState | null>;

  /** List all active sessions. */
  list(): Promise<SessionState[]>;

  /** Delete a session by ID. */
  delete(id: SessionId): Promise<void>;

  /** Escalate session taint. Returns the (possibly updated) session. */
  updateTaint(
    id: SessionId,
    level: ClassificationLevel,
    reason: string,
  ): Promise<SessionState>;

  /** Reset a session: fresh PUBLIC taint, cleared history, new ID. Preserves userId/channelId. */
  reset(id: SessionId): Promise<SessionState>;
}

/** Serialise a SessionState to a JSON string for storage. */
function serialise(session: SessionState): string {
  return JSON.stringify({
    ...session,
    createdAt: session.createdAt.toISOString(),
    history: session.history.map((e) => ({
      ...e,
      timestamp: e.timestamp.toISOString(),
    })),
  });
}

/** Deserialise a JSON string back to a SessionState. */
function deserialise(raw: string): SessionState {
  const data = JSON.parse(raw);
  return {
    ...data,
    createdAt: new Date(data.createdAt),
    history: data.history.map(
      (e: Record<string, unknown>) => ({
        ...e,
        timestamp: new Date(e.timestamp as string),
      }),
    ),
  } as SessionState;
}

/**
 * Create a SessionManager backed by the given StorageProvider.
 */
export function createSessionManager(
  storage: StorageProvider,
): SessionManager {
  return {
    async create(options: CreateSessionOptions): Promise<SessionState> {
      const session = createSession(options);
      await storage.set(SESSION_PREFIX + session.id, serialise(session));
      return session;
    },

    async get(id: SessionId): Promise<SessionState | null> {
      const raw = await storage.get(SESSION_PREFIX + id);
      if (raw === null) return null;
      return deserialise(raw);
    },

    async list(): Promise<SessionState[]> {
      const keys = await storage.list(SESSION_PREFIX);
      const sessions: SessionState[] = [];
      for (const key of keys) {
        const raw = await storage.get(key);
        if (raw !== null) {
          sessions.push(deserialise(raw));
        }
      }
      return sessions;
    },

    async delete(id: SessionId): Promise<void> {
      await storage.delete(SESSION_PREFIX + id);
    },

    async updateTaint(
      id: SessionId,
      level: ClassificationLevel,
      reason: string,
    ): Promise<SessionState> {
      const raw = await storage.get(SESSION_PREFIX + id);
      if (raw === null) {
        throw new Error(`Session not found: ${id}`);
      }
      const current = deserialise(raw);
      const updated = updateTaint(current, level, reason);
      await storage.set(SESSION_PREFIX + id, serialise(updated));
      return updated;
    },

    async reset(id: SessionId): Promise<SessionState> {
      const raw = await storage.get(SESSION_PREFIX + id);
      if (raw === null) {
        throw new Error(`Session not found: ${id}`);
      }
      const current = deserialise(raw);
      // Delete old session
      await storage.delete(SESSION_PREFIX + id);
      // Create fresh session preserving user/channel
      const fresh = resetSession(current);
      await storage.set(SESSION_PREFIX + fresh.id, serialise(fresh));
      return fresh;
    },
  };
}
