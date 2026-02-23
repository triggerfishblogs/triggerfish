/**
 * FTS5 search provider — SQLite FTS5 virtual table backend.
 *
 * Provides `createFts5SearchProvider` which uses SQLite FTS5 with porter
 * stemming for natural language matching. Results are post-filtered by
 * classification gating and shadowed by key.
 *
 * @module
 */

import type { ClassificationLevel } from "../../core/types/classification.ts";
import { canFlowTo } from "../../core/types/classification.ts";
import type { MemoryRecord } from "./types.ts";
import type {
  MemorySearchOptions,
  MemorySearchProvider,
  MemorySearchResult,
} from "./search_types.ts";
import {
  applyShadowing,
  deserialiseRecord,
  serialiseRecord,
} from "./search_serialise.ts";

/** Row shape from FTS5 search queries. */
interface FtsSearchRow {
  readonly agent_id: string;
  readonly classification: string;
  readonly key: string;
  readonly record_json: string;
  readonly rank: number;
}

/** SQL statements for FTS5 table and metadata table creation. */
const CREATE_FTS_TABLE = `
  CREATE VIRTUAL TABLE IF NOT EXISTS memory_fts USING fts5(
    agent_id, classification, key, content, tags,
    tokenize='porter unicode61'
  )
`;

const CREATE_META_TABLE = `
  CREATE TABLE IF NOT EXISTS memory_meta (
    agent_id TEXT NOT NULL,
    classification TEXT NOT NULL,
    key TEXT NOT NULL,
    record_json TEXT NOT NULL,
    PRIMARY KEY (agent_id, classification, key)
  )
`;

/** Prepared statement SQL for FTS5 operations. */
const SQL_DELETE_FTS =
  "DELETE FROM memory_fts WHERE agent_id = ? AND classification = ? AND key = ?";
const SQL_INSERT_FTS =
  "INSERT INTO memory_fts (agent_id, classification, key, content, tags) VALUES (?, ?, ?, ?, ?)";
const SQL_UPSERT_META =
  "INSERT OR REPLACE INTO memory_meta (agent_id, classification, key, record_json) VALUES (?, ?, ?, ?)";
const SQL_DELETE_META =
  "DELETE FROM memory_meta WHERE agent_id = ? AND classification = ? AND key = ?";
const SQL_SEARCH = `
  SELECT m.agent_id, m.classification, m.key, m.record_json, f.rank
  FROM memory_fts f
  JOIN memory_meta m ON f.agent_id = m.agent_id AND f.classification = m.classification AND f.key = m.key
  WHERE memory_fts MATCH ? AND f.agent_id = ?
  ORDER BY f.rank
  LIMIT ?
`;

/** Index a record into FTS5 and metadata tables. */
function indexFtsRecord(
  record: MemoryRecord,
  stmts: FtsPreparedStatements,
): void {
  const json = serialiseRecord(record);
  stmts.deleteFts.run(record.agentId, record.classification, record.key);
  stmts.insertFts.run(
    record.agentId,
    record.classification,
    record.key,
    record.content,
    record.tags.join(" "),
  );
  stmts.upsertMeta.run(
    record.agentId,
    record.classification,
    record.key,
    json,
  );
}

/** Remove a record from FTS5 and metadata tables. */
function removeFtsRecord(
  agentId: string,
  classification: ClassificationLevel,
  key: string,
  stmts: FtsPreparedStatements,
): void {
  stmts.deleteFts.run(agentId, classification, key);
  stmts.deleteMeta.run(agentId, classification, key);
}

/** Filter FTS5 rows by classification gating and expiry, returning visible results. */
function filterFtsRows(
  rows: readonly FtsSearchRow[],
  sessionTaint: ClassificationLevel,
): MemorySearchResult[] {
  const visible: MemorySearchResult[] = [];
  for (const row of rows) {
    const classification = row.classification as ClassificationLevel;
    if (!canFlowTo(classification, sessionTaint)) continue;

    const record = deserialiseRecord(row.record_json);
    if (record.expired) continue;

    visible.push({ record, rank: row.rank });
  }
  return visible;
}

/** Apply shadowing to visible results and trim to maxResults. */
function applyShadowingToResults(
  visible: readonly MemorySearchResult[],
  maxResults: number,
): readonly MemorySearchResult[] {
  const shadowed = applyShadowing(visible.map((v) => v.record));
  const shadowedKeys = new Set(
    shadowed.map((r) => `${r.classification}:${r.key}`),
  );
  const results = visible.filter(
    (v) => shadowedKeys.has(`${v.record.classification}:${v.record.key}`),
  );
  return results.slice(0, maxResults);
}

/** Prepared statements bundle for FTS5 operations. */
interface FtsPreparedStatements {
  // deno-lint-ignore no-explicit-any
  readonly deleteFts: any;
  // deno-lint-ignore no-explicit-any
  readonly insertFts: any;
  // deno-lint-ignore no-explicit-any
  readonly upsertMeta: any;
  // deno-lint-ignore no-explicit-any
  readonly deleteMeta: any;
  // deno-lint-ignore no-explicit-any
  readonly search: any;
}

/** Initialise FTS5 tables and prepare all statements. */
function initialiseFtsTables(
  // deno-lint-ignore no-explicit-any
  database: any,
): FtsPreparedStatements {
  database.exec(CREATE_FTS_TABLE);
  database.exec(CREATE_META_TABLE);

  return {
    deleteFts: database.prepare(SQL_DELETE_FTS),
    insertFts: database.prepare(SQL_INSERT_FTS),
    upsertMeta: database.prepare(SQL_UPSERT_META),
    deleteMeta: database.prepare(SQL_DELETE_META),
    search: database.prepare(SQL_SEARCH),
  };
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
  const stmts = initialiseFtsTables(db as any);

  return {
    // deno-lint-ignore require-await
    async index(record: MemoryRecord): Promise<void> {
      indexFtsRecord(record, stmts);
    },

    // deno-lint-ignore require-await
    async remove(
      agentId: string,
      classification: ClassificationLevel,
      key: string,
    ): Promise<void> {
      removeFtsRecord(agentId, classification, key, stmts);
    },

    // deno-lint-ignore require-await
    async search(
      options: MemorySearchOptions,
    ): Promise<readonly MemorySearchResult[]> {
      const { agentId, query, sessionTaint, maxResults = 20 } = options;
      const fetchLimit = maxResults * 4;
      const rows = stmts.search.all(
        query,
        agentId,
        fetchLimit,
      ) as FtsSearchRow[];
      const visible = filterFtsRows(rows, sessionTaint);
      return applyShadowingToResults(visible, maxResults);
    },

    // deno-lint-ignore require-await
    async close(): Promise<void> {
      stmts.deleteFts.finalize();
      stmts.insertFts.finalize();
      stmts.upsertMeta.finalize();
      stmts.deleteMeta.finalize();
      stmts.search.finalize();
    },
  };
}
