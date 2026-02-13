/**
 * Memory tool executor tests.
 *
 * Tests the 5 memory tools (save, get, search, list, delete) using
 * in-memory storage and in-memory search provider.
 *
 * @module
 */

import { assertEquals, assertStringIncludes } from "@std/assert";
import { createMemoryStorage } from "../../src/core/storage/memory.ts";
import { createMemoryStore } from "../../src/memory/store.ts";
import { createInMemorySearchProvider } from "../../src/memory/search.ts";
import { createMemoryToolExecutor } from "../../src/memory/tools.ts";
import type { MemoryToolContext } from "../../src/memory/tools.ts";
import type { SessionId } from "../../src/core/types/session.ts";

function makeContext(): {
  ctx: MemoryToolContext;
  cleanup: () => Promise<void>;
} {
  const storage = createMemoryStorage();
  const searchProvider = createInMemorySearchProvider();
  const store = createMemoryStore({ storage, searchProvider });

  const ctx: MemoryToolContext = {
    store,
    searchProvider,
    agentId: "test-agent",
    sessionTaint: "INTERNAL",
    sourceSessionId: "tool-test-session" as SessionId,
  };

  return {
    ctx,
    cleanup: async () => {
      await searchProvider.close();
      await storage.close();
    },
  };
}

Deno.test("memory_save — saves and returns confirmation", async () => {
  const { ctx, cleanup } = makeContext();
  const executor = createMemoryToolExecutor(ctx);

  const result = await executor("memory_save", {
    key: "user-name",
    content: "The user is called Bob",
    tags: ["personal"],
  });

  const parsed = JSON.parse(result!);
  assertEquals(parsed.saved, true);
  assertEquals(parsed.key, "user-name");
  assertEquals(parsed.classification, "INTERNAL"); // forced to sessionTaint

  await cleanup();
});

Deno.test("memory_save — validates required fields", async () => {
  const { ctx, cleanup } = makeContext();
  const executor = createMemoryToolExecutor(ctx);

  // Missing key
  const r1 = await executor("memory_save", { content: "test" });
  assertStringIncludes(r1!, "Error");

  // Missing content
  const r2 = await executor("memory_save", { key: "test" });
  assertStringIncludes(r2!, "Error");

  // Empty key
  const r3 = await executor("memory_save", { key: "", content: "test" });
  assertStringIncludes(r3!, "Error");

  // Empty content
  const r4 = await executor("memory_save", { key: "test", content: "" });
  assertStringIncludes(r4!, "Error");

  await cleanup();
});

Deno.test("memory_get — retrieves saved memory", async () => {
  const { ctx, cleanup } = makeContext();
  const executor = createMemoryToolExecutor(ctx);

  await executor("memory_save", {
    key: "color",
    content: "Favorite color is blue",
    tags: ["preference"],
  });

  const result = await executor("memory_get", { key: "color" });
  const parsed = JSON.parse(result!);
  assertEquals(parsed.found, true);
  assertEquals(parsed.content, "Favorite color is blue");
  assertEquals(parsed.tags, ["preference"]);

  await cleanup();
});

Deno.test("memory_get — returns not found for missing key", async () => {
  const { ctx, cleanup } = makeContext();
  const executor = createMemoryToolExecutor(ctx);

  const result = await executor("memory_get", { key: "nonexistent" });
  const parsed = JSON.parse(result!);
  assertEquals(parsed.found, false);

  await cleanup();
});

Deno.test("memory_search — finds matching memories", async () => {
  const { ctx, cleanup } = makeContext();
  const executor = createMemoryToolExecutor(ctx);

  await executor("memory_save", {
    key: "pet",
    content: "The user has a golden retriever named Max",
  });
  await executor("memory_save", {
    key: "car",
    content: "The user drives a red Tesla",
  });

  const result = await executor("memory_search", { query: "golden retriever" });
  const parsed = JSON.parse(result!);
  assertEquals(parsed.results.length, 1);
  assertEquals(parsed.results[0].key, "pet");

  await cleanup();
});

Deno.test("memory_search — returns empty for no matches", async () => {
  const { ctx, cleanup } = makeContext();
  const executor = createMemoryToolExecutor(ctx);

  const result = await executor("memory_search", { query: "nonexistent" });
  const parsed = JSON.parse(result!);
  assertEquals(parsed.results.length, 0);

  await cleanup();
});

Deno.test("memory_list — lists all accessible memories", async () => {
  const { ctx, cleanup } = makeContext();
  const executor = createMemoryToolExecutor(ctx);

  await executor("memory_save", {
    key: "a",
    content: "Memory A",
    tags: ["tag1"],
  });
  await executor("memory_save", {
    key: "b",
    content: "Memory B",
    tags: ["tag2"],
  });

  const result = await executor("memory_list", {});
  const parsed = JSON.parse(result!);
  assertEquals(parsed.memories.length, 2);

  await cleanup();
});

Deno.test("memory_list — filters by tag", async () => {
  const { ctx, cleanup } = makeContext();
  const executor = createMemoryToolExecutor(ctx);

  await executor("memory_save", {
    key: "a",
    content: "Memory A",
    tags: ["important"],
  });
  await executor("memory_save", {
    key: "b",
    content: "Memory B",
    tags: ["trivial"],
  });

  const result = await executor("memory_list", { tag: "important" });
  const parsed = JSON.parse(result!);
  assertEquals(parsed.memories.length, 1);
  assertEquals(parsed.memories[0].key, "a");

  await cleanup();
});

Deno.test("memory_list — returns message when empty", async () => {
  const { ctx, cleanup } = makeContext();
  const executor = createMemoryToolExecutor(ctx);

  const result = await executor("memory_list", {});
  assertEquals(result, "No memories found.");

  await cleanup();
});

Deno.test("memory_delete — soft-deletes a memory", async () => {
  const { ctx, cleanup } = makeContext();
  const executor = createMemoryToolExecutor(ctx);

  await executor("memory_save", { key: "temp", content: "Temporary" });

  const delResult = await executor("memory_delete", { key: "temp" });
  const parsed = JSON.parse(delResult!);
  assertEquals(parsed.deleted, true);

  // Verify it's gone from get
  const getResult = await executor("memory_get", { key: "temp" });
  const getParsed = JSON.parse(getResult!);
  assertEquals(getParsed.found, false);

  await cleanup();
});

Deno.test("memory_delete — returns error for missing key", async () => {
  const { ctx, cleanup } = makeContext();
  const executor = createMemoryToolExecutor(ctx);

  const result = await executor("memory_delete", { key: "nonexistent" });
  assertStringIncludes(result!, "Error");

  await cleanup();
});

Deno.test("unknown tool — returns null (fall-through)", async () => {
  const { ctx, cleanup } = makeContext();
  const executor = createMemoryToolExecutor(ctx);

  const result = await executor("unknown_tool", {});
  assertEquals(result, null);

  await cleanup();
});
