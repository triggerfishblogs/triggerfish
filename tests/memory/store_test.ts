/**
 * MemoryStore CRUD tests using in-memory storage.
 *
 * @module
 */

import { assertEquals, assertNotEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { createMemoryStorage } from "../../src/core/storage/memory.ts";
import { createMemoryStore } from "../../src/memory/store.ts";
import { createInMemorySearchProvider } from "../../src/memory/search.ts";
import type { SessionId } from "../../src/core/types/session.ts";

const SESSION_ID = "test-session-1" as SessionId;
const AGENT_ID = "agent-1";

Deno.test("MemoryStore — save creates record with correct fields", async () => {
  const storage = createMemoryStorage();
  const search = createInMemorySearchProvider();
  const store = createMemoryStore({ storage, searchProvider: search });

  const result = await store.save({
    key: "user-name",
    agentId: AGENT_ID,
    sessionTaint: "CONFIDENTIAL",
    content: "The user's name is Alice",
    tags: ["personal", "name"],
    sourceSessionId: SESSION_ID,
  });

  assertEquals(result.ok, true);
  if (!result.ok) return;

  const record = result.value;
  assertEquals(record.key, "user-name");
  assertEquals(record.agentId, AGENT_ID);
  assertEquals(record.classification, "CONFIDENTIAL"); // forced to sessionTaint
  assertEquals(record.content, "The user's name is Alice");
  assertEquals(record.tags, ["personal", "name"]);
  assertEquals(record.expired, false);
  assertEquals(record.sourceSessionId, SESSION_ID);
  assertNotEquals(record.createdAt, undefined);
  assertNotEquals(record.updatedAt, undefined);

  await storage.close();
  await search.close();
});

Deno.test("MemoryStore — save forces classification to sessionTaint", async () => {
  const storage = createMemoryStorage();
  const store = createMemoryStore({ storage });

  // Even though we don't pass a classification, it should use sessionTaint
  const result = await store.save({
    key: "secret",
    agentId: AGENT_ID,
    sessionTaint: "RESTRICTED",
    content: "Top secret data",
    sourceSessionId: SESSION_ID,
  });

  assertEquals(result.ok, true);
  if (!result.ok) return;
  assertEquals(result.value.classification, "RESTRICTED");

  await storage.close();
});

Deno.test("MemoryStore — get returns record at own level", async () => {
  const storage = createMemoryStorage();
  const store = createMemoryStore({ storage });

  await store.save({
    key: "fact",
    agentId: AGENT_ID,
    sessionTaint: "INTERNAL",
    content: "Some internal fact",
    sourceSessionId: SESSION_ID,
  });

  const record = await store.get({
    key: "fact",
    agentId: AGENT_ID,
    sessionTaint: "INTERNAL",
  });

  assertNotEquals(record, null);
  assertEquals(record!.key, "fact");
  assertEquals(record!.content, "Some internal fact");
  assertEquals(record!.classification, "INTERNAL");

  await storage.close();
});

Deno.test("MemoryStore — get returns null when record is above taint", async () => {
  const storage = createMemoryStorage();
  const store = createMemoryStore({ storage });

  await store.save({
    key: "secret",
    agentId: AGENT_ID,
    sessionTaint: "CONFIDENTIAL",
    content: "Confidential data",
    sourceSessionId: SESSION_ID,
  });

  // PUBLIC session cannot see CONFIDENTIAL data
  const record = await store.get({
    key: "secret",
    agentId: AGENT_ID,
    sessionTaint: "PUBLIC",
  });

  assertEquals(record, null);

  await storage.close();
});

Deno.test("MemoryStore — get implements shadowing (returns highest visible)", async () => {
  const storage = createMemoryStorage();
  const store = createMemoryStore({ storage });

  // Save at PUBLIC level
  await store.save({
    key: "preference",
    agentId: AGENT_ID,
    sessionTaint: "PUBLIC",
    content: "Public preference value",
    sourceSessionId: SESSION_ID,
  });

  // Save at CONFIDENTIAL level (same key)
  await store.save({
    key: "preference",
    agentId: AGENT_ID,
    sessionTaint: "CONFIDENTIAL",
    content: "Confidential preference value",
    sourceSessionId: SESSION_ID,
  });

  // CONFIDENTIAL session sees the CONFIDENTIAL version (shadowing)
  const confRecord = await store.get({
    key: "preference",
    agentId: AGENT_ID,
    sessionTaint: "CONFIDENTIAL",
  });
  assertNotEquals(confRecord, null);
  assertEquals(confRecord!.classification, "CONFIDENTIAL");
  assertEquals(confRecord!.content, "Confidential preference value");

  // PUBLIC session sees the PUBLIC version
  const pubRecord = await store.get({
    key: "preference",
    agentId: AGENT_ID,
    sessionTaint: "PUBLIC",
  });
  assertNotEquals(pubRecord, null);
  assertEquals(pubRecord!.classification, "PUBLIC");
  assertEquals(pubRecord!.content, "Public preference value");

  await storage.close();
});

Deno.test("MemoryStore — list returns visible records", async () => {
  const storage = createMemoryStorage();
  const store = createMemoryStore({ storage });

  await store.save({
    key: "a",
    agentId: AGENT_ID,
    sessionTaint: "PUBLIC",
    content: "Public A",
    sourceSessionId: SESSION_ID,
  });
  await store.save({
    key: "b",
    agentId: AGENT_ID,
    sessionTaint: "INTERNAL",
    content: "Internal B",
    sourceSessionId: SESSION_ID,
  });
  await store.save({
    key: "c",
    agentId: AGENT_ID,
    sessionTaint: "CONFIDENTIAL",
    content: "Confidential C",
    sourceSessionId: SESSION_ID,
  });

  // INTERNAL session sees PUBLIC + INTERNAL but not CONFIDENTIAL
  const records = await store.list({
    agentId: AGENT_ID,
    sessionTaint: "INTERNAL",
  });
  const keys = records.map((r) => r.key).sort();
  assertEquals(keys, ["a", "b"]);

  await storage.close();
});

Deno.test("MemoryStore — list filters by tag", async () => {
  const storage = createMemoryStorage();
  const store = createMemoryStore({ storage });

  await store.save({
    key: "tagged",
    agentId: AGENT_ID,
    sessionTaint: "PUBLIC",
    content: "Tagged record",
    tags: ["important"],
    sourceSessionId: SESSION_ID,
  });
  await store.save({
    key: "untagged",
    agentId: AGENT_ID,
    sessionTaint: "PUBLIC",
    content: "Untagged record",
    sourceSessionId: SESSION_ID,
  });

  const records = await store.list({
    agentId: AGENT_ID,
    sessionTaint: "PUBLIC",
    tag: "important",
  });

  assertEquals(records.length, 1);
  assertEquals(records[0].key, "tagged");

  await storage.close();
});

Deno.test("MemoryStore — list excludes expired records", async () => {
  const storage = createMemoryStorage();
  const store = createMemoryStore({ storage });

  await store.save({
    key: "alive",
    agentId: AGENT_ID,
    sessionTaint: "PUBLIC",
    content: "Still active",
    sourceSessionId: SESSION_ID,
  });
  await store.save({
    key: "dead",
    agentId: AGENT_ID,
    sessionTaint: "PUBLIC",
    content: "Will be deleted",
    sourceSessionId: SESSION_ID,
  });

  // Soft-delete "dead"
  await store.delete({
    key: "dead",
    agentId: AGENT_ID,
    sessionTaint: "PUBLIC",
    sourceSessionId: SESSION_ID,
  });

  const records = await store.list({
    agentId: AGENT_ID,
    sessionTaint: "PUBLIC",
  });

  assertEquals(records.length, 1);
  assertEquals(records[0].key, "alive");

  await storage.close();
});

Deno.test("MemoryStore — delete soft-deletes at own level", async () => {
  const storage = createMemoryStorage();
  const store = createMemoryStore({ storage });

  await store.save({
    key: "to-delete",
    agentId: AGENT_ID,
    sessionTaint: "INTERNAL",
    content: "Delete me",
    sourceSessionId: SESSION_ID,
  });

  const result = await store.delete({
    key: "to-delete",
    agentId: AGENT_ID,
    sessionTaint: "INTERNAL",
    sourceSessionId: SESSION_ID,
  });

  assertEquals(result.ok, true);

  // Should not appear in get
  const record = await store.get({
    key: "to-delete",
    agentId: AGENT_ID,
    sessionTaint: "INTERNAL",
  });
  assertEquals(record, null);

  // But raw storage still has the data (soft-delete)
  const keys = await storage.list("memory:agent-1:INTERNAL:to-delete");
  assertEquals(keys.length, 1);

  await storage.close();
});

Deno.test("MemoryStore — delete fails for non-existent record", async () => {
  const storage = createMemoryStorage();
  const store = createMemoryStore({ storage });

  const result = await store.delete({
    key: "nonexistent",
    agentId: AGENT_ID,
    sessionTaint: "PUBLIC",
    sourceSessionId: SESSION_ID,
  });

  assertEquals(result.ok, false);
  if (result.ok) return;
  assertEquals(result.error.code, "NOT_FOUND");

  await storage.close();
});

Deno.test("MemoryStore — overwrite replaces record at same level", async () => {
  const storage = createMemoryStorage();
  const store = createMemoryStore({ storage });

  await store.save({
    key: "mutable",
    agentId: AGENT_ID,
    sessionTaint: "PUBLIC",
    content: "Original value",
    sourceSessionId: SESSION_ID,
  });

  await store.save({
    key: "mutable",
    agentId: AGENT_ID,
    sessionTaint: "PUBLIC",
    content: "Updated value",
    sourceSessionId: SESSION_ID,
  });

  const record = await store.get({
    key: "mutable",
    agentId: AGENT_ID,
    sessionTaint: "PUBLIC",
  });

  assertNotEquals(record, null);
  assertEquals(record!.content, "Updated value");

  await storage.close();
});

Deno.test("MemoryStore — overwrite preserves createdAt", async () => {
  const storage = createMemoryStorage();
  const store = createMemoryStore({ storage });

  const result1 = await store.save({
    key: "preserve-dates",
    agentId: AGENT_ID,
    sessionTaint: "PUBLIC",
    content: "First",
    sourceSessionId: SESSION_ID,
  });
  if (!result1.ok) return;
  const originalCreatedAt = result1.value.createdAt;

  // Small delay to ensure different timestamps
  await new Promise((r) => setTimeout(r, 10));

  const result2 = await store.save({
    key: "preserve-dates",
    agentId: AGENT_ID,
    sessionTaint: "PUBLIC",
    content: "Second",
    sourceSessionId: SESSION_ID,
  });
  if (!result2.ok) return;

  assertEquals(result2.value.createdAt.getTime(), originalCreatedAt.getTime());
  assertNotEquals(result2.value.updatedAt.getTime(), originalCreatedAt.getTime());

  await storage.close();
});

Deno.test("MemoryStore — purge hard-deletes expired records before cutoff", async () => {
  const storage = createMemoryStorage();
  const store = createMemoryStore({ storage });

  await store.save({
    key: "old-expired",
    agentId: AGENT_ID,
    sessionTaint: "PUBLIC",
    content: "Will be purged",
    sourceSessionId: SESSION_ID,
  });

  // Soft-delete it
  await store.delete({
    key: "old-expired",
    agentId: AGENT_ID,
    sessionTaint: "PUBLIC",
    sourceSessionId: SESSION_ID,
  });

  // Purge with a future cutoff
  const futureDate = new Date(Date.now() + 100_000);
  const purged = await store.purge({
    agentId: AGENT_ID,
    before: futureDate,
  });

  assertEquals(purged, 1);

  // Raw storage should be empty now
  const keys = await storage.list("memory:agent-1:");
  assertEquals(keys.length, 0);

  await storage.close();
});

Deno.test("MemoryStore — works without search provider", async () => {
  const storage = createMemoryStorage();
  const store = createMemoryStore({ storage }); // no searchProvider

  const result = await store.save({
    key: "no-search",
    agentId: AGENT_ID,
    sessionTaint: "PUBLIC",
    content: "Works fine without search",
    sourceSessionId: SESSION_ID,
  });

  assertEquals(result.ok, true);

  const record = await store.get({
    key: "no-search",
    agentId: AGENT_ID,
    sessionTaint: "PUBLIC",
  });
  assertNotEquals(record, null);
  assertEquals(record!.content, "Works fine without search");

  await storage.close();
});
