/**
 * Tests for NotionDatabasesService — query and create.
 *
 * @module
 */

import { assertEquals } from "@std/assert";
import type { NotionClient } from "../../../src/integrations/notion/client.ts";
import type { Result } from "../../../src/core/types/classification.ts";
import type { NotionError } from "../../../src/integrations/notion/types.ts";
import { createNotionDatabasesService } from "../../../src/integrations/notion/databases.ts";

function createMockClient(responses: Record<string, unknown>): NotionClient {
  return {
    request: <T>(_method: string, path: string, _body?: unknown): Promise<Result<T, NotionError>> => {
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

Deno.test("query: returns page results", async () => {
  const client = createMockClient({
    "/databases/d1/query": {
      results: [{
        id: "p1",
        url: "https://notion.so/p1",
        parent: { type: "database_id", database_id: "d1" },
        archived: false,
        properties: {
          Name: { type: "title", title: [{ plain_text: "Row 1" }] },
        },
        last_edited_time: "2024-01-01",
      }],
      next_cursor: null,
      has_more: false,
    },
  });

  const service = createNotionDatabasesService(client);
  const result = await service.query("d1", undefined, "INTERNAL");

  assertEquals(result.ok, true);
  if (!result.ok) return;
  assertEquals(result.value.results.length, 1);
  assertEquals(result.value.results[0].id, "p1");
  assertEquals(result.value.results[0].title, "Row 1");
  assertEquals(result.value.results[0].parentType, "database_id");
  assertEquals(result.value.results[0].classification, "INTERNAL");
  assertEquals(result.value.nextCursor, null);
});

Deno.test("query: handles empty results", async () => {
  const client = createMockClient({
    "/databases/d2/query": {
      results: [],
      next_cursor: null,
      has_more: false,
    },
  });

  const service = createNotionDatabasesService(client);
  const result = await service.query("d2", undefined, "PUBLIC");

  assertEquals(result.ok, true);
  if (!result.ok) return;
  assertEquals(result.value.results.length, 0);
  assertEquals(result.value.nextCursor, null);
});

Deno.test("create: returns created database", async () => {
  const client = createMockClient({
    "/databases": {
      id: "d1",
      title: [{ plain_text: "My DB" }],
      url: "https://notion.so/d1",
      parent: { page_id: "p1" },
      properties: {
        Name: { id: "title", type: "title", name: "Name" },
      },
    },
  });

  const service = createNotionDatabasesService(client);
  const result = await service.create(
    "p1",
    {
      title: "My DB",
      properties: { Name: { title: {} } },
    },
    "CONFIDENTIAL",
  );

  assertEquals(result.ok, true);
  if (!result.ok) return;
  assertEquals(result.value.id, "d1");
  assertEquals(result.value.title, "My DB");
  assertEquals(result.value.url, "https://notion.so/d1");
  assertEquals(result.value.parentId, "p1");
  assertEquals(result.value.properties.Name.type, "title");
  assertEquals(result.value.classification, "CONFIDENTIAL");
});
