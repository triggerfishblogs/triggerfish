/**
 * Phase 5: Data Lineage
 * Tests MUST FAIL until lineage.ts is implemented.
 * Tests record creation, forward/backward trace, export.
 */
import { assert, assertEquals, assertExists } from "@std/assert";
import { createLineageStore } from "../../src/core/session/lineage.ts";
import { createMemoryStorage } from "../../src/core/storage/memory.ts";
import type { StorageProvider } from "../../src/core/storage/provider.ts";
import type { SessionId } from "../../src/core/types/session.ts";

function makeStore() {
  const storage = createMemoryStorage();
  return createLineageStore(storage);
}

/** Create a store and return both store and underlying storage for index inspection. */
function makeStoreWithStorage(): {
  store: ReturnType<typeof createLineageStore>;
  storage: StorageProvider;
} {
  const storage = createMemoryStorage();
  return { store: createLineageStore(storage), storage };
}

/** Build an ISO date string N days before a reference date. */
function daysAgo(days: number, from: Date = new Date()): string {
  return new Date(from.getTime() - days * 24 * 60 * 60 * 1000).toISOString();
}

Deno.test("LineageStore: create returns record with lineage_id and content_hash", async () => {
  const store = await makeStore();
  const record = await store.create({
    content: "test data",
    origin: {
      source_type: "integration",
      source_name: "crm",
      accessed_at: new Date().toISOString(),
      accessed_by: "agent-1",
      access_method: "api",
    },
    classification: { level: "CONFIDENTIAL", reason: "CRM data" },
    sessionId: "sess-1" as SessionId,
  });
  assertExists(record.lineage_id);
  assertExists(record.content_hash);
  assertEquals(record.classification.level, "CONFIDENTIAL");
});

Deno.test("LineageStore: get retrieves by lineage_id", async () => {
  const store = await makeStore();
  const created = await store.create({
    content: "data",
    origin: {
      source_type: "integration",
      source_name: "test",
      accessed_at: new Date().toISOString(),
      accessed_by: "agent",
      access_method: "api",
    },
    classification: { level: "PUBLIC", reason: "test" },
    sessionId: "s" as SessionId,
  });
  const fetched = await store.get(created.lineage_id);
  assertExists(fetched);
  assertEquals(fetched!.lineage_id, created.lineage_id);
});

Deno.test("LineageStore: getBySession returns records for session", async () => {
  const store = await makeStore();
  const sid = "session-abc" as SessionId;
  await store.create({
    content: "a",
    origin: {
      source_type: "x",
      source_name: "y",
      accessed_at: "",
      accessed_by: "",
      access_method: "",
    },
    classification: { level: "PUBLIC", reason: "" },
    sessionId: sid,
  });
  await store.create({
    content: "b",
    origin: {
      source_type: "x",
      source_name: "y",
      accessed_at: "",
      accessed_by: "",
      access_method: "",
    },
    classification: { level: "INTERNAL", reason: "" },
    sessionId: sid,
  });
  await store.create({
    content: "c",
    origin: {
      source_type: "x",
      source_name: "y",
      accessed_at: "",
      accessed_by: "",
      access_method: "",
    },
    classification: { level: "PUBLIC", reason: "" },
    sessionId: "other-session" as SessionId,
  });
  const records = await store.getBySession(sid);
  assertEquals(records.length, 2);
});

Deno.test("LineageStore: trace_forward shows what happened to data", async () => {
  const store = await makeStore();
  const original = await store.create({
    content: "raw data",
    origin: {
      source_type: "api",
      source_name: "crm",
      accessed_at: "",
      accessed_by: "",
      access_method: "",
    },
    classification: { level: "CONFIDENTIAL", reason: "crm" },
    sessionId: "s" as SessionId,
  });
  const derived = await store.create({
    content: "summarized",
    origin: {
      source_type: "llm",
      source_name: "claude",
      accessed_at: "",
      accessed_by: "",
      access_method: "",
    },
    classification: { level: "CONFIDENTIAL", reason: "derived from crm" },
    sessionId: "s" as SessionId,
    inputLineageIds: [original.lineage_id],
  });
  const forward = await store.trace_forward(original.lineage_id);
  assert(forward.length >= 1);
  assert(forward.some((r) => r.lineage_id === derived.lineage_id));
});

Deno.test("LineageStore: trace_backward shows sources", async () => {
  const store = await makeStore();
  const source1 = await store.create({
    content: "source a",
    origin: {
      source_type: "api",
      source_name: "a",
      accessed_at: "",
      accessed_by: "",
      access_method: "",
    },
    classification: { level: "INTERNAL", reason: "" },
    sessionId: "s" as SessionId,
  });
  const source2 = await store.create({
    content: "source b",
    origin: {
      source_type: "api",
      source_name: "b",
      accessed_at: "",
      accessed_by: "",
      access_method: "",
    },
    classification: { level: "CONFIDENTIAL", reason: "" },
    sessionId: "s" as SessionId,
  });
  const merged = await store.create({
    content: "combined",
    origin: {
      source_type: "llm",
      source_name: "claude",
      accessed_at: "",
      accessed_by: "",
      access_method: "",
    },
    classification: { level: "CONFIDENTIAL", reason: "max of inputs" },
    sessionId: "s" as SessionId,
    inputLineageIds: [source1.lineage_id, source2.lineage_id],
  });
  const backward = await store.trace_backward(merged.lineage_id);
  assertEquals(backward.length, 2);
});

Deno.test("LineageStore: export produces full chain for session", async () => {
  const store = await makeStore();
  const sid = "export-session" as SessionId;
  await store.create({
    content: "record 1",
    origin: {
      source_type: "x",
      source_name: "y",
      accessed_at: "",
      accessed_by: "",
      access_method: "",
    },
    classification: { level: "PUBLIC", reason: "" },
    sessionId: sid,
  });
  const exported = await store.export(sid);
  assert(exported.length >= 1);
  assertExists(exported[0].lineage_id);
  assertExists(exported[0].content_hash);
});

// ─── Phase 2: Enhanced lineage tests ─────────────────────────────────────────

Deno.test("LineageStore: content stored only for PUBLIC classification", async () => {
  const store = await makeStore();
  const publicRecord = await store.create({
    content: "public data",
    origin: {
      source_type: "web",
      source_name: "example.com",
      accessed_at: new Date().toISOString(),
      accessed_by: "agent",
      access_method: "fetch",
    },
    classification: { level: "PUBLIC", reason: "public web data" },
    sessionId: "s" as SessionId,
  });
  const confidentialRecord = await store.create({
    content: "secret data",
    origin: {
      source_type: "api",
      source_name: "crm",
      accessed_at: new Date().toISOString(),
      accessed_by: "agent",
      access_method: "api",
    },
    classification: { level: "CONFIDENTIAL", reason: "CRM data" },
    sessionId: "s" as SessionId,
  });

  assertEquals(publicRecord.content, "public data");
  assertEquals(confidentialRecord.content, undefined);

  // Verify persistence
  const fetchedPublic = await store.get(publicRecord.lineage_id);
  const fetchedConfidential = await store.get(confidentialRecord.lineage_id);
  assertEquals(fetchedPublic?.content, "public data");
  assertEquals(fetchedConfidential?.content, undefined);
});

Deno.test("LineageStore: getByHash returns content for PUBLIC with matching taint", async () => {
  const store = await makeStore();
  const record = await store.create({
    content: "shared public content",
    origin: {
      source_type: "web",
      source_name: "example.com",
      accessed_at: new Date().toISOString(),
      accessed_by: "agent",
      access_method: "fetch",
    },
    classification: { level: "PUBLIC", reason: "public" },
    sessionId: "s" as SessionId,
  });

  const result = await store.getByHash(record.content_hash, "PUBLIC");
  assertExists(result);
  assertEquals(result!.content, "shared public content");
  assertEquals(result!.record.lineage_id, record.lineage_id);
});

Deno.test("LineageStore: getByHash enforces canFlowTo — RESTRICTED cannot read PUBLIC content via lower taint", async () => {
  const store = await makeStore();
  // Create a CONFIDENTIAL record (content not stored)
  const record = await store.create({
    content: "classified data",
    origin: {
      source_type: "api",
      source_name: "crm",
      accessed_at: new Date().toISOString(),
      accessed_by: "agent",
      access_method: "api",
    },
    classification: { level: "CONFIDENTIAL", reason: "CRM" },
    sessionId: "s" as SessionId,
  });

  // PUBLIC taint cannot read CONFIDENTIAL records
  const result = await store.getByHash(record.content_hash, "PUBLIC");
  assertEquals(result, null);
});

Deno.test("LineageStore: getByHash returns null for non-existent hash", async () => {
  const store = await makeStore();
  const result = await store.getByHash("nonexistent", "PUBLIC");
  assertEquals(result, null);
});

Deno.test("LineageStore: trace_forward_indexed uses reverse index", async () => {
  const store = await makeStore();
  const parent = await store.create({
    content: "parent data",
    origin: {
      source_type: "api",
      source_name: "source",
      accessed_at: "",
      accessed_by: "",
      access_method: "",
    },
    classification: { level: "PUBLIC", reason: "" },
    sessionId: "s" as SessionId,
  });
  const child1 = await store.create({
    content: "child 1",
    origin: {
      source_type: "llm",
      source_name: "claude",
      accessed_at: "",
      accessed_by: "",
      access_method: "",
    },
    classification: { level: "PUBLIC", reason: "" },
    sessionId: "s" as SessionId,
    inputLineageIds: [parent.lineage_id],
  });
  const child2 = await store.create({
    content: "child 2",
    origin: {
      source_type: "llm",
      source_name: "claude",
      accessed_at: "",
      accessed_by: "",
      access_method: "",
    },
    classification: { level: "INTERNAL", reason: "" },
    sessionId: "s" as SessionId,
    inputLineageIds: [parent.lineage_id],
  });

  const forward = await store.trace_forward_indexed(parent.lineage_id);
  assertEquals(forward.length, 2);
  const ids = forward.map((r) => r.lineage_id).sort();
  const expected = [child1.lineage_id, child2.lineage_id].sort();
  assertEquals(ids, expected);
});

Deno.test("LineageStore: hash index enables O(1) lookup", async () => {
  const store = await makeStore();
  const record = await store.create({
    content: "indexed content",
    origin: {
      source_type: "web",
      source_name: "example.com",
      accessed_at: new Date().toISOString(),
      accessed_by: "agent",
      access_method: "fetch",
    },
    classification: { level: "PUBLIC", reason: "public" },
    sessionId: "s" as SessionId,
  });

  // Can look up by hash with sufficient taint
  const result = await store.getByHash(record.content_hash, "RESTRICTED");
  assertExists(result);
  assertEquals(result!.record.lineage_id, record.lineage_id);
});

// ─── Lineage retention tests ─────────────────────────────────────────────────

Deno.test("applyLineageRetention: deletes records older than maxAgeDays", async () => {
  const { store } = makeStoreWithStorage();
  const now = new Date("2026-06-01T00:00:00Z");
  await store.create({
    content: "old data",
    origin: {
      source_type: "api",
      source_name: "crm",
      accessed_at: daysAgo(100, now),
      accessed_by: "agent",
      access_method: "api",
    },
    classification: { level: "PUBLIC", reason: "test" },
    sessionId: "s1" as SessionId,
  });
  await store.create({
    content: "recent data",
    origin: {
      source_type: "api",
      source_name: "crm",
      accessed_at: daysAgo(10, now),
      accessed_by: "agent",
      access_method: "api",
    },
    classification: { level: "PUBLIC", reason: "test" },
    sessionId: "s1" as SessionId,
  });

  const result = await store.applyLineageRetention({ maxAgeDays: 90 }, now);
  assert(result.ok);
  assertEquals(result.ok && result.value, 1);
});

Deno.test("applyLineageRetention: keeps records within maxAgeDays", async () => {
  const { store } = makeStoreWithStorage();
  const now = new Date("2026-06-01T00:00:00Z");
  const created = await store.create({
    content: "fresh data",
    origin: {
      source_type: "web",
      source_name: "example.com",
      accessed_at: daysAgo(30, now),
      accessed_by: "agent",
      access_method: "fetch",
    },
    classification: { level: "PUBLIC", reason: "test" },
    sessionId: "s1" as SessionId,
  });

  const result = await store.applyLineageRetention({ maxAgeDays: 90 }, now);
  assert(result.ok);
  assertEquals(result.ok && result.value, 0);

  const fetched = await store.get(created.lineage_id);
  assertExists(fetched);
});

Deno.test("applyLineageRetention: cleans up session index entries", async () => {
  const { store, storage } = makeStoreWithStorage();
  const now = new Date("2026-06-01T00:00:00Z");
  const sid = "sess-cleanup" as SessionId;
  await store.create({
    content: "stale",
    origin: {
      source_type: "api",
      source_name: "crm",
      accessed_at: daysAgo(100, now),
      accessed_by: "agent",
      access_method: "api",
    },
    classification: { level: "PUBLIC", reason: "test" },
    sessionId: sid,
  });

  await store.applyLineageRetention({ maxAgeDays: 90 }, now);

  const sessionKeys = await storage.list(`lineage-session:${sid}:`);
  assertEquals(sessionKeys.length, 0);
});

Deno.test("applyLineageRetention: cleans up hash index entries", async () => {
  const { store, storage } = makeStoreWithStorage();
  const now = new Date("2026-06-01T00:00:00Z");
  const record = await store.create({
    content: "hashable content",
    origin: {
      source_type: "api",
      source_name: "test",
      accessed_at: daysAgo(100, now),
      accessed_by: "agent",
      access_method: "api",
    },
    classification: { level: "PUBLIC", reason: "test" },
    sessionId: "s1" as SessionId,
  });

  await store.applyLineageRetention({ maxAgeDays: 90 }, now);

  const hashKey = `lineage-hash:${record.content_hash}`;
  const hashEntry = await storage.get(hashKey);
  assertEquals(hashEntry, null);
});

Deno.test("applyLineageRetention: cleans up forward-trace index entries", async () => {
  const { store, storage } = makeStoreWithStorage();
  const now = new Date("2026-06-01T00:00:00Z");
  const parent = await store.create({
    content: "parent",
    origin: {
      source_type: "api",
      source_name: "src",
      accessed_at: daysAgo(10, now),
      accessed_by: "agent",
      access_method: "api",
    },
    classification: { level: "PUBLIC", reason: "test" },
    sessionId: "s1" as SessionId,
  });
  await store.create({
    content: "expired child",
    origin: {
      source_type: "llm",
      source_name: "claude",
      accessed_at: daysAgo(100, now),
      accessed_by: "agent",
      access_method: "api",
    },
    classification: { level: "PUBLIC", reason: "derived" },
    sessionId: "s1" as SessionId,
    inputLineageIds: [parent.lineage_id],
  });

  await store.applyLineageRetention({ maxAgeDays: 90 }, now);

  const fwdKeys = await storage.list(`lineage-fwd:${parent.lineage_id}:`);
  assertEquals(fwdKeys.length, 0);
});

Deno.test("applyLineageRetention: skips records with invalid timestamps", async () => {
  const { store } = makeStoreWithStorage();
  const now = new Date("2026-06-01T00:00:00Z");
  const record = await store.create({
    content: "bad timestamp",
    origin: {
      source_type: "api",
      source_name: "test",
      accessed_at: "not-a-date",
      accessed_by: "agent",
      access_method: "api",
    },
    classification: { level: "PUBLIC", reason: "test" },
    sessionId: "s1" as SessionId,
  });

  const result = await store.applyLineageRetention({ maxAgeDays: 90 }, now);
  assert(result.ok);
  assertEquals(result.ok && result.value, 0);

  const fetched = await store.get(record.lineage_id);
  assertExists(fetched);
});
