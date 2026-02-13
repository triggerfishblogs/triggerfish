/**
 * SQLite-backed StorageProvider implementation.
 *
 * Uses `@db/sqlite` for native SQLite access via FFI. Data persists across
 * process restarts. WAL mode is enabled for concurrent read performance.
 *
 * Default location: `~/.triggerfish/data/triggerfish.db`
 *
 * @module
 */

import { Database } from "@db/sqlite";
import type { StorageProvider } from "./provider.ts";

/** Row shape returned by SELECT value queries. */
interface ValueRow {
  readonly value: string;
}

/** Row shape returned by SELECT key queries. */
interface KeyRow {
  readonly key: string;
}

/**
 * Create a SQLite-backed StorageProvider.
 *
 * Opens (or creates) a SQLite database at `dbPath`, initialises the schema
 * if it does not exist, and returns a `StorageProvider`.
 */
export function createSqliteStorage(dbPath: string): StorageProvider {
  const db = new Database(dbPath);

  // Enable WAL mode for better concurrent read performance
  db.exec("PRAGMA journal_mode=WAL");

  // Create key-value table if it doesn't exist
  db.exec(`
    CREATE TABLE IF NOT EXISTS kv (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `);

  const stmtSet = db.prepare(
    "INSERT OR REPLACE INTO kv (key, value) VALUES (?, ?)",
  );
  const stmtGet = db.prepare("SELECT value FROM kv WHERE key = ?");
  const stmtDel = db.prepare("DELETE FROM kv WHERE key = ?");
  const stmtListAll = db.prepare("SELECT key FROM kv");
  const stmtListPrefix = db.prepare(
    "SELECT key FROM kv WHERE key LIKE ? || '%'",
  );

  return {
    // deno-lint-ignore require-await
    async set(key: string, value: string): Promise<void> {
      stmtSet.run(key, value);
    },

    // deno-lint-ignore require-await
    async get(key: string): Promise<string | null> {
      const row = stmtGet.get<ValueRow>(key);
      return row ? row.value : null;
    },

    // deno-lint-ignore require-await
    async delete(key: string): Promise<void> {
      stmtDel.run(key);
    },

    // deno-lint-ignore require-await
    async list(prefix?: string): Promise<string[]> {
      if (prefix === undefined) {
        const rows = stmtListAll.all<KeyRow>();
        return rows.map((r) => r.key);
      }
      const rows = stmtListPrefix.all<KeyRow>(prefix);
      return rows.map((r) => r.key);
    },

    // deno-lint-ignore require-await
    async close(): Promise<void> {
      stmtSet.finalize();
      stmtGet.finalize();
      stmtDel.finalize();
      stmtListAll.finalize();
      stmtListPrefix.finalize();
      db.close();
    },
  };
}
