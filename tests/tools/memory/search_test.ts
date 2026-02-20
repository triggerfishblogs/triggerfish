/**
 * Memory search provider tests — FTS5 and in-memory backends.
 *
 * FTS5 tests use a temporary SQLite DB file that is cleaned up after each test.
 * In-memory tests verify the same interface contract with the array-backed fallback.
 *
 * @module
 */

import { assertEquals } from "@std/assert";
import { Database } from "@db/sqlite";
import {
  createFts5SearchProvider,
  createInMemorySearchProvider,
} from "../../../src/tools/memory/search.ts";
import type { MemoryRecord } from "../../../src/tools/memory/types.ts";
import type { SessionId } from "../../../src/core/types/session.ts";

const SESSION = "search-test" as SessionId;
const AGENT = "search-agent";

function makeRecord(
  key: string,
  content: string,
  classification: "PUBLIC" | "INTERNAL" | "CONFIDENTIAL" | "RESTRICTED" = "PUBLIC",
  tags: string[] = [],
): MemoryRecord {
  return {
    key,
    agentId: AGENT,
    classification,
    content,
    tags,
    createdAt: new Date(),
    updatedAt: new Date(),
    expired: false,
    sourceSessionId: SESSION,
  };
}

// ─── FTS5 Provider Tests ─────────────────────────────────────────────────

function createTempDb(): { db: Database; path: string } {
  const path = Deno.makeTempFileSync({ suffix: ".db" });
  const db = new Database(path);
  db.exec("PRAGMA journal_mode=WAL");
  return { db, path };
}

function cleanupDb(db: Database, path: string): void {
  db.close();
  try {
    Deno.removeSync(path);
    Deno.removeSync(path + "-wal");
    Deno.removeSync(path + "-shm");
  } catch {
    // files may not exist
  }
}

Deno.test("FTS5 — index/search round-trip", async () => {
  const { db, path } = createTempDb();
  const provider = createFts5SearchProvider(db);

  await provider.index(makeRecord("greeting", "Hello world, this is a test"));

  const results = await provider.search({
    agentId: AGENT,
    query: "hello",
    sessionTaint: "PUBLIC",
  });

  assertEquals(results.length, 1);
  assertEquals(results[0].record.key, "greeting");
  assertEquals(results[0].record.content, "Hello world, this is a test");

  await provider.close();
  await cleanupDb(db, path);
});

Deno.test("FTS5 — classification gating on search results", async () => {
  const { db, path } = createTempDb();
  const provider = createFts5SearchProvider(db);

  await provider.index(makeRecord("pub", "Public data about cats", "PUBLIC"));
  await provider.index(makeRecord("conf", "Confidential data about cats", "CONFIDENTIAL"));

  // PUBLIC session should only see PUBLIC results
  const pubResults = await provider.search({
    agentId: AGENT,
    query: "cats",
    sessionTaint: "PUBLIC",
  });

  assertEquals(pubResults.length, 1);
  assertEquals(pubResults[0].record.classification, "PUBLIC");

  // CONFIDENTIAL session sees both
  const confResults = await provider.search({
    agentId: AGENT,
    query: "cats",
    sessionTaint: "CONFIDENTIAL",
  });

  assertEquals(confResults.length, 2);

  await provider.close();
  await cleanupDb(db, path);
});

Deno.test("FTS5 — shadowing in search results", async () => {
  const { db, path } = createTempDb();
  const provider = createFts5SearchProvider(db);

  // Same key at two levels
  await provider.index(makeRecord("pet", "I have a public cat", "PUBLIC"));
  await provider.index(makeRecord("pet", "I have a confidential cat", "CONFIDENTIAL"));

  // CONFIDENTIAL session sees only the CONFIDENTIAL version (shadowing)
  const results = await provider.search({
    agentId: AGENT,
    query: "cat",
    sessionTaint: "CONFIDENTIAL",
  });

  assertEquals(results.length, 1);
  assertEquals(results[0].record.classification, "CONFIDENTIAL");

  await provider.close();
  await cleanupDb(db, path);
});

Deno.test("FTS5 — maxResults limiting", async () => {
  const { db, path } = createTempDb();
  const provider = createFts5SearchProvider(db);

  for (let i = 0; i < 10; i++) {
    await provider.index(makeRecord(`item-${i}`, `Searchable item number ${i}`));
  }

  const results = await provider.search({
    agentId: AGENT,
    query: "searchable",
    sessionTaint: "PUBLIC",
    maxResults: 3,
  });

  assertEquals(results.length, 3);

  await provider.close();
  await cleanupDb(db, path);
});

Deno.test("FTS5 — remove excludes from future searches", async () => {
  const { db, path } = createTempDb();
  const provider = createFts5SearchProvider(db);

  await provider.index(makeRecord("removable", "This will be removed"));

  // Verify it's searchable
  let results = await provider.search({
    agentId: AGENT,
    query: "removed",
    sessionTaint: "PUBLIC",
  });
  assertEquals(results.length, 1);

  // Remove it
  await provider.remove(AGENT, "PUBLIC", "removable");

  // No longer searchable
  results = await provider.search({
    agentId: AGENT,
    query: "removed",
    sessionTaint: "PUBLIC",
  });
  assertEquals(results.length, 0);

  await provider.close();
  await cleanupDb(db, path);
});

Deno.test("FTS5 — porter stemming works", async () => {
  const { db, path } = createTempDb();
  const provider = createFts5SearchProvider(db);

  await provider.index(makeRecord("stemming", "The dogs are running quickly"));

  // Searching for "run" should match "running" via porter stemming
  const results = await provider.search({
    agentId: AGENT,
    query: "run",
    sessionTaint: "PUBLIC",
  });

  assertEquals(results.length, 1);
  assertEquals(results[0].record.key, "stemming");

  await provider.close();
  await cleanupDb(db, path);
});

Deno.test("FTS5 — empty results for no matches", async () => {
  const { db, path } = createTempDb();
  const provider = createFts5SearchProvider(db);

  await provider.index(makeRecord("data", "Some specific content"));

  const results = await provider.search({
    agentId: AGENT,
    query: "nonexistent",
    sessionTaint: "PUBLIC",
  });

  assertEquals(results.length, 0);

  await provider.close();
  await cleanupDb(db, path);
});

Deno.test("FTS5 — close releases resources", async () => {
  const { db, path } = createTempDb();
  const provider = createFts5SearchProvider(db);

  await provider.index(makeRecord("test", "Test data"));
  await provider.close();

  // After close, the db should still be closeable without error
  await cleanupDb(db, path);
});

// ─── In-Memory Provider Tests ────────────────────────────────────────────

Deno.test("InMemory — index/search round-trip", async () => {
  const provider = createInMemorySearchProvider();

  await provider.index(makeRecord("greeting", "Hello world"));

  const results = await provider.search({
    agentId: AGENT,
    query: "hello",
    sessionTaint: "PUBLIC",
  });

  assertEquals(results.length, 1);
  assertEquals(results[0].record.key, "greeting");

  await provider.close();
});

Deno.test("InMemory — classification gating", async () => {
  const provider = createInMemorySearchProvider();

  await provider.index(makeRecord("pub", "cats are great", "PUBLIC"));
  await provider.index(makeRecord("conf", "cats are confidential", "CONFIDENTIAL"));

  const pubResults = await provider.search({
    agentId: AGENT,
    query: "cats",
    sessionTaint: "PUBLIC",
  });

  assertEquals(pubResults.length, 1);
  assertEquals(pubResults[0].record.classification, "PUBLIC");

  await provider.close();
});

Deno.test("InMemory — shadowing in search", async () => {
  const provider = createInMemorySearchProvider();

  await provider.index(makeRecord("key", "cats public", "PUBLIC"));
  await provider.index(makeRecord("key", "cats confidential", "CONFIDENTIAL"));

  const results = await provider.search({
    agentId: AGENT,
    query: "cats",
    sessionTaint: "CONFIDENTIAL",
  });

  assertEquals(results.length, 1);
  assertEquals(results[0].record.classification, "CONFIDENTIAL");

  await provider.close();
});

Deno.test("InMemory — remove excludes from search", async () => {
  const provider = createInMemorySearchProvider();

  await provider.index(makeRecord("removable", "Find this text"));

  await provider.remove(AGENT, "PUBLIC", "removable");

  const results = await provider.search({
    agentId: AGENT,
    query: "find",
    sessionTaint: "PUBLIC",
  });

  assertEquals(results.length, 0);

  await provider.close();
});

Deno.test("InMemory — upsert replaces existing entry", async () => {
  const provider = createInMemorySearchProvider();

  await provider.index(makeRecord("update", "Original content"));
  await provider.index(makeRecord("update", "Updated content"));

  const results = await provider.search({
    agentId: AGENT,
    query: "content",
    sessionTaint: "PUBLIC",
  });

  assertEquals(results.length, 1);
  assertEquals(results[0].record.content, "Updated content");

  await provider.close();
});
