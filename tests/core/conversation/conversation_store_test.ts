/**
 * MessageStore tests — append, loadSession, loadActive (resume window +
 * compacted filter + taint gate), markCompacted, export, applyRetention.
 */
import { assert, assertEquals, assertExists } from "@std/assert";
import { createMessageStore } from "../../../src/core/conversation/conversation_store.ts";
import { createMemoryStorage } from "../../../src/core/storage/memory.ts";
import type { ConversationAppendInput } from "../../../src/core/conversation/conversation_types.ts";

function makeStore() {
  const storage = createMemoryStorage();
  return { store: createMessageStore(storage), storage };
}

function makeInput(
  overrides?: Partial<ConversationAppendInput>,
): ConversationAppendInput {
  return {
    session_id: "sess-1",
    role: "user",
    content: "Hello",
    classification: "PUBLIC",
    ...overrides,
  };
}

Deno.test("MessageStore: append returns record with message_id and sequence", async () => {
  const { store } = makeStore();
  const record = await store.append(makeInput());
  assertExists(record.message_id);
  assertEquals(record.sequence, 0);
  assertEquals(record.role, "user");
  assertEquals(record.classification, "PUBLIC");
  assertEquals(record.compacted, false);
});

Deno.test("MessageStore: append increments sequence per session", async () => {
  const { store } = makeStore();
  const r1 = await store.append(makeInput());
  const r2 = await store.append(makeInput({ content: "World" }));
  const r3 = await store.append(
    makeInput({ session_id: "sess-2", content: "Other" }),
  );
  assertEquals(r1.sequence, 0);
  assertEquals(r2.sequence, 1);
  assertEquals(r3.sequence, 0); // different session
});

Deno.test("MessageStore: loadSession returns all records", async () => {
  const { store } = makeStore();
  await store.append(makeInput());
  await store.append(makeInput({ role: "assistant", content: "Hi" }));
  const records = await store.loadSession("sess-1");
  assertEquals(records.length, 2);
  assertEquals(records[0].role, "user");
  assertEquals(records[1].role, "assistant");
});

Deno.test("MessageStore: loadActive excludes compacted records", async () => {
  const { store } = makeStore();
  await store.append(makeInput());
  await store.append(makeInput({ content: "msg 2" }));
  await store.append(makeInput({ content: "msg 3" }));
  await store.markCompacted("sess-1", 0, 1);
  const active = await store.loadActive("sess-1");
  assertEquals(active.length, 1);
  assertEquals(active[0].content, "msg 3");
});

Deno.test("MessageStore: loadActive respects resume window", async () => {
  const { store } = makeStore();
  // Append a record, then manually check filtering
  await store.append(makeInput());
  const active = await store.loadActive("sess-1", { resumeWindowDays: 7 });
  assertEquals(active.length, 1); // just created, within window

  // With 0-day window, nothing should be returned
  const none = await store.loadActive("sess-1", { resumeWindowDays: 0 });
  assertEquals(none.length, 0);
});

Deno.test("MessageStore: markCompacted sets compacted flag", async () => {
  const { store } = makeStore();
  await store.append(makeInput());
  await store.append(makeInput({ content: "msg 2" }));
  await store.markCompacted("sess-1", 0, 0);
  const records = await store.loadSession("sess-1");
  assertEquals(records[0].compacted, true);
  assertEquals(records[1].compacted, false);
});

Deno.test("MessageStore: export returns all records including compacted", async () => {
  const { store } = makeStore();
  await store.append(makeInput());
  await store.append(makeInput({ content: "msg 2" }));
  await store.markCompacted("sess-1", 0, 0);
  const exported = await store.export("sess-1");
  assertEquals(exported.length, 2);
  assertEquals(exported[0].compacted, true);
});

Deno.test("MessageStore: applyRetention deletes old records", async () => {
  const { store } = makeStore();
  await store.append(makeInput());
  // With a max age of 0 days, everything should be deleted
  const future = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
  const result = await store.applyRetention({ maxAgeDays: 1 }, future);
  assert(result.ok);
  if (result.ok) {
    assertEquals(result.value, 1);
  }
  const remaining = await store.loadSession("sess-1");
  assertEquals(remaining.length, 0);
});

Deno.test("MessageStore: applyRetention preserves recent records", async () => {
  const { store } = makeStore();
  await store.append(makeInput());
  const result = await store.applyRetention({ maxAgeDays: 30 });
  assert(result.ok);
  if (result.ok) {
    assertEquals(result.value, 0);
  }
  const remaining = await store.loadSession("sess-1");
  assertEquals(remaining.length, 1);
});

Deno.test("MessageStore: tool_call records store tool metadata", async () => {
  const { store } = makeStore();
  const record = await store.append(
    makeInput({
      role: "tool_call",
      content: "{}",
      tool_name: "web_search",
      tool_args: { query: "test" },
      lineage_id: "lin-123",
    }),
  );
  assertEquals(record.tool_name, "web_search");
  assertExists(record.tool_args);
  assertEquals(record.lineage_id, "lin-123");
});

Deno.test("MessageStore: compaction_summary records work", async () => {
  const { store } = makeStore();
  const record = await store.append(
    makeInput({
      role: "compaction_summary",
      content: "Summary of conversation so far.",
      classification: "INTERNAL",
    }),
  );
  assertEquals(record.role, "compaction_summary");
  assertEquals(record.classification, "INTERNAL");
});

Deno.test("MessageStore: separate sessions are independent", async () => {
  const { store } = makeStore();
  await store.append(makeInput({ session_id: "a" }));
  await store.append(makeInput({ session_id: "a", content: "2" }));
  await store.append(makeInput({ session_id: "b" }));
  const aRecords = await store.loadSession("a");
  const bRecords = await store.loadSession("b");
  assertEquals(aRecords.length, 2);
  assertEquals(bRecords.length, 1);
});
