/**
 * MemoryStore — classification-gated CRUD over StorageProvider.
 *
 * All writes are forced to session taint level. Reads are filtered by
 * `canFlowTo`. Shadowing ensures that when the same key exists at
 * multiple classification levels, only the highest visible version
 * is returned.
 *
 * Storage key format: `memory:<agentId>:<classification>:<key>`
 *
 * @module
 */

import type { StorageProvider } from "../core/storage/provider.ts";
import type { ClassificationLevel } from "../core/types/classification.ts";
import {
  canFlowTo,
  CLASSIFICATION_ORDER,
} from "../core/types/classification.ts";
import type { SessionId } from "../core/types/session.ts";
import type { Result } from "../core/types/classification.ts";
import type { MemoryRecord, MemoryError } from "./types.ts";
import type { MemorySearchProvider } from "./search.ts";
import { serialiseRecord, deserialiseRecord } from "./search.ts";

/** Classification levels ordered from highest to lowest for shadowing. */
const LEVELS_DESCENDING: readonly ClassificationLevel[] = (
  Object.entries(CLASSIFICATION_ORDER) as [ClassificationLevel, number][]
)
  .sort((a, b) => b[1] - a[1])
  .map(([level]) => level);

/** Options for saving a memory record. */
export interface MemorySaveOptions {
  readonly key: string;
  readonly agentId: string;
  readonly sessionTaint: ClassificationLevel;
  readonly content: string;
  readonly tags?: readonly string[];
  readonly expiresAt?: Date;
  readonly sourceSessionId: SessionId;
  readonly lineageId?: string;
}

/** Options for retrieving a memory record. */
export interface MemoryGetOptions {
  readonly key: string;
  readonly agentId: string;
  readonly sessionTaint: ClassificationLevel;
}

/** Options for listing memory records. */
export interface MemoryListOptions {
  readonly agentId: string;
  readonly sessionTaint: ClassificationLevel;
  readonly tag?: string;
}

/** Options for deleting a memory record. */
export interface MemoryDeleteOptions {
  readonly key: string;
  readonly agentId: string;
  readonly sessionTaint: ClassificationLevel;
  readonly sourceSessionId: SessionId;
}

/** Options for purging expired records. */
export interface MemoryPurgeOptions {
  readonly agentId: string;
  readonly before: Date;
}

/** The MemoryStore interface. */
export interface MemoryStore {
  /** Save a record. Classification is forced to sessionTaint. */
  save(options: MemorySaveOptions): Promise<Result<MemoryRecord, MemoryError>>;

  /** Get a record by key with shadowing. Returns highest visible version. */
  get(options: MemoryGetOptions): Promise<MemoryRecord | null>;

  /** List all visible records, optionally filtered by tag. */
  list(options: MemoryListOptions): Promise<readonly MemoryRecord[]>;

  /** Soft-delete a record at session taint level. */
  delete(options: MemoryDeleteOptions): Promise<Result<void, MemoryError>>;

  /** Hard-delete expired records older than the given date. */
  purge(options: MemoryPurgeOptions): Promise<number>;
}

/** Options for creating a MemoryStore. */
export interface CreateMemoryStoreOptions {
  readonly storage: StorageProvider;
  readonly searchProvider?: MemorySearchProvider;
}

/** Build a storage key for a memory record. */
function storageKey(
  agentId: string,
  classification: ClassificationLevel,
  key: string,
): string {
  return `memory:${agentId}:${classification}:${key}`;
}

/** Prefix for listing all records for an agent at a specific level. */
function levelPrefix(
  agentId: string,
  classification: ClassificationLevel,
): string {
  return `memory:${agentId}:${classification}:`;
}

/** Prefix for listing all records for an agent across all levels. */
function agentPrefix(agentId: string): string {
  return `memory:${agentId}:`;
}

/**
 * Create a classification-gated MemoryStore.
 *
 * All writes are forced to sessionTaint. Reads iterate from highest to
 * lowest visible classification for shadowing.
 */
export function createMemoryStore(
  options: CreateMemoryStoreOptions,
): MemoryStore {
  const { storage, searchProvider } = options;

  return {
    async save(opts: MemorySaveOptions): Promise<Result<MemoryRecord, MemoryError>> {
      const now = new Date();

      // Check if record already exists at this level (for updatedAt preservation)
      const existingKey = storageKey(opts.agentId, opts.sessionTaint, opts.key);
      const existingJson = await storage.get(existingKey);
      const existingRecord = existingJson
        ? deserialiseRecord(existingJson)
        : null;

      const record: MemoryRecord = {
        key: opts.key,
        agentId: opts.agentId,
        classification: opts.sessionTaint, // FORCED — LLM cannot choose
        content: opts.content,
        tags: opts.tags ? [...opts.tags] : [],
        createdAt: existingRecord ? existingRecord.createdAt : now,
        updatedAt: now,
        ...(opts.expiresAt !== undefined ? { expiresAt: opts.expiresAt } : {}),
        expired: false,
        sourceSessionId: opts.sourceSessionId,
        ...(opts.lineageId !== undefined ? { lineageId: opts.lineageId } : {}),
      };

      await storage.set(existingKey, serialiseRecord(record));

      if (searchProvider) {
        await searchProvider.index(record);
      }

      return { ok: true, value: record };
    },

    async get(opts: MemoryGetOptions): Promise<MemoryRecord | null> {
      // Iterate from highest to lowest classification for shadowing
      for (const level of LEVELS_DESCENDING) {
        if (!canFlowTo(level, opts.sessionTaint)) continue;

        const key = storageKey(opts.agentId, level, opts.key);
        const json = await storage.get(key);
        if (json === null) continue;

        const record = deserialiseRecord(json);
        if (record.expired) continue;

        // Shadowing: return the first (highest) visible non-expired match
        return record;
      }
      return null;
    },

    async list(opts: MemoryListOptions): Promise<readonly MemoryRecord[]> {
      const allRecords: MemoryRecord[] = [];

      // Collect records from all visible levels
      for (const level of LEVELS_DESCENDING) {
        if (!canFlowTo(level, opts.sessionTaint)) continue;

        const prefix = levelPrefix(opts.agentId, level);
        const keys = await storage.list(prefix);

        for (const key of keys) {
          const json = await storage.get(key);
          if (json === null) continue;

          const record = deserialiseRecord(json);
          if (record.expired) continue;

          // Optional tag filter
          if (opts.tag && !record.tags.includes(opts.tag)) continue;

          allRecords.push(record);
        }
      }

      // Apply shadowing: for records with the same key, keep highest classification
      const byKey = new Map<string, MemoryRecord>();
      for (const record of allRecords) {
        const existing = byKey.get(record.key);
        if (
          !existing ||
          CLASSIFICATION_ORDER[record.classification] >
            CLASSIFICATION_ORDER[existing.classification]
        ) {
          byKey.set(record.key, record);
        }
      }

      return [...byKey.values()];
    },

    async delete(opts: MemoryDeleteOptions): Promise<Result<void, MemoryError>> {
      // Can only delete at own taint level
      const key = storageKey(opts.agentId, opts.sessionTaint, opts.key);
      const json = await storage.get(key);

      if (json === null) {
        return {
          ok: false,
          error: {
            code: "NOT_FOUND",
            message: `Memory record '${opts.key}' not found at ${opts.sessionTaint} level`,
          },
        };
      }

      // Soft-delete: mark as expired
      const record = deserialiseRecord(json);
      const updated: MemoryRecord = {
        ...record,
        expired: true,
        updatedAt: new Date(),
      };
      await storage.set(key, serialiseRecord(updated));

      if (searchProvider) {
        await searchProvider.remove(opts.agentId, opts.sessionTaint, opts.key);
      }

      return { ok: true, value: undefined };
    },

    async purge(opts: MemoryPurgeOptions): Promise<number> {
      const prefix = agentPrefix(opts.agentId);
      const keys = await storage.list(prefix);
      let count = 0;

      for (const key of keys) {
        const json = await storage.get(key);
        if (json === null) continue;

        const record = deserialiseRecord(json);
        if (record.expired && record.updatedAt < opts.before) {
          await storage.delete(key);
          if (searchProvider) {
            await searchProvider.remove(
              record.agentId,
              record.classification,
              record.key,
            );
          }
          count++;
        }
      }

      return count;
    },
  };
}
