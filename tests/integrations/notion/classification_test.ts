/**
 * Tests for classification behavior of the Notion tool executor.
 *
 * Verifies that _classification in tool output reflects the resolved
 * classification from session taint and classification floor.
 *
 * @module
 */

import { assertEquals } from "@std/assert";
import { createNotionToolExecutor } from "../../../src/integrations/notion/tools.ts";
import type { NotionToolContext } from "../../../src/integrations/notion/tool_context.ts";
import type { SessionId } from "../../../src/core/types/session.ts";
import type { ClassificationLevel } from "../../../src/core/types/classification.ts";

/** Build a mock NotionToolContext with configurable taint and floor. */
function createMockContext(opts: {
  readonly taint: ClassificationLevel;
  readonly floor?: ClassificationLevel;
}): NotionToolContext {
  const defaultResult = () =>
    Promise.resolve({
      ok: true as const,
      value: { results: [], nextCursor: null },
    });

  return {
    pages: {
      search: () =>
        Promise.resolve({
          ok: true as const,
          value: {
            results: [{
              type: "page" as const,
              id: "p1",
              title: "Test",
              url: "https://notion.so/test",
              lastEditedTime: "2024-01-01",
            }],
            nextCursor: null,
          },
        }),
      read: (_id: string, classification: ClassificationLevel) =>
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
              classification,
            },
            content: [],
          },
        }),
      create: (_opts: unknown, classification: ClassificationLevel) =>
        Promise.resolve({
          ok: true as const,
          value: {
            id: "p1",
            title: "New",
            url: "https://notion.so/new",
            parentType: "page_id" as const,
            parentId: "p0",
            archived: false,
            properties: {},
            lastEditedTime: "2024-01-01",
            classification,
          },
        }),
      update: (
        _id: string,
        _opts: unknown,
        classification: ClassificationLevel,
      ) =>
        Promise.resolve({
          ok: true as const,
          value: {
            id: "p1",
            title: "Updated",
            url: "https://notion.so/updated",
            parentType: "workspace" as const,
            parentId: "workspace",
            archived: false,
            properties: {},
            lastEditedTime: "2024-01-01",
            classification,
          },
        }),
    },
    databases: {
      query: (
        _id: string,
        _opts: unknown,
        classification: ClassificationLevel,
      ) =>
        Promise.resolve({
          ok: true as const,
          value: {
            results: [{
              id: "r1",
              title: "Row",
              url: "https://notion.so/r1",
              parentType: "database_id" as const,
              parentId: "d1",
              archived: false,
              properties: {},
              lastEditedTime: "2024-01-01",
              classification,
            }],
            nextCursor: null,
          },
        }),
      create: (
        _id: string,
        _opts: unknown,
        classification: ClassificationLevel,
      ) =>
        Promise.resolve({
          ok: true as const,
          value: {
            id: "d1",
            title: "DB",
            url: "https://notion.so/db",
            parentId: "p1",
            properties: {},
            classification,
          },
        }),
    },
    blocks: {
      readChildren: defaultResult,
      append: () => Promise.resolve({ ok: true as const, value: [] }),
    },
    sessionTaint: () => opts.taint,
    sourceSessionId: "test-session" as SessionId,
    classificationFloor: opts.floor,
  };
}

Deno.test("classification: search results include session taint classification", async () => {
  const ctx = createMockContext({ taint: "INTERNAL" });
  const executor = createNotionToolExecutor(ctx);
  const result = await executor("notion.search", { query: "test" });
  const parsed = JSON.parse(result!);
  assertEquals(parsed._classification, "INTERNAL");
});

Deno.test("classification: pages.read uses session taint", async () => {
  const ctx = createMockContext({ taint: "INTERNAL" });
  const executor = createNotionToolExecutor(ctx);
  const result = await executor("notion.pages.read", { page_id: "p1" });
  const parsed = JSON.parse(result!);
  assertEquals(parsed._classification, "INTERNAL");
});

Deno.test("classification: classification floor overrides when higher", async () => {
  const ctx = createMockContext({
    taint: "PUBLIC",
    floor: "CONFIDENTIAL",
  });
  const executor = createNotionToolExecutor(ctx);
  const result = await executor("notion.search", { query: "test" });
  const parsed = JSON.parse(result!);
  assertEquals(parsed._classification, "CONFIDENTIAL");
});

Deno.test("classification: session taint overrides when higher than floor", async () => {
  const ctx = createMockContext({
    taint: "CONFIDENTIAL",
    floor: "PUBLIC",
  });
  const executor = createNotionToolExecutor(ctx);
  const result = await executor("notion.search", { query: "test" });
  const parsed = JSON.parse(result!);
  assertEquals(parsed._classification, "CONFIDENTIAL");
});

Deno.test("classification: pages.create includes classification", async () => {
  const ctx = createMockContext({ taint: "INTERNAL" });
  const executor = createNotionToolExecutor(ctx);
  const result = await executor("notion.pages.create", {
    parent_id: "p0",
    parent_type: "page_id",
    title: "New Page",
  });
  const parsed = JSON.parse(result!);
  assertEquals(parsed._classification, "INTERNAL");
});

Deno.test("classification: databases.query includes classification", async () => {
  const ctx = createMockContext({ taint: "INTERNAL" });
  const executor = createNotionToolExecutor(ctx);
  const result = await executor("notion.databases.query", {
    database_id: "d1",
  });
  const parsed = JSON.parse(result!);
  assertEquals(parsed._classification, "INTERNAL");
});
