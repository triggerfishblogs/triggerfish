/**
 * Tests for NotionBlocksService — readChildren and append.
 *
 * @module
 */

import { assertEquals } from "@std/assert";
import type { NotionClient } from "../../../src/integrations/notion/client.ts";
import type { Result } from "../../../src/core/types/classification.ts";
import type { NotionError } from "../../../src/integrations/notion/types.ts";
import { createNotionBlocksService } from "../../../src/integrations/notion/blocks.ts";

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

Deno.test("readChildren: returns block list", async () => {
  const client = createMockClient({
    "/blocks/p1/children": {
      results: [{
        id: "b1",
        type: "paragraph",
        has_children: false,
        paragraph: {
          rich_text: [{
            plain_text: "Hello",
            type: "text",
            text: { content: "Hello" },
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

  const service = createNotionBlocksService(client);
  const result = await service.readChildren("p1");

  assertEquals(result.ok, true);
  if (!result.ok) return;
  assertEquals(result.value.results.length, 1);
  assertEquals(result.value.results[0].id, "b1");
  assertEquals(result.value.results[0].type, "paragraph");
  assertEquals(result.value.results[0].hasChildren, false);
  assertEquals(result.value.results[0].content.richText?.[0].text, "Hello");
  assertEquals(result.value.nextCursor, null);
});

Deno.test("readChildren: handles pagination cursor", async () => {
  const client = createMockClient({
    "/blocks/p1/children": {
      results: [{
        id: "b1",
        type: "paragraph",
        has_children: false,
        paragraph: { rich_text: [] },
      }],
      next_cursor: "cursor-abc",
      has_more: true,
    },
  });

  const service = createNotionBlocksService(client);
  const result = await service.readChildren("p1");

  assertEquals(result.ok, true);
  if (!result.ok) return;
  assertEquals(result.value.nextCursor, "cursor-abc");
  assertEquals(result.value.results.length, 1);
});

Deno.test("append: returns appended blocks", async () => {
  const client = createMockClient({
    "/blocks/p1/children": {
      results: [{
        id: "b2",
        type: "paragraph",
        has_children: false,
        paragraph: { rich_text: [] },
      }],
    },
  });

  const service = createNotionBlocksService(client);
  const result = await service.append("p1", [{
    id: "",
    type: "paragraph",
    hasChildren: false,
    content: {
      richText: [{
        type: "text" as const,
        text: "Appended text",
        annotations: {
          bold: false,
          italic: false,
          strikethrough: false,
          underline: false,
          code: false,
        },
        href: null,
      }],
    },
  }]);

  assertEquals(result.ok, true);
  if (!result.ok) return;
  assertEquals(result.value.length, 1);
  assertEquals(result.value[0].id, "b2");
  assertEquals(result.value[0].type, "paragraph");
});
