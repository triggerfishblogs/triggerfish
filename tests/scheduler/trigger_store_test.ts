/**
 * Tests for TriggerStore — persists last trigger result per source.
 */

import { assertEquals, assertExists } from "@std/assert";
import { createMemoryStorage } from "../../src/core/storage/memory.ts";
import {
  createTriggerStore,
} from "../../src/scheduler/trigger_store.ts";
import type { TriggerResult } from "../../src/scheduler/trigger_store.ts";

function makeResult(
  overrides: Partial<TriggerResult> = {},
): TriggerResult {
  return {
    id: crypto.randomUUID(),
    source: "trigger",
    message: "All clear — nothing to report.",
    classification: "PUBLIC",
    firedAt: new Date().toISOString(),
    ...overrides,
  };
}

Deno.test("TriggerStore: save and getLast round-trip", async () => {
  const store = createTriggerStore(createMemoryStorage());
  const result = makeResult();
  await store.save(result);
  const retrieved = await store.getLast("trigger");
  assertExists(retrieved);
  assertEquals(retrieved.id, result.id);
  assertEquals(retrieved.source, result.source);
  assertEquals(retrieved.message, result.message);
  assertEquals(retrieved.classification, result.classification);
  assertEquals(retrieved.firedAt, result.firedAt);
});

Deno.test("TriggerStore: getLast returns null when source has no stored result", async () => {
  const store = createTriggerStore(createMemoryStorage());
  const retrieved = await store.getLast("trigger");
  assertEquals(retrieved, null);
});

Deno.test("TriggerStore: saving a second result for the same source overwrites the first", async () => {
  const store = createTriggerStore(createMemoryStorage());
  const first = makeResult({ message: "first message", id: "id-1" });
  const second = makeResult({ message: "second message", id: "id-2" });
  await store.save(first);
  await store.save(second);
  const retrieved = await store.getLast("trigger");
  assertExists(retrieved);
  assertEquals(retrieved.id, "id-2");
  assertEquals(retrieved.message, "second message");
});

Deno.test("TriggerStore: listAll returns one entry per source", async () => {
  const store = createTriggerStore(createMemoryStorage());
  await store.save(makeResult({ source: "trigger" }));
  await store.save(makeResult({ source: "cron:job-1" }));
  await store.save(makeResult({ source: "webhook:src-a" }));
  const all = await store.listAll();
  assertEquals(all.length, 3);
  const sources = new Set(all.map((r) => r.source));
  assertEquals(sources.has("trigger"), true);
  assertEquals(sources.has("cron:job-1"), true);
  assertEquals(sources.has("webhook:src-a"), true);
});

Deno.test("TriggerStore: listAll returns only the latest result per source after overwrite", async () => {
  const store = createTriggerStore(createMemoryStorage());
  await store.save(makeResult({ source: "trigger", message: "old" }));
  await store.save(makeResult({ source: "trigger", message: "new" }));
  const all = await store.listAll();
  assertEquals(all.length, 1);
  assertEquals(all[0].message, "new");
});

Deno.test("TriggerStore: preserves classification level", async () => {
  const store = createTriggerStore(createMemoryStorage());
  await store.save(makeResult({ classification: "CONFIDENTIAL" }));
  const retrieved = await store.getLast("trigger");
  assertExists(retrieved);
  assertEquals(retrieved.classification, "CONFIDENTIAL");
});

Deno.test("TriggerStore: different sources are stored independently", async () => {
  const store = createTriggerStore(createMemoryStorage());
  await store.save(makeResult({ source: "trigger", message: "periodic result" }));
  await store.save(makeResult({ source: "cron:job-1", message: "cron result" }));

  const periodic = await store.getLast("trigger");
  const cron = await store.getLast("cron:job-1");

  assertExists(periodic);
  assertExists(cron);
  assertEquals(periodic.message, "periodic result");
  assertEquals(cron.message, "cron result");
});

Deno.test("TriggerStore: listAll returns empty array when no results stored", async () => {
  const store = createTriggerStore(createMemoryStorage());
  const all = await store.listAll();
  assertEquals(all.length, 0);
});
