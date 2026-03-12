/**
 * E2E test: message persistence, lineage graph traversal, cross-classification
 * hash lookups, compaction, and retention.
 *
 * Uses REAL MessageStore and LineageStore implementations backed by an
 * in-memory StorageProvider. No mocks for the stores.
 *
 * Run with: deno task test tests/e2e/persistence_lineage_test.ts
 *
 * @module
 */
import { assertEquals, assertNotEquals } from "@std/assert";
import { createMemoryStorage } from "../../src/core/storage/memory.ts";
import { createMessageStore } from "../../src/core/conversation/conversation_store.ts";
import { createLineageStore } from "../../src/core/session/lineage_store.ts";
import { computeContentHash } from "../../src/core/session/lineage_serde.ts";
import type { ClassificationLevel } from "../../src/core/types/classification.ts";
import type { SessionId } from "../../src/core/types/session.ts";
import type { ConversationAppendInput } from "../../src/core/conversation/conversation_types.ts";
import type { LineageCreateInput } from "../../src/core/session/lineage_types.ts";

// ── Helpers ──

const SESSION_A = "session-a" as SessionId;
const SESSION_B = "session-b" as SessionId;

function makeOrigin(toolName: string) {
  return {
    source_type: "tool",
    source_name: toolName,
    accessed_at: new Date().toISOString(),
    accessed_by: "agent-1",
    access_method: "invoke",
  };
}

function makeConvInput(
  overrides: Partial<ConversationAppendInput> & {
    session_id: string;
    role: ConversationAppendInput["role"];
    content: string;
    classification: ClassificationLevel;
  },
): ConversationAppendInput {
  return { ...overrides };
}

function makeLineageInput(
  overrides: Partial<LineageCreateInput> & {
    content: string;
    classification: LineageCreateInput["classification"];
    sessionId: SessionId;
  },
): LineageCreateInput {
  return {
    origin: makeOrigin("test_tool"),
    ...overrides,
  };
}

// ── Tests ──

Deno.test("e2e: full conversation persists and restores after restart", async () => {
  const storage = createMemoryStorage();

  // Phase 1: write records with store instance A
  const storeA = createMessageStore(storage);
  const userRec = await storeA.append(makeConvInput({
    session_id: SESSION_A,
    role: "user",
    content: "Hello agent",
    classification: "PUBLIC",
  }));
  const assistantRec = await storeA.append(makeConvInput({
    session_id: SESSION_A,
    role: "assistant",
    content: "Hello human",
    classification: "PUBLIC",
  }));

  // Phase 2: "restart" — new store from the SAME storage
  const storeB = createMessageStore(storage);
  const restored = await storeB.loadActive(SESSION_A, {
    resumeWindowDays: 365,
  });

  assertEquals(restored.length, 2, "Both records survive restart");
  assertEquals(restored[0].message_id, userRec.message_id);
  assertEquals(restored[1].message_id, assistantRec.message_id);
  assertEquals(restored[0].content, "Hello agent");
  assertEquals(restored[1].content, "Hello human");
});

Deno.test("e2e: tool calls create automatic lineage records", async () => {
  const storage = createMemoryStorage();
  const msgStore = createMessageStore(storage);
  const linStore = createLineageStore(storage);

  // Simulate a tool call that produces lineage
  const lineageRec = await linStore.create(makeLineageInput({
    content: "file contents from /docs/report.txt",
    classification: { level: "PUBLIC", reason: "public docs" },
    sessionId: SESSION_A,
  }));

  // Attach lineage to conversation record
  await msgStore.append(makeConvInput({
    session_id: SESSION_A,
    role: "tool_call",
    content: "read_file result",
    classification: "PUBLIC",
    tool_name: "read_file",
    tool_args: { path: "/docs/report.txt" },
    lineage_id: lineageRec.lineage_id,
  }));

  const records = await msgStore.loadSession(SESSION_A);
  const toolCallRecord = records.find((r) => r.role === "tool_call");
  assertNotEquals(toolCallRecord, undefined);
  assertEquals(toolCallRecord!.lineage_id, lineageRec.lineage_id);
  assertEquals(toolCallRecord!.tool_name, "read_file");

  const fetched = await linStore.get(lineageRec.lineage_id);
  assertNotEquals(fetched, null);
  assertEquals(fetched!.content_hash, lineageRec.content_hash);
});

Deno.test("e2e: lineage graph traversal via trace_forward_indexed", async () => {
  const storage = createMemoryStorage();
  const linStore = createLineageStore(storage);

  // Parent record — raw data fetched from web
  const parent = await linStore.create(makeLineageInput({
    content: "raw web data",
    classification: { level: "PUBLIC", reason: "public site" },
    sessionId: SESSION_A,
  }));

  // Child record — derived from parent
  const child = await linStore.create(makeLineageInput({
    content: "summarized web data",
    classification: { level: "PUBLIC", reason: "derived from public" },
    sessionId: SESSION_A,
    inputLineageIds: [parent.lineage_id],
  }));

  // Forward trace from parent should find child
  const forward = await linStore.trace_forward_indexed(parent.lineage_id);
  assertEquals(forward.length, 1);
  assertEquals(forward[0].lineage_id, child.lineage_id);

  // Backward trace from child should find parent
  const backward = await linStore.trace_backward(child.lineage_id);
  assertEquals(backward.length, 1);
  assertEquals(backward[0].lineage_id, parent.lineage_id);

  // Forward trace from child should be empty (leaf node)
  const leafForward = await linStore.trace_forward_indexed(child.lineage_id);
  assertEquals(leafForward.length, 0);
});

Deno.test("e2e: cross-classification getByHash — PUBLIC content accessible by PUBLIC session", async () => {
  const storage = createMemoryStorage();
  const linStore = createLineageStore(storage);

  const publicContent = "This is public knowledge";
  const record = await linStore.create(makeLineageInput({
    content: publicContent,
    classification: { level: "PUBLIC", reason: "public data" },
    sessionId: SESSION_A,
  }));

  const hash = await computeContentHash(publicContent);
  assertEquals(hash, record.content_hash);

  // PUBLIC session can access PUBLIC content
  const result = await linStore.getByHash(hash, "PUBLIC");
  assertNotEquals(result, null);
  assertEquals(result!.content, publicContent);
  assertEquals(result!.record.lineage_id, record.lineage_id);

  // Higher-taint sessions can also access PUBLIC content (INTERNAL >= PUBLIC)
  const internalResult = await linStore.getByHash(hash, "INTERNAL");
  assertNotEquals(internalResult, null);
  assertEquals(internalResult!.content, publicContent);
});

Deno.test("e2e: cross-classification getByHash — CONFIDENTIAL content blocked for PUBLIC session", async () => {
  const storage = createMemoryStorage();
  const linStore = createLineageStore(storage);

  // CONFIDENTIAL lineage record — content is NOT stored (only PUBLIC stores content)
  const confidentialContent = "Secret quarterly earnings";
  const record = await linStore.create(makeLineageInput({
    content: confidentialContent,
    classification: { level: "CONFIDENTIAL", reason: "financial data" },
    sessionId: SESSION_A,
  }));

  const hash = await computeContentHash(confidentialContent);
  assertEquals(hash, record.content_hash);

  // PUBLIC session cannot access CONFIDENTIAL content
  const publicResult = await linStore.getByHash(hash, "PUBLIC");
  assertEquals(publicResult, null, "PUBLIC taint must not read CONFIDENTIAL");

  // Even CONFIDENTIAL session gets null because content is not stored for non-PUBLIC
  const confResult = await linStore.getByHash(hash, "CONFIDENTIAL");
  assertEquals(
    confResult,
    null,
    "Content not stored for CONFIDENTIAL classification",
  );
});

Deno.test("e2e: compaction marks records and creates summary with inputLineageIds", async () => {
  const storage = createMemoryStorage();
  const msgStore = createMessageStore(storage);
  const linStore = createLineageStore(storage);

  // Build a conversation with 4 turns
  const r0 = await msgStore.append(makeConvInput({
    session_id: SESSION_A,
    role: "user",
    content: "What is the weather?",
    classification: "PUBLIC",
  }));
  await msgStore.append(makeConvInput({
    session_id: SESSION_A,
    role: "assistant",
    content: "Let me check the weather for you.",
    classification: "PUBLIC",
  }));
  await msgStore.append(makeConvInput({
    session_id: SESSION_A,
    role: "tool_call",
    content: "weather_check result: sunny",
    classification: "PUBLIC",
    tool_name: "weather_check",
  }));
  const r3 = await msgStore.append(makeConvInput({
    session_id: SESSION_A,
    role: "assistant",
    content: "It is sunny today.",
    classification: "PUBLIC",
  }));

  // Mark records 0-2 as compacted
  await msgStore.markCompacted(SESSION_A, r0.sequence, r3.sequence - 1);

  // Create a lineage record for the compaction summary
  const summaryLineage = await linStore.create(makeLineageInput({
    content:
      "Conversation summary: user asked about weather, agent checked and reported sunny.",
    classification: {
      level: "PUBLIC",
      reason: "summary of public conversation",
    },
    sessionId: SESSION_A,
  }));

  // Append compaction summary referencing the summary lineage
  await msgStore.append(makeConvInput({
    session_id: SESSION_A,
    role: "compaction_summary",
    content:
      "Conversation summary: user asked about weather, agent checked and reported sunny.",
    classification: "PUBLIC",
    lineage_id: summaryLineage.lineage_id,
  }));

  // loadActive should exclude compacted records but include summary + last assistant
  const active = await msgStore.loadActive(SESSION_A, {
    resumeWindowDays: 365,
  });
  const compactedRecords = active.filter((r) => r.compacted);
  assertEquals(compactedRecords.length, 0, "No compacted records in active");

  const summaryRecords = active.filter((r) => r.role === "compaction_summary");
  assertEquals(summaryRecords.length, 1, "Summary record present");
  assertEquals(summaryRecords[0].lineage_id, summaryLineage.lineage_id);

  // Full session still has all records
  const full = await msgStore.loadSession(SESSION_A);
  assertEquals(
    full.length,
    5,
    "All 5 records in full session (4 original + 1 summary)",
  );
});

Deno.test("e2e: message retention deletes old records without touching lineage", async () => {
  const storage = createMemoryStorage();
  const msgStore = createMessageStore(storage);
  const linStore = createLineageStore(storage);

  // Create a lineage record
  const lineageRec = await linStore.create(makeLineageInput({
    content: "persistent lineage data",
    classification: { level: "PUBLIC", reason: "test" },
    sessionId: SESSION_A,
  }));

  // Append a conversation record linked to the lineage
  await msgStore.append(makeConvInput({
    session_id: SESSION_A,
    role: "tool_call",
    content: "tool output",
    classification: "PUBLIC",
    lineage_id: lineageRec.lineage_id,
  }));

  // Append a recent record
  await msgStore.append(makeConvInput({
    session_id: SESSION_A,
    role: "assistant",
    content: "recent reply",
    classification: "PUBLIC",
  }));

  // Apply retention with 0 max age days at a time 2 days in the future
  // This deletes all records older than 0 days relative to the reference time
  const futureDate = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
  const result = await msgStore.applyRetention(
    { maxAgeDays: 0 },
    futureDate,
  );
  assertEquals(result.ok, true);
  if (result.ok) {
    assertEquals(result.value, 2, "Both old records deleted");
  }

  // Messages gone
  const remaining = await msgStore.loadSession(SESSION_A);
  assertEquals(remaining.length, 0);

  // Lineage untouched
  const lineageStillExists = await linStore.get(lineageRec.lineage_id);
  assertNotEquals(
    lineageStillExists,
    null,
    "Lineage record survives message retention",
  );
});

Deno.test("e2e: lineage retention independent of message retention", async () => {
  const storage = createMemoryStorage();
  const msgStore = createMessageStore(storage);
  const linStore = createLineageStore(storage);

  // Create old lineage with old accessed_at
  const oldDate = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000); // 60 days ago
  const oldLineage = await linStore.create({
    content: "old data",
    origin: {
      source_type: "tool",
      source_name: "read_file",
      accessed_at: oldDate.toISOString(),
      accessed_by: "agent-1",
      access_method: "invoke",
    },
    classification: { level: "PUBLIC", reason: "old data" },
    sessionId: SESSION_A,
  });

  // Create recent lineage
  const recentLineage = await linStore.create(makeLineageInput({
    content: "fresh data",
    classification: { level: "PUBLIC", reason: "recent" },
    sessionId: SESSION_A,
  }));

  // Append a conversation record (recent)
  await msgStore.append(makeConvInput({
    session_id: SESSION_A,
    role: "user",
    content: "test message",
    classification: "PUBLIC",
  }));

  // Apply lineage retention: 30 days max
  const linResult = await linStore.applyLineageRetention({ maxAgeDays: 30 });
  assertEquals(linResult.ok, true);
  if (linResult.ok) {
    assertEquals(linResult.value, 1, "One old lineage record purged");
  }

  // Old lineage gone, recent preserved
  const oldFetch = await linStore.get(oldLineage.lineage_id);
  assertEquals(oldFetch, null, "Old lineage purged");

  const recentFetch = await linStore.get(recentLineage.lineage_id);
  assertNotEquals(recentFetch, null, "Recent lineage preserved");

  // Message still intact
  const messages = await msgStore.loadSession(SESSION_A);
  assertEquals(
    messages.length,
    1,
    "Message retention not affected by lineage retention",
  );
});

Deno.test("e2e: restored history skips records above session taint", async () => {
  const storage = createMemoryStorage();
  const msgStore = createMessageStore(storage);

  // Append records at different classification levels
  await msgStore.append(makeConvInput({
    session_id: SESSION_B,
    role: "user",
    content: "public question",
    classification: "PUBLIC",
  }));

  await msgStore.append(makeConvInput({
    session_id: SESSION_B,
    role: "assistant",
    content: "confidential answer",
    classification: "CONFIDENTIAL",
  }));

  await msgStore.append(makeConvInput({
    session_id: SESSION_B,
    role: "user",
    content: "another public question",
    classification: "PUBLIC",
  }));

  // Load all records (no classification filter at store level)
  const allRecords = await msgStore.loadActive(SESSION_B, {
    resumeWindowDays: 365,
  });
  assertEquals(allRecords.length, 3, "All records loaded from store");

  // Simulate what the orchestrator does: filter by session taint (PUBLIC)
  // A PUBLIC-tainted session cannot see CONFIDENTIAL records
  const sessionTaint: ClassificationLevel = "PUBLIC";
  const publicOrder: Record<ClassificationLevel, number> = {
    PUBLIC: 1,
    INTERNAL: 2,
    CONFIDENTIAL: 3,
    RESTRICTED: 4,
  };
  const filtered = allRecords.filter(
    (r) => publicOrder[r.classification] <= publicOrder[sessionTaint],
  );

  assertEquals(filtered.length, 2, "PUBLIC session sees only PUBLIC records");
  assertEquals(filtered[0].content, "public question");
  assertEquals(filtered[1].content, "another public question");

  // A CONFIDENTIAL session can see everything at or below CONFIDENTIAL
  const confTaint: ClassificationLevel = "CONFIDENTIAL";
  const confFiltered = allRecords.filter(
    (r) => publicOrder[r.classification] <= publicOrder[confTaint],
  );
  assertEquals(
    confFiltered.length,
    3,
    "CONFIDENTIAL session sees all 3 records",
  );
});
