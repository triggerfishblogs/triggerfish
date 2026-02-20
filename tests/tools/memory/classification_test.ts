/**
 * 10 critical classification boundary tests for the memory system.
 *
 * These are the most important tests in Phase A. They verify that the
 * classification gating invariant is never violated:
 * - Read down only (canFlowTo)
 * - Write forced to session taint
 * - Shadowing works correctly
 * - Agent isolation enforced
 *
 * @module
 */

import { assertEquals, assertNotEquals } from "@std/assert";
import { createMemoryStorage } from "../../../src/core/storage/memory.ts";
import { createMemoryStore } from "../../../src/tools/memory/store.ts";
import { createInMemorySearchProvider } from "../../../src/tools/memory/search.ts";
import type { SessionId } from "../../../src/core/types/session.ts";

const SESSION = "cls-test-session" as SessionId;
const AGENT = "cls-agent";

function makeStore() {
  const storage = createMemoryStorage();
  const search = createInMemorySearchProvider();
  const store = createMemoryStore({ storage, searchProvider: search });
  return { storage, search, store };
}

// --- Test 1: PUBLIC cannot read INTERNAL memory ---
Deno.test("Classification — PUBLIC cannot read INTERNAL memory", async () => {
  const { storage, search, store } = makeStore();

  await store.save({
    key: "internal-fact",
    agentId: AGENT,
    sessionTaint: "INTERNAL",
    content: "Internal only",
    sourceSessionId: SESSION,
  });

  const record = await store.get({
    key: "internal-fact",
    agentId: AGENT,
    sessionTaint: "PUBLIC",
  });

  assertEquals(record, null);

  await storage.close();
  await search.close();
});

// --- Test 2: CONFIDENTIAL CAN read PUBLIC memory ---
Deno.test("Classification — CONFIDENTIAL can read PUBLIC memory", async () => {
  const { storage, search, store } = makeStore();

  await store.save({
    key: "public-fact",
    agentId: AGENT,
    sessionTaint: "PUBLIC",
    content: "Public information",
    sourceSessionId: SESSION,
  });

  const record = await store.get({
    key: "public-fact",
    agentId: AGENT,
    sessionTaint: "CONFIDENTIAL",
  });

  assertNotEquals(record, null);
  assertEquals(record!.content, "Public information");
  assertEquals(record!.classification, "PUBLIC");

  await storage.close();
  await search.close();
});

// --- Test 3: CONFIDENTIAL save forces CONFIDENTIAL classification ---
Deno.test("Classification — CONFIDENTIAL save forces CONFIDENTIAL classification", async () => {
  const { storage, search, store } = makeStore();

  const result = await store.save({
    key: "forced-level",
    agentId: AGENT,
    sessionTaint: "CONFIDENTIAL",
    content: "Should be CONFIDENTIAL regardless",
    sourceSessionId: SESSION,
  });

  assertEquals(result.ok, true);
  if (!result.ok) return;

  // The classification MUST be CONFIDENTIAL — the LLM cannot choose
  assertEquals(result.value.classification, "CONFIDENTIAL");

  await storage.close();
  await search.close();
});

// --- Test 4: CONFIDENTIAL cannot delete PUBLIC memory ---
Deno.test("Classification — CONFIDENTIAL cannot delete PUBLIC memory", async () => {
  const { storage, search, store } = makeStore();

  // Save at PUBLIC level
  await store.save({
    key: "public-record",
    agentId: AGENT,
    sessionTaint: "PUBLIC",
    content: "Public record",
    sourceSessionId: SESSION,
  });

  // Try to delete from a CONFIDENTIAL session — can only delete at own level
  const result = await store.delete({
    key: "public-record",
    agentId: AGENT,
    sessionTaint: "CONFIDENTIAL",
    sourceSessionId: SESSION,
  });

  // Should fail because there's no CONFIDENTIAL version of this record
  assertEquals(result.ok, false);
  if (result.ok) return;
  assertEquals(result.error.code, "NOT_FOUND");

  // Verify the PUBLIC record still exists
  const record = await store.get({
    key: "public-record",
    agentId: AGENT,
    sessionTaint: "PUBLIC",
  });
  assertNotEquals(record, null);

  await storage.close();
  await search.close();
});

// --- Test 5: Shadowing — same key at PUBLIC + CONFIDENTIAL ---
Deno.test("Classification — Shadowing: PUBLIC session sees PUBLIC, CONFIDENTIAL sees CONFIDENTIAL", async () => {
  const { storage, search, store } = makeStore();

  await store.save({
    key: "shadowed",
    agentId: AGENT,
    sessionTaint: "PUBLIC",
    content: "Public version",
    sourceSessionId: SESSION,
  });

  await store.save({
    key: "shadowed",
    agentId: AGENT,
    sessionTaint: "CONFIDENTIAL",
    content: "Confidential version",
    sourceSessionId: SESSION,
  });

  // PUBLIC session sees PUBLIC version
  const pubRecord = await store.get({
    key: "shadowed",
    agentId: AGENT,
    sessionTaint: "PUBLIC",
  });
  assertNotEquals(pubRecord, null);
  assertEquals(pubRecord!.classification, "PUBLIC");
  assertEquals(pubRecord!.content, "Public version");

  // CONFIDENTIAL session sees CONFIDENTIAL version (shadows PUBLIC)
  const confRecord = await store.get({
    key: "shadowed",
    agentId: AGENT,
    sessionTaint: "CONFIDENTIAL",
  });
  assertNotEquals(confRecord, null);
  assertEquals(confRecord!.classification, "CONFIDENTIAL");
  assertEquals(confRecord!.content, "Confidential version");

  await storage.close();
  await search.close();
});

// --- Test 6: Returned records carry correct classification metadata ---
Deno.test("Classification — Returned records carry correct classification metadata", async () => {
  const { storage, search, store } = makeStore();

  await store.save({
    key: "meta-check",
    agentId: AGENT,
    sessionTaint: "INTERNAL",
    content: "Internal data",
    tags: ["metadata"],
    sourceSessionId: SESSION,
  });

  const record = await store.get({
    key: "meta-check",
    agentId: AGENT,
    sessionTaint: "INTERNAL",
  });

  assertNotEquals(record, null);
  assertEquals(record!.classification, "INTERNAL");
  assertEquals(record!.agentId, AGENT);
  assertEquals(record!.key, "meta-check");
  assertEquals(record!.tags, ["metadata"]);
  assertEquals(record!.expired, false);
  assertEquals(record!.sourceSessionId, SESSION);

  await storage.close();
  await search.close();
});

// --- Test 7: List returns records with classification for taint propagation ---
Deno.test("Classification — List returns records with classification for taint propagation", async () => {
  const { storage, search, store } = makeStore();

  await store.save({
    key: "pub-item",
    agentId: AGENT,
    sessionTaint: "PUBLIC",
    content: "Public",
    sourceSessionId: SESSION,
  });
  await store.save({
    key: "int-item",
    agentId: AGENT,
    sessionTaint: "INTERNAL",
    content: "Internal",
    sourceSessionId: SESSION,
  });

  // INTERNAL session sees both — each carries classification metadata
  const records = await store.list({
    agentId: AGENT,
    sessionTaint: "INTERNAL",
  });

  assertEquals(records.length, 2);
  const classifications = records.map((r) => r.classification).sort();
  assertEquals(classifications, ["INTERNAL", "PUBLIC"]);

  // Each record carries its own classification (not the session taint)
  for (const record of records) {
    assertNotEquals(record.classification, undefined);
    if (record.key === "pub-item") {
      assertEquals(record.classification, "PUBLIC");
    } else {
      assertEquals(record.classification, "INTERNAL");
    }
  }

  await storage.close();
  await search.close();
});

// --- Test 8: Agent isolation — agent-A's memories invisible to agent-B ---
Deno.test("Classification — Agent isolation: agent-A memories invisible to agent-B", async () => {
  const { storage, search, store } = makeStore();

  await store.save({
    key: "shared-key",
    agentId: "agent-A",
    sessionTaint: "PUBLIC",
    content: "Agent A data",
    sourceSessionId: SESSION,
  });

  await store.save({
    key: "shared-key",
    agentId: "agent-B",
    sessionTaint: "PUBLIC",
    content: "Agent B data",
    sourceSessionId: SESSION,
  });

  // Agent A sees only its own data
  const recordA = await store.get({
    key: "shared-key",
    agentId: "agent-A",
    sessionTaint: "PUBLIC",
  });
  assertNotEquals(recordA, null);
  assertEquals(recordA!.content, "Agent A data");
  assertEquals(recordA!.agentId, "agent-A");

  // Agent B sees only its own data
  const recordB = await store.get({
    key: "shared-key",
    agentId: "agent-B",
    sessionTaint: "PUBLIC",
  });
  assertNotEquals(recordB, null);
  assertEquals(recordB!.content, "Agent B data");
  assertEquals(recordB!.agentId, "agent-B");

  // Agent A list doesn't include agent B
  const listA = await store.list({
    agentId: "agent-A",
    sessionTaint: "RESTRICTED",
  });
  assertEquals(listA.length, 1);
  assertEquals(listA[0].agentId, "agent-A");

  await storage.close();
  await search.close();
});

// --- Test 9: Soft-delete hides from queries, raw storage still has data ---
Deno.test("Classification — Soft-delete hides from queries but raw storage retains data", async () => {
  const { storage, search, store } = makeStore();

  await store.save({
    key: "soft-del",
    agentId: AGENT,
    sessionTaint: "PUBLIC",
    content: "Will be soft-deleted",
    sourceSessionId: SESSION,
  });

  // Soft-delete
  await store.delete({
    key: "soft-del",
    agentId: AGENT,
    sessionTaint: "PUBLIC",
    sourceSessionId: SESSION,
  });

  // Hidden from get
  const record = await store.get({
    key: "soft-del",
    agentId: AGENT,
    sessionTaint: "PUBLIC",
  });
  assertEquals(record, null);

  // Hidden from list
  const list = await store.list({
    agentId: AGENT,
    sessionTaint: "PUBLIC",
  });
  assertEquals(list.length, 0);

  // But raw storage still has the data
  const rawKeys = await storage.list("memory:cls-agent:PUBLIC:soft-del");
  assertEquals(rawKeys.length, 1);
  const rawJson = await storage.get(rawKeys[0]);
  assertNotEquals(rawJson, null);
  const parsed = JSON.parse(rawJson!);
  assertEquals(parsed.expired, true);

  await storage.close();
  await search.close();
});

// --- Test 10: Hard purge removes from storage completely ---
Deno.test("Classification — Hard purge removes from storage completely", async () => {
  const { storage, search, store } = makeStore();

  await store.save({
    key: "purge-me",
    agentId: AGENT,
    sessionTaint: "PUBLIC",
    content: "Will be hard-purged",
    sourceSessionId: SESSION,
  });

  // Soft-delete first
  await store.delete({
    key: "purge-me",
    agentId: AGENT,
    sessionTaint: "PUBLIC",
    sourceSessionId: SESSION,
  });

  // Verify it's in raw storage
  let rawKeys = await storage.list("memory:cls-agent:PUBLIC:purge-me");
  assertEquals(rawKeys.length, 1);

  // Hard purge with future cutoff
  const purged = await store.purge({
    agentId: AGENT,
    before: new Date(Date.now() + 100_000),
  });
  assertEquals(purged, 1);

  // Now truly gone from raw storage
  rawKeys = await storage.list("memory:cls-agent:PUBLIC:purge-me");
  assertEquals(rawKeys.length, 0);

  await storage.close();
  await search.close();
});
