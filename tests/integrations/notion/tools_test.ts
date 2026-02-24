import { assertEquals } from "@std/assert";
import {
  createNotionToolExecutor,
  getNotionToolDefinitions,
  NOTION_TOOLS_SYSTEM_PROMPT,
} from "../../../src/integrations/notion/tools.ts";
import type { NotionToolContext } from "../../../src/integrations/notion/tools.ts";
import type { SessionId } from "../../../src/core/types/session.ts";

/** Create a mock NotionToolContext with sensible defaults. */
function createMockContext(
  overrides?: Partial<NotionToolContext>,
): NotionToolContext {
  const defaultResult = () =>
    Promise.resolve({
      ok: true as const,
      value: { results: [], nextCursor: null },
    });

  return {
    pages: {
      search: overrides?.pages?.search ?? defaultResult,
      read: overrides?.pages?.read ??
        (() =>
          Promise.resolve({
            ok: true as const,
            value: {
              page: {
                id: "p1",
                title: "Test",
                url: "https://notion.so/test",
                parentType: "workspace" as const,
                parentId: "workspace",
                archived: false,
                properties: {},
                lastEditedTime: "2024-01-01",
                classification: "PUBLIC" as const,
              },
              content: [],
            },
          })),
      create: overrides?.pages?.create ??
        (() =>
          Promise.resolve({
            ok: true as const,
            value: {
              id: "p1",
              title: "Test",
              url: "https://notion.so/test",
              parentType: "workspace" as const,
              parentId: "workspace",
              archived: false,
              properties: {},
              lastEditedTime: "2024-01-01",
              classification: "PUBLIC" as const,
            },
          })),
      update: overrides?.pages?.update ??
        (() =>
          Promise.resolve({
            ok: true as const,
            value: {
              id: "p1",
              title: "Test",
              url: "https://notion.so/test",
              parentType: "workspace" as const,
              parentId: "workspace",
              archived: false,
              properties: {},
              lastEditedTime: "2024-01-01",
              classification: "PUBLIC" as const,
            },
          })),
    },
    databases: {
      query: overrides?.databases?.query ?? defaultResult,
      create: overrides?.databases?.create ??
        (() =>
          Promise.resolve({
            ok: true as const,
            value: {
              id: "d1",
              title: "DB",
              url: "https://notion.so/db",
              parentId: "workspace",
              properties: {},
              classification: "PUBLIC" as const,
            },
          })),
    },
    blocks: {
      readChildren: overrides?.blocks?.readChildren ?? defaultResult,
      append: overrides?.blocks?.append ??
        (() => Promise.resolve({ ok: true as const, value: [] })),
    },
    sessionTaint: () => "PUBLIC" as const,
    sourceSessionId: "test-session" as SessionId,
    ...overrides,
  };
}

// ─── getNotionToolDefinitions ────────────────────────────────────────────────

Deno.test("getNotionToolDefinitions: returns 8 tool definitions", () => {
  const defs = getNotionToolDefinitions();
  assertEquals(defs.length, 8);
});

Deno.test("getNotionToolDefinitions: all tools have notion. prefix", () => {
  const defs = getNotionToolDefinitions();
  for (const def of defs) {
    assertEquals(def.name.startsWith("notion."), true);
  }
});

Deno.test("getNotionToolDefinitions: all tools have descriptions", () => {
  const defs = getNotionToolDefinitions();
  for (const def of defs) {
    assertEquals(typeof def.description, "string");
    assertEquals(def.description.length > 0, true);
  }
});

Deno.test("getNotionToolDefinitions: expected tool names present", () => {
  const defs = getNotionToolDefinitions();
  const names = defs.map((d) => d.name);
  const expected = [
    "notion.search",
    "notion.pages.read",
    "notion.pages.create",
    "notion.pages.update",
    "notion.databases.query",
    "notion.databases.create",
    "notion.blocks.read",
    "notion.blocks.append",
  ];
  for (const name of expected) {
    assertEquals(names.includes(name), true, `Missing tool: ${name}`);
  }
});

// ─── NOTION_TOOLS_SYSTEM_PROMPT ──────────────────────────────────────────────

Deno.test("NOTION_TOOLS_SYSTEM_PROMPT: is a non-empty string", () => {
  assertEquals(typeof NOTION_TOOLS_SYSTEM_PROMPT, "string");
  assertEquals(NOTION_TOOLS_SYSTEM_PROMPT.length > 0, true);
});

// ─── createNotionToolExecutor ────────────────────────────────────────────────

Deno.test("createNotionToolExecutor: returns null for non-notion tools", async () => {
  const executor = createNotionToolExecutor(undefined);
  const result = await executor("web_search", {});
  assertEquals(result, null);
});

Deno.test("createNotionToolExecutor: returns null for unknown notion. tool", async () => {
  const ctx = createMockContext();
  const executor = createNotionToolExecutor(ctx);
  const result = await executor("notion.unknown", {});
  assertEquals(result, null);
});

Deno.test("createNotionToolExecutor: returns error when not configured", async () => {
  const executor = createNotionToolExecutor(undefined);
  const result = await executor("notion.search", { query: "test" });
  assertEquals(typeof result, "string");
  assertEquals(result!.includes("not configured"), true);
});

// ─── Parameter validation ────────────────────────────────────────────────────

Deno.test("executor: notion.search requires query param", async () => {
  const ctx = createMockContext();
  const executor = createNotionToolExecutor(ctx);
  const result = await executor("notion.search", {});
  assertEquals(typeof result, "string");
  assertEquals(result!.includes("query"), true);
});

Deno.test("executor: notion.pages.read requires page_id", async () => {
  const ctx = createMockContext();
  const executor = createNotionToolExecutor(ctx);
  const result = await executor("notion.pages.read", {});
  assertEquals(typeof result, "string");
  assertEquals(result!.includes("page_id"), true);
});

Deno.test("executor: notion.pages.create requires parent_id", async () => {
  const ctx = createMockContext();
  const executor = createNotionToolExecutor(ctx);
  const result = await executor("notion.pages.create", {
    title: "Test",
    parent_type: "page_id",
  });
  assertEquals(typeof result, "string");
  assertEquals(result!.includes("parent_id"), true);
});

Deno.test("executor: notion.pages.create requires title", async () => {
  const ctx = createMockContext();
  const executor = createNotionToolExecutor(ctx);
  const result = await executor("notion.pages.create", {
    parent_id: "abc",
    parent_type: "page_id",
  });
  assertEquals(typeof result, "string");
  assertEquals(result!.includes("title"), true);
});

Deno.test("executor: notion.databases.query requires database_id", async () => {
  const ctx = createMockContext();
  const executor = createNotionToolExecutor(ctx);
  const result = await executor("notion.databases.query", {});
  assertEquals(typeof result, "string");
  assertEquals(result!.includes("database_id"), true);
});

Deno.test("executor: notion.blocks.append requires content", async () => {
  const ctx = createMockContext();
  const executor = createNotionToolExecutor(ctx);
  const result = await executor("notion.blocks.append", { block_id: "b1" });
  assertEquals(typeof result, "string");
  assertEquals(result!.includes("content"), true);
});

// ─── Successful execution with mocks ─────────────────────────────────────────

Deno.test("executor: notion.search returns JSON with _classification", async () => {
  const ctx = createMockContext({
    pages: {
      search: () =>
        Promise.resolve({
          ok: true as const,
          value: {
            results: [{
              type: "page" as const,
              id: "p1",
              title: "Result",
              url: "https://notion.so/result",
              lastEditedTime: "2024-01-01",
            }],
            nextCursor: null,
          },
        }),
      read: createMockContext().pages.read,
      create: createMockContext().pages.create,
      update: createMockContext().pages.update,
    },
  });
  const executor = createNotionToolExecutor(ctx);
  const result = await executor("notion.search", { query: "test" });
  assertEquals(typeof result, "string");
  const parsed = JSON.parse(result!);
  assertEquals(parsed._classification, "PUBLIC");
  assertEquals(parsed.results.length, 1);
  assertEquals(parsed.results[0].id, "p1");
});

Deno.test("executor: notion.pages.read returns markdown content", async () => {
  const ctx = createMockContext();
  const executor = createNotionToolExecutor(ctx);
  const result = await executor("notion.pages.read", { page_id: "p1" });
  assertEquals(typeof result, "string");
  const parsed = JSON.parse(result!);
  assertEquals(parsed.title, "Test");
  assertEquals(typeof parsed.content, "string");
  assertEquals(parsed._classification, "PUBLIC");
});
