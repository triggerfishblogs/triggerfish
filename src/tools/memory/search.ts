/**
 * Memory search — FTS5 full-text search and in-memory fallback.
 *
 * Provides a `MemorySearchProvider` interface with two implementations:
 * - `createFts5SearchProvider` — SQLite FTS5 virtual table (production)
 * - `createInMemorySearchProvider` — array-backed substring match (tests)
 *
 * All search results are post-filtered by classification gating and
 * shadowed by key (highest visible classification wins).
 *
 * @module
 */

import type { ClassificationLevel } from "../../core/types/classification.ts";
import {
  canFlowTo,
  CLASSIFICATION_ORDER,
} from "../../core/types/classification.ts";
import type { MemoryRecord, StoredMemoryRecord } from "./types.ts";
import type { SessionId } from "../../core/types/session.ts";

/** A search result with relevance rank. */
export interface MemorySearchResult {
  readonly record: MemoryRecord;
  readonly rank: number;
}

/** Options for searching memory. */
export interface MemorySearchOptions {
  readonly agentId: string;
  readonly query: string;
  readonly sessionTaint: ClassificationLevel;
  readonly maxResults?: number;
}

/** Interface for memory search backends. */
export interface MemorySearchProvider {
  /** Index a record for search. Upserts by (agentId, classification, key). */
  index(record: MemoryRecord): Promise<void>;

  /** Remove a record from the search index. */
  remove(
    agentId: string,
    classification: ClassificationLevel,
    key: string,
  ): Promise<void>;

  /** Search for records matching a query, filtered by classification. */
  search(options: MemorySearchOptions): Promise<readonly MemorySearchResult[]>;

  /** Release resources. */
  close(): Promise<void>;
}

/** Deserialise a StoredMemoryRecord JSON string back to a MemoryRecord. */
export function deserialiseRecord(json: string): MemoryRecord {
  const stored: StoredMemoryRecord = JSON.parse(json);
  return {
    key: stored.key,
    agentId: stored.agentId,
    classification: stored.classification,
    content: stored.content,
    tags: stored.tags,
    createdAt: new Date(stored.createdAt),
    updatedAt: new Date(stored.updatedAt),
    ...(stored.expiresAt !== undefined
      ? { expiresAt: new Date(stored.expiresAt) }
      : {}),
    expired: stored.expired,
    sourceSessionId: stored.sourceSessionId as SessionId,
    ...(stored.lineageId !== undefined ? { lineageId: stored.lineageId } : {}),
  };
}

/** Serialise a MemoryRecord to a JSON string for storage. */
export function serialiseRecord(record: MemoryRecord): string {
  const stored: StoredMemoryRecord = {
    key: record.key,
    agentId: record.agentId,
    classification: record.classification,
    content: record.content,
    tags: [...record.tags],
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
    ...(record.expiresAt !== undefined
      ? { expiresAt: record.expiresAt.toISOString() }
      : {}),
    expired: record.expired,
    sourceSessionId: record.sourceSessionId as string,
    ...(record.lineageId !== undefined ? { lineageId: record.lineageId } : {}),
  };
  return JSON.stringify(stored);
}

/**
 * Apply shadowing: for records sharing the same key, keep only
 * the one at the highest visible classification level.
 */
function applyShadowing(records: MemoryRecord[]): MemoryRecord[] {
  const byKey = new Map<string, MemoryRecord>();
  for (const record of records) {
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
}

/** Find the index of a record matching (agentId, classification, key), or -1. */
function findRecordIndex(
  records: readonly MemoryRecord[],
  agentId: string,
  classification: ClassificationLevel,
  key: string,
): number {
  return records.findIndex(
    (r) =>
      r.agentId === agentId &&
      r.classification === classification &&
      r.key === key,
  );
}

/** Filter records visible to the given session taint that match the query. */
function filterVisibleRecords(
  records: readonly MemoryRecord[],
  agentId: string,
  queryLower: string,
  sessionTaint: ClassificationLevel,
): MemoryRecord[] {
  return records.filter(
    (r) =>
      r.agentId === agentId &&
      !r.expired &&
      canFlowTo(r.classification, sessionTaint) &&
      (r.content.toLowerCase().includes(queryLower) ||
        r.tags.some((t) => t.toLowerCase().includes(queryLower))),
  );
}

/** Score and rank shadowed records by substring position. */
function scoreMemoryRecords(
  shadowed: readonly MemoryRecord[],
  queryLower: string,
  maxResults: number,
): readonly MemorySearchResult[] {
  const scored: MemorySearchResult[] = shadowed.map((record) => {
    const pos = record.content.toLowerCase().indexOf(queryLower);
    return { record, rank: pos === -1 ? 1000 : pos };
  });
  scored.sort((a, b) => a.rank - b.rank);
  return scored.slice(0, maxResults);
}

/** Upsert a record into the in-memory store by (agentId, classification, key). */
function upsertMemoryRecord(
  records: MemoryRecord[],
  record: MemoryRecord,
): void {
  const idx = findRecordIndex(
    records,
    record.agentId,
    record.classification,
    record.key,
  );
  if (idx !== -1) records.splice(idx, 1);
  records.push(record);
}

/** Remove a record from the in-memory store by (agentId, classification, key). */
function removeMemoryRecord(
  records: MemoryRecord[],
  agentId: string,
  classification: ClassificationLevel,
  key: string,
): void {
  const idx = findRecordIndex(records, agentId, classification, key);
  if (idx !== -1) records.splice(idx, 1);
}

/** Search the in-memory store with substring matching, shadowing, and scoring. */
function searchMemoryRecords(
  records: readonly MemoryRecord[],
  options: MemorySearchOptions,
): readonly MemorySearchResult[] {
  const { agentId, query, sessionTaint, maxResults = 20 } = options;
  const queryLower = query.toLowerCase();
  const visible = filterVisibleRecords(
    records,
    agentId,
    queryLower,
    sessionTaint,
  );
  return scoreMemoryRecords(applyShadowing(visible), queryLower, maxResults);
}

/** Build the MemorySearchProvider method object backed by the given records array. */
function buildInMemoryProviderMethods(
  records: MemoryRecord[],
): MemorySearchProvider {
  return {
    index(record: MemoryRecord): Promise<void> {
      upsertMemoryRecord(records, record);
      return Promise.resolve();
    },
    remove(
      agentId: string,
      cl: ClassificationLevel,
      key: string,
    ): Promise<void> {
      removeMemoryRecord(records, agentId, cl, key);
      return Promise.resolve();
    },
    search(
      options: MemorySearchOptions,
    ): Promise<readonly MemorySearchResult[]> {
      return Promise.resolve(searchMemoryRecords(records, options));
    },
    close(): Promise<void> {
      records.length = 0;
      return Promise.resolve();
    },
  };
}

/**
 * Create an in-memory search provider for testing.
 *
 * Uses simple substring matching on content and tags.
 */
export function createInMemorySearchProvider(): MemorySearchProvider {
  return buildInMemoryProviderMethods([]);
}

/** Row shape from FTS5 search queries. */
interface FtsSearchRow {
  readonly agent_id: string;
  readonly classification: string;
  readonly key: string;
  readonly record_json: string;
  readonly rank: number;
}

/**
 * Create an FTS5-backed search provider using a SQLite Database.
 *
 * Creates the `memory_fts` virtual table and `memory_meta` metadata table
 * if they don't exist. The FTS5 table uses porter stemming for better
 * natural language matching.
 */
export function createFts5SearchProvider(
  db: { exec: (sql: string) => void; prepare: (sql: string) => unknown },
): MemorySearchProvider {
  // deno-lint-ignore no-explicit-any
  const database = db as any;

  database.exec(`
    CREATE VIRTUAL TABLE IF NOT EXISTS memory_fts USING fts5(
      agent_id, classification, key, content, tags,
      tokenize='porter unicode61'
    )
  `);

  database.exec(`
    CREATE TABLE IF NOT EXISTS memory_meta (
      agent_id TEXT NOT NULL,
      classification TEXT NOT NULL,
      key TEXT NOT NULL,
      record_json TEXT NOT NULL,
      PRIMARY KEY (agent_id, classification, key)
    )
  `);

  const stmtDeleteFts = database.prepare(
    "DELETE FROM memory_fts WHERE agent_id = ? AND classification = ? AND key = ?",
  );
  const stmtInsertFts = database.prepare(
    "INSERT INTO memory_fts (agent_id, classification, key, content, tags) VALUES (?, ?, ?, ?, ?)",
  );
  const stmtUpsertMeta = database.prepare(
    "INSERT OR REPLACE INTO memory_meta (agent_id, classification, key, record_json) VALUES (?, ?, ?, ?)",
  );
  const stmtDeleteMeta = database.prepare(
    "DELETE FROM memory_meta WHERE agent_id = ? AND classification = ? AND key = ?",
  );
  const stmtSearch = database.prepare(`
    SELECT m.agent_id, m.classification, m.key, m.record_json, f.rank
    FROM memory_fts f
    JOIN memory_meta m ON f.agent_id = m.agent_id AND f.classification = m.classification AND f.key = m.key
    WHERE memory_fts MATCH ? AND f.agent_id = ?
    ORDER BY f.rank
    LIMIT ?
  `);

  return {
    // deno-lint-ignore require-await
    async index(record: MemoryRecord): Promise<void> {
      const json = serialiseRecord(record);
      // Delete old FTS entry (FTS5 doesn't support UPDATE)
      stmtDeleteFts.run(record.agentId, record.classification, record.key);
      // Insert new FTS entry
      stmtInsertFts.run(
        record.agentId,
        record.classification,
        record.key,
        record.content,
        record.tags.join(" "),
      );
      // Upsert metadata
      stmtUpsertMeta.run(
        record.agentId,
        record.classification,
        record.key,
        json,
      );
    },

    // deno-lint-ignore require-await
    async remove(
      agentId: string,
      classification: ClassificationLevel,
      key: string,
    ): Promise<void> {
      stmtDeleteFts.run(agentId, classification, key);
      stmtDeleteMeta.run(agentId, classification, key);
    },

    // deno-lint-ignore require-await
    async search(
      options: MemorySearchOptions,
    ): Promise<readonly MemorySearchResult[]> {
      const { agentId, query, sessionTaint, maxResults = 20 } = options;

      // FTS5 query — fetch more than needed to account for classification filtering
      const fetchLimit = maxResults * 4;
      const rows = stmtSearch.all(query, agentId, fetchLimit) as FtsSearchRow[];

      // Post-filter by classification gating and non-expired
      const visible: MemorySearchResult[] = [];
      for (const row of rows) {
        const classification = row.classification as ClassificationLevel;
        if (!canFlowTo(classification, sessionTaint)) continue;

        const record = deserialiseRecord(row.record_json);
        if (record.expired) continue;

        visible.push({ record, rank: row.rank });
      }

      // Apply shadowing
      const shadowed = applyShadowing(visible.map((v) => v.record));
      const shadowedKeys = new Set(
        shadowed.map((r) => `${r.classification}:${r.key}`),
      );

      const results = visible.filter(
        (v) => shadowedKeys.has(`${v.record.classification}:${v.record.key}`),
      );

      return results.slice(0, maxResults);
    },

    // deno-lint-ignore require-await
    async close(): Promise<void> {
      stmtDeleteFts.finalize();
      stmtInsertFts.finalize();
      stmtUpsertMeta.finalize();
      stmtDeleteMeta.finalize();
      stmtSearch.finalize();
    },
  };
}
