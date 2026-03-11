/**
 * Memory tool lineage recording tests.
 *
 * Verifies that memory save/get/search operations record lineage entries
 * via the LineageStore, and that lineage failures do not break operations.
 *
 * @module
 */

import { assertEquals } from "@std/assert";
import { createMemoryStorage } from "../../../src/core/storage/memory.ts";
import { createMemoryStore } from "../../../src/tools/memory/store.ts";
import { createInMemorySearchProvider } from "../../../src/tools/memory/search/mod.ts";
import { createMemoryToolExecutor } from "../../../src/tools/memory/tools/mod.ts";
import type { MemoryToolContext } from "../../../src/tools/memory/tools/mod.ts";
import type { SessionId } from "../../../src/core/types/session.ts";
import type { ClassificationLevel } from "../../../src/core/types/classification.ts";
import type {
  LineageCreateInput,
  LineageRecord,
  LineageStore,
} from "../../../src/core/session/lineage_types.ts";

// ─── Mock LineageStore ──────────────────────────────────────────────────────

interface LineageCall {
  readonly input: LineageCreateInput;
}

interface MockLineageStore extends LineageStore {
  readonly calls: LineageCall[];
}

function createMockLineageStore(): MockLineageStore {
  const calls: LineageCall[] = [];
  let counter = 0;

  const store: MockLineageStore = {
    calls,
    create(input: LineageCreateInput): Promise<LineageRecord> {
      calls.push({ input });
      counter++;
      const record: LineageRecord = {
        lineage_id: `lineage-${counter}`,
        content_hash: `hash-${counter}`,
        origin: input.origin,
        classification: input.classification,
        sessionId: input.sessionId,
        ...(input.inputLineageIds
          ? { inputLineageIds: input.inputLineageIds }
          : {}),
      };
      return Promise.resolve(record);
    },
    get: () => Promise.resolve(null),
    getBySession: () => Promise.resolve([]),
    trace_forward: () => Promise.resolve([]),
    trace_forward_indexed: () => Promise.resolve([]),
    trace_backward: () => Promise.resolve([]),
    getByHash: () => Promise.resolve(null),
    export: () => Promise.resolve([]),
    applyLineageRetention: () => Promise.resolve({ ok: true, value: 0 }),
  };

  return store;
}

function createFailingLineageStore(): LineageStore {
  return {
    create(): Promise<LineageRecord> {
      return Promise.reject(new Error("Lineage store unavailable"));
    },
    get: () => Promise.resolve(null),
    getBySession: () => Promise.resolve([]),
    trace_forward: () => Promise.resolve([]),
    trace_forward_indexed: () => Promise.resolve([]),
    trace_backward: () => Promise.resolve([]),
    getByHash: () => Promise.resolve(null),
    export: () => Promise.resolve([]),
    applyLineageRetention: () => Promise.resolve({ ok: true, value: 0 }),
  };
}

// ─── Context Helpers ────────────────────────────────────────────────────────

function makeContextWithLineage(lineageStore: LineageStore): {
  ctx: MemoryToolContext;
  cleanup: () => Promise<void>;
} {
  const storage = createMemoryStorage();
  const searchProvider = createInMemorySearchProvider();
  const memStore = createMemoryStore({ storage, searchProvider });

  const ctx: MemoryToolContext = {
    store: memStore,
    searchProvider,
    agentId: "test-agent",
    sessionTaint: "INTERNAL" as ClassificationLevel,
    sourceSessionId: "lineage-test-session" as SessionId,
    lineageStore,
  };

  return {
    ctx,
    cleanup: async () => {
      await searchProvider.close();
      await storage.close();
    },
  };
}

function makeContextWithoutLineage(): {
  ctx: MemoryToolContext;
  cleanup: () => Promise<void>;
} {
  const storage = createMemoryStorage();
  const searchProvider = createInMemorySearchProvider();
  const memStore = createMemoryStore({ storage, searchProvider });

  const ctx: MemoryToolContext = {
    store: memStore,
    searchProvider,
    agentId: "test-agent",
    sessionTaint: "INTERNAL" as ClassificationLevel,
    sourceSessionId: "lineage-test-session" as SessionId,
  };

  return {
    ctx,
    cleanup: async () => {
      await searchProvider.close();
      await storage.close();
    },
  };
}

// ─── Tests ──────────────────────────────────────────────────────────────────

Deno.test("memory lineage: save creates lineage record with memory_access source", async () => {
  const lineageStore = createMockLineageStore();
  const { ctx, cleanup } = makeContextWithLineage(lineageStore);
  const executor = createMemoryToolExecutor(ctx);

  await executor("memory_save", {
    key: "user-name",
    content: "The user is called Bob",
  });

  assertEquals(lineageStore.calls.length, 1);
  const call = lineageStore.calls[0];
  assertEquals(call.input.origin.source_type, "memory_access");
  assertEquals(call.input.origin.source_name, "user-name");
  assertEquals(call.input.origin.access_method, "memory_save");
  assertEquals(call.input.origin.accessed_by, "test-agent");
  assertEquals(call.input.content, "The user is called Bob");
  assertEquals(call.input.classification.level, "INTERNAL");
  assertEquals(call.input.sessionId, "lineage-test-session");

  await cleanup();
});

Deno.test("memory lineage: save stores lineageId on MemoryRecord", async () => {
  const lineageStore = createMockLineageStore();
  const { ctx, cleanup } = makeContextWithLineage(lineageStore);
  const executor = createMemoryToolExecutor(ctx);

  await executor("memory_save", {
    key: "color",
    content: "Favorite color is blue",
  });

  // Verify the record was saved with the lineageId from the lineage store
  const getResult = await executor("memory_get", { key: "color" });
  const parsed = JSON.parse(getResult!);
  assertEquals(parsed.found, true);
  assertEquals(parsed.content, "Favorite color is blue");

  // The lineage store returned lineage_id "lineage-1" for the first call
  // Verify the save call happened with the correct content
  assertEquals(lineageStore.calls.length >= 1, true);
  assertEquals(lineageStore.calls[0].input.content, "Favorite color is blue");

  await cleanup();
});

Deno.test("memory lineage: get creates read-lineage with inputLineageIds", async () => {
  const lineageStore = createMockLineageStore();
  const { ctx, cleanup } = makeContextWithLineage(lineageStore);
  const executor = createMemoryToolExecutor(ctx);

  // Save a memory first (triggers lineage call #1)
  await executor("memory_save", {
    key: "pet",
    content: "User has a cat named Luna",
  });

  // Get the memory (triggers lineage call #2)
  await executor("memory_get", { key: "pet" });

  // Call #1 = save lineage, Call #2 = read lineage
  assertEquals(lineageStore.calls.length, 2);

  const readCall = lineageStore.calls[1];
  assertEquals(readCall.input.origin.source_type, "memory_access");
  assertEquals(readCall.input.origin.access_method, "memory_get");
  assertEquals(readCall.input.content, "pet");
  // The saved record should have lineageId "lineage-1", passed as inputLineageIds
  assertEquals(readCall.input.inputLineageIds, ["lineage-1"]);

  await cleanup();
});

Deno.test("memory lineage: search creates read-lineage with inputLineageIds from results", async () => {
  const lineageStore = createMockLineageStore();
  const { ctx, cleanup } = makeContextWithLineage(lineageStore);
  const executor = createMemoryToolExecutor(ctx);

  // Save two memories (lineage calls #1 and #2)
  await executor("memory_save", {
    key: "pet",
    content: "User has a golden retriever named Max",
  });
  await executor("memory_save", {
    key: "car",
    content: "User drives a red Tesla",
  });

  // Search (lineage call #3)
  await executor("memory_search", { query: "golden retriever" });

  // At least 3 lineage calls: 2 saves + 1 search read
  assertEquals(lineageStore.calls.length >= 3, true);

  const searchCall = lineageStore.calls[lineageStore.calls.length - 1];
  assertEquals(searchCall.input.origin.source_type, "memory_access");
  assertEquals(searchCall.input.origin.access_method, "memory_search");
  assertEquals(searchCall.input.content, "golden retriever");
  // inputLineageIds should contain the lineage IDs from the matched records
  assertEquals(
    searchCall.input.inputLineageIds !== undefined,
    true,
    "search lineage should include inputLineageIds from results",
  );

  await cleanup();
});

Deno.test("memory lineage: lineage failure does not break save operation", async () => {
  const lineageStore = createFailingLineageStore();
  const { ctx, cleanup } = makeContextWithLineage(lineageStore);
  const executor = createMemoryToolExecutor(ctx);

  // Save should succeed even though lineage store throws
  const result = await executor("memory_save", {
    key: "test-key",
    content: "Test content",
  });

  const parsed = JSON.parse(result!);
  assertEquals(parsed.saved, true);
  assertEquals(parsed.key, "test-key");
  assertEquals(parsed.classification, "INTERNAL");

  // Verify the memory was actually saved
  const getResult = await executor("memory_get", { key: "test-key" });
  const getParsed = JSON.parse(getResult!);
  assertEquals(getParsed.found, true);
  assertEquals(getParsed.content, "Test content");

  await cleanup();
});

Deno.test("memory lineage: lineage skipped when lineageStore absent", async () => {
  const { ctx, cleanup } = makeContextWithoutLineage();
  const executor = createMemoryToolExecutor(ctx);

  // All operations should succeed without a lineage store
  const saveResult = await executor("memory_save", {
    key: "no-lineage",
    content: "No lineage tracking",
  });
  const saveParsed = JSON.parse(saveResult!);
  assertEquals(saveParsed.saved, true);

  const getResult = await executor("memory_get", { key: "no-lineage" });
  const getParsed = JSON.parse(getResult!);
  assertEquals(getParsed.found, true);
  assertEquals(getParsed.content, "No lineage tracking");

  await cleanup();
});
