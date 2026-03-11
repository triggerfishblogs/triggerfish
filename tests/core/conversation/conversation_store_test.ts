/**
 * MessageStore unit tests — append, loadSession, loadActive (resume window,
 * compacted filter, taint gate), markCompacted, export, applyRetention.
 */
import { assert, assertEquals, assertExists } from "@std/assert";
import { createMemoryStorage } from "../../../src/core/storage/memory.ts";
import { createMessageStore } from "../../../src/core/conversation/mod.ts";
import type {
  ConversationRecord,
  MessageStore,
} from "../../../src/core/conversation/mod.ts";

function makeStore(): MessageStore {
  const storage = createMemoryStorage();
  return createMessageStore(storage);
}

Deno.test("MessageStore: append returns record with id, timestamp, and sequence", async () => {
  const store = makeStore();
  const record = await store.append({
    session_id: "sess-1",
    role: "user",
    content: "Hello",
    classification: "PUBLIC",
  });
  assertExists(record.message_id);
  assertExists(record.timestamp);
  assertEquals(record.sequence, 0);
  assertEquals(record.role, "user");
  assertEquals(record.content, "Hello");
  assertEquals(record.classification, "PUBLIC");
  assertEquals(record.compacted, false);
});

Deno.test("MessageStore: append increments sequence per session", async () => {
  const store = makeStore();
  const r1 = await store.append({
    session_id: "sess-1",
    role: "user",
    content: "msg 1",
    classification: "PUBLIC",
  });
  const r2 = await store.append({
    session_id: "sess-1",
    role: "assistant",
    content: "msg 2",
    classification: "PUBLIC",
  });
  const r3 = await store.append({
    session_id: "sess-2",
    role: "user",
    content: "other session",
    classification: "INTERNAL",
  });
  assertEquals(r1.sequence, 0);
  assertEquals(r2.sequence, 1);
  assertEquals(r3.sequence, 0); // different session resets
});

Deno.test("MessageStore: append stores tool_call metadata", async () => {
  const store = makeStore();
  const record = await store.append({
    session_id: "sess-1",
    role: "tool_call",
    content: "",
    classification: "PUBLIC",
    tool_name: "web_search",
    tool_args: { query: "test" },
    lineage_id: "lineage-123",
  });
  assertEquals(record.tool_name, "web_search");
  assertEquals(record.tool_args, { query: "test" });
  assertEquals(record.lineage_id, "lineage-123");
});

Deno.test("MessageStore: loadSession returns all records for session", async () => {
  const store = makeStore();
  await store.append({
    session_id: "sess-1",
    role: "user",
    content: "a",
    classification: "PUBLIC",
  });
  await store.append({
    session_id: "sess-1",
    role: "assistant",
    content: "b",
    classification: "PUBLIC",
  });
  await store.append({
    session_id: "sess-2",
    role: "user",
    content: "c",
    classification: "INTERNAL",
  });

  const records = await store.loadSession("sess-1");
  assertEquals(records.length, 2);
  assertEquals(records[0].content, "a");
  assertEquals(records[1].content, "b");
});

Deno.test("MessageStore: loadActive excludes compacted records", async () => {
  const store = makeStore();
  await store.append({
    session_id: "sess-1",
    role: "user",
    content: "old",
    classification: "PUBLIC",
  });
  await store.append({
    session_id: "sess-1",
    role: "assistant",
    content: "old reply",
    classification: "PUBLIC",
  });
  await store.append({
    session_id: "sess-1",
    role: "compaction_summary",
    content: "summary of old",
    classification: "PUBLIC",
  });

  await store.markCompacted("sess-1", 0, 1);

  const active = await store.loadActive("sess-1");
  assertEquals(active.length, 1);
  assertEquals(active[0].role, "compaction_summary");
});

Deno.test("MessageStore: loadActive respects resume window", async () => {
  const storage = createMemoryStorage();
  const store = createMessageStore(storage);

  // Manually create a record with old timestamp
  const oldRecord: ConversationRecord = {
    message_id: crypto.randomUUID(),
    session_id: "sess-1",
    role: "user",
    content: "old message",
    classification: "PUBLIC",
    timestamp: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(), // 10 days ago
    sequence: 0,
    compacted: false,
  };
  await storage.set(
    `conv:sess-1:000000000000`,
    JSON.stringify(oldRecord),
  );
  await storage.set(
    `conv-session:sess-1`,
    JSON.stringify({ lastSequence: 0 }),
  );

  // Add a recent record
  await store.append({
    session_id: "sess-1",
    role: "user",
    content: "recent message",
    classification: "PUBLIC",
  });

  const active = await store.loadActive("sess-1", { resumeWindowDays: 7 });
  assertEquals(active.length, 1);
  assertEquals(active[0].content, "recent message");
});

Deno.test("MessageStore: loadActive respects expiresAt", async () => {
  const storage = createMemoryStorage();
  const store = createMessageStore(storage);

  const expiredRecord: ConversationRecord = {
    message_id: crypto.randomUUID(),
    session_id: "sess-1",
    role: "user",
    content: "expired message",
    classification: "PUBLIC",
    timestamp: new Date().toISOString(),
    sequence: 0,
    compacted: false,
    expiresAt: new Date(Date.now() - 1000).toISOString(), // already expired
  };
  await storage.set(
    `conv:sess-1:000000000000`,
    JSON.stringify(expiredRecord),
  );
  await storage.set(
    `conv-session:sess-1`,
    JSON.stringify({ lastSequence: 0 }),
  );

  const active = await store.loadActive("sess-1");
  assertEquals(active.length, 0);
});

Deno.test("MessageStore: markCompacted sets compacted flag", async () => {
  const store = makeStore();
  await store.append({
    session_id: "sess-1",
    role: "user",
    content: "a",
    classification: "PUBLIC",
  });
  await store.append({
    session_id: "sess-1",
    role: "assistant",
    content: "b",
    classification: "PUBLIC",
  });
  await store.append({
    session_id: "sess-1",
    role: "user",
    content: "c",
    classification: "PUBLIC",
  });

  await store.markCompacted("sess-1", 0, 1);

  const all = await store.loadSession("sess-1");
  assertEquals(all[0].compacted, true);
  assertEquals(all[1].compacted, true);
  assertEquals(all[2].compacted, false);
});

Deno.test("MessageStore: export returns all records (same as loadSession)", async () => {
  const store = makeStore();
  await store.append({
    session_id: "sess-1",
    role: "user",
    content: "a",
    classification: "PUBLIC",
  });
  await store.append({
    session_id: "sess-1",
    role: "assistant",
    content: "b",
    classification: "INTERNAL",
  });

  const exported = await store.export("sess-1");
  assertEquals(exported.length, 2);
  assertExists(exported[0].message_id);
  assertExists(exported[1].message_id);
});

Deno.test("MessageStore: applyRetention deletes old records", async () => {
  const storage = createMemoryStorage();
  const store = createMessageStore(storage);

  // Create an old record directly in storage
  const oldRecord: ConversationRecord = {
    message_id: crypto.randomUUID(),
    session_id: "retention-sess",
    role: "user",
    content: "old",
    classification: "PUBLIC",
    timestamp: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString(),
    sequence: 0,
    compacted: false,
  };
  await storage.set(
    `conv:retention-sess:000000000000`,
    JSON.stringify(oldRecord),
  );
  await storage.set(
    `conv-session:retention-sess`,
    JSON.stringify({ lastSequence: 0 }),
  );

  // Create a recent record via the store API
  await store.append({
    session_id: "retention-sess",
    role: "user",
    content: "recent",
    classification: "PUBLIC",
  });

  // Verify both records exist before retention
  const beforeRetention = await store.loadSession("retention-sess");
  assertEquals(beforeRetention.length, 2);

  const result = await store.applyRetention({ maxAgeDays: 30 });
  assert(result.ok);
  if (result.ok) {
    assertEquals(result.value, 1);
  }

  const remaining = await store.loadSession("retention-sess");
  assertEquals(remaining.length, 1);
  assertEquals(remaining[0].content, "recent");
});

Deno.test("MessageStore: applyRetention returns zero when no old records", async () => {
  const store = makeStore();
  await store.append({
    session_id: "sess-1",
    role: "user",
    content: "recent",
    classification: "PUBLIC",
  });

  const result = await store.applyRetention({ maxAgeDays: 30 });
  assert(result.ok);
  if (result.ok) {
    assertEquals(result.value, 0);
  }
});

Deno.test("MessageStore: tool_args truncated at 4096 chars", async () => {
  const store = makeStore();
  const longArgs: Record<string, unknown> = {
    data: "x".repeat(5000),
  };
  const record = await store.append({
    session_id: "sess-1",
    role: "tool_call",
    content: "",
    classification: "PUBLIC",
    tool_name: "test_tool",
    tool_args: longArgs,
  });
  const argsJson = JSON.stringify(record.tool_args);
  assert(argsJson.length <= 4096);
});
