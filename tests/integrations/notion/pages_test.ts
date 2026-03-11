/**
 * Tests for NotionPagesService — search, read, create, update.
 *
 * @module
 */

import { assertEquals } from "@std/assert";
import type { NotionClient } from "../../../src/integrations/notion/client.ts";
import type { Result } from "../../../src/core/types/classification.ts";
import type { NotionError } from "../../../src/integrations/notion/types.ts";
import { createNotionPagesService } from "../../../src/integrations/notion/pages.ts";

function createMockClient(responses: Record<string, unknown>): NotionClient {
  return {
    request: <T>(
      _method: string,
      path: string,
      _body?: unknown,
    ): Promise<Result<T, NotionError>> => {
      const key = Object.keys(responses).find((k) => path.includes(k));
      if (key) {
        return Promise.resolve({ ok: true, value: responses[key] as T });
      }
      return Promise.resolve({
        ok: false,
        error: { status: 404, code: "not_found", message: "Not found" },
      });
    },
  };
}

Deno.test("search: returns search results", async () => {
  const client = createMockClient({
    "/search": {
      results: [{
        id: "p1",
        object: "page",
        url: "https://notion.so/p1",
        last_edited_time: "2024-01-01",
        properties: {
          Name: { type: "title", title: [{ plain_text: "Test Page" }] },
        },
      }],
      next_cursor: null,
      has_more: false,
    },
  });

  const service = createNotionPagesService(client);
  const result = await service.search("Test");

  assertEquals(result.ok, true);
  if (!result.ok) return;
  assertEquals(result.value.results.length, 1);
  assertEquals(result.value.results[0].title, "Test Page");
  assertEquals(result.value.results[0].id, "p1");
  assertEquals(result.value.results[0].type, "page");
  assertEquals(result.value.nextCursor, null);
});

Deno.test("search: passes filter for type", async () => {
  let capturedBody: unknown = null;
  const client: NotionClient = {
    request: <T>(
      _method: string,
      path: string,
      body?: unknown,
    ): Promise<Result<T, NotionError>> => {
      if (path.includes("/search")) {
        capturedBody = body;
        return Promise.resolve({
          ok: true,
          value: { results: [], next_cursor: null, has_more: false } as T,
        });
      }
      return Promise.resolve({
        ok: false,
        error: { status: 404, code: "not_found", message: "Not found" },
      });
    },
  };

  const service = createNotionPagesService(client);
  await service.search("query", { type: "database" });

  assertEquals(
    (capturedBody as Record<string, unknown>).filter,
    { value: "database", property: "object" },
  );
});

Deno.test("read: returns page with content", async () => {
  const client = createMockClient({
    "/pages/p1": {
      id: "p1",
      url: "https://notion.so/p1",
      parent: { type: "page_id", page_id: "parent1" },
      archived: false,
      properties: {
        Name: { type: "title", title: [{ plain_text: "My Page" }] },
      },
      last_edited_time: "2024-01-01",
    },
    "/blocks/p1/children": {
      results: [{
        id: "b1",
        type: "paragraph",
        has_children: false,
        paragraph: {
          rich_text: [{
            plain_text: "Hello world",
            type: "text",
            text: { content: "Hello world" },
            annotations: {
              bold: false,
              italic: false,
              strikethrough: false,
              underline: false,
              code: false,
            },
          }],
        },
      }],
      next_cursor: null,
      has_more: false,
    },
  });

  const service = createNotionPagesService(client);
  const result = await service.read("p1", "INTERNAL");

  assertEquals(result.ok, true);
  if (!result.ok) return;
  assertEquals(result.value.page.id, "p1");
  assertEquals(result.value.page.title, "My Page");
  assertEquals(result.value.page.classification, "INTERNAL");
  assertEquals(result.value.content.length, 1);
  assertEquals(result.value.content[0].type, "paragraph");
  assertEquals(
    result.value.content[0].content.richText?.[0].text,
    "Hello world",
  );
});

Deno.test("create: sends parent and title", async () => {
  const client = createMockClient({
    "/pages": {
      id: "new-p1",
      url: "https://notion.so/new-p1",
      parent: { type: "page_id", page_id: "parent1" },
      archived: false,
      properties: {
        title: { type: "title", title: [{ plain_text: "New Page" }] },
      },
      last_edited_time: "2024-01-02",
    },
  });

  const service = createNotionPagesService(client);
  const result = await service.create(
    { parentId: "parent1", parentType: "page_id", title: "New Page" },
    "PUBLIC",
  );

  assertEquals(result.ok, true);
  if (!result.ok) return;
  assertEquals(result.value.id, "new-p1");
  assertEquals(result.value.title, "New Page");
  assertEquals(result.value.classification, "PUBLIC");
});

Deno.test("update: sends properties", async () => {
  const client = createMockClient({
    "/pages/p1": {
      id: "p1",
      url: "https://notion.so/p1",
      parent: { type: "page_id", page_id: "parent1" },
      archived: false,
      properties: {
        Name: { type: "title", title: [{ plain_text: "Updated Page" }] },
      },
      last_edited_time: "2024-01-03",
    },
  });

  const service = createNotionPagesService(client);
  const result = await service.update(
    "p1",
    {
      properties: { Name: { title: [{ text: { content: "Updated Page" } }] } },
    },
    "CONFIDENTIAL",
  );

  assertEquals(result.ok, true);
  if (!result.ok) return;
  assertEquals(result.value.id, "p1");
  assertEquals(result.value.title, "Updated Page");
  assertEquals(result.value.classification, "CONFIDENTIAL");
});
