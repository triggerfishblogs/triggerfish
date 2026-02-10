/**
 * Session retention policies — automatic cleanup of expired sessions.
 *
 * Enforces time-based and count-based retention limits on sessions
 * stored via StorageProvider. Sessions are identified by the `sessions:`
 * prefix and must contain a `createdAt` ISO date string in their
 * serialized JSON representation.
 *
 * @module
 */

import type { Result } from "../types/classification.ts";
import type { StorageProvider } from "../storage/provider.ts";

/** Configuration for session retention policies. */
export interface RetentionConfig {
  /** Maximum age in days before a session is eligible for deletion. */
  readonly maxAgeDays: number;
  /** Optional cap on total number of sessions to keep (newest are retained). */
  readonly maxSessions?: number;
}

/** Key prefix used by SessionManager for stored sessions. */
const SESSION_PREFIX = "sessions:";

/**
 * Apply retention policies to stored sessions.
 *
 * Deletes sessions older than `config.maxAgeDays` relative to `now`.
 * If `config.maxSessions` is set, also trims to the N newest sessions
 * after TTL-based deletion.
 *
 * @param storage - The StorageProvider containing session data
 * @param config - Retention policy configuration
 * @param now - Reference time for age calculations (defaults to current time)
 * @returns Result containing the number of deleted sessions, or an error message
 */
export async function applyRetention(
  storage: StorageProvider,
  config: RetentionConfig,
  now?: Date,
): Promise<Result<number, string>> {
  const referenceTime = now ?? new Date();
  const maxAgeMs = config.maxAgeDays * 24 * 60 * 60 * 1000;

  try {
    const keys = await storage.list(SESSION_PREFIX);

    if (keys.length === 0) {
      return { ok: true, value: 0 };
    }

    // Parse all sessions with their keys and createdAt timestamps
    interface SessionEntry {
      readonly key: string;
      readonly createdAt: Date;
    }

    const entries: SessionEntry[] = [];

    for (const key of keys) {
      const raw = await storage.get(key);
      if (raw === null) continue;

      try {
        const data = JSON.parse(raw) as { createdAt?: string };
        if (typeof data.createdAt !== "string") continue;
        entries.push({ key, createdAt: new Date(data.createdAt) });
      } catch {
        // Skip sessions that cannot be parsed
        continue;
      }
    }

    let deletedCount = 0;

    // Phase 1: Delete sessions older than maxAgeDays
    const surviving: SessionEntry[] = [];
    for (const entry of entries) {
      const ageMs = referenceTime.getTime() - entry.createdAt.getTime();
      if (ageMs > maxAgeMs) {
        await storage.delete(entry.key);
        deletedCount++;
      } else {
        surviving.push(entry);
      }
    }

    // Phase 2: Enforce maxSessions limit (keep the N newest)
    if (
      config.maxSessions !== undefined &&
      surviving.length > config.maxSessions
    ) {
      // Sort newest first
      const sorted = [...surviving].sort(
        (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
      );
      const toDelete = sorted.slice(config.maxSessions);
      for (const entry of toDelete) {
        await storage.delete(entry.key);
        deletedCount++;
      }
    }

    return { ok: true, value: deletedCount };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, error: `Retention policy failed: ${message}` };
  }
}
