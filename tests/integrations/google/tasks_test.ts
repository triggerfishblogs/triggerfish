/**
 * Google Tasks service unit tests.
 *
 * @module
 */

import { assertEquals } from "@std/assert";
import { createTasksService } from "../../../src/integrations/google/tasks/tasks.ts";
import type { GoogleApiClient, GoogleApiResult } from "../../../src/integrations/google/types.ts";

function createMockClient(
  responses: Record<string, GoogleApiResult<unknown>>,
): GoogleApiClient {
  function findResponse(url: string): GoogleApiResult<unknown> {
    for (const [key, value] of Object.entries(responses)) {
      if (url.includes(key)) return value;
    }
    return { ok: false, error: { code: "NOT_FOUND", message: `No mock for: ${url}` } };
  }

  return {
    get<T>(url: string, _params?: Record<string, string>): Promise<GoogleApiResult<T>> {
      return Promise.resolve(findResponse(url) as GoogleApiResult<T>);
    },
    post<T>(url: string, _body: unknown): Promise<GoogleApiResult<T>> {
      return Promise.resolve(findResponse(url) as GoogleApiResult<T>);
    },
    patch<T>(url: string, _body: unknown): Promise<GoogleApiResult<T>> {
      return Promise.resolve(findResponse(url) as GoogleApiResult<T>);
    },
    put<T>(url: string, _body: unknown): Promise<GoogleApiResult<T>> {
      return Promise.resolve(findResponse(url) as GoogleApiResult<T>);
    },
  };
}

Deno.test("TasksService.list: returns tasks", async () => {
  const client = createMockClient({
    "/tasks": {
      ok: true,
      value: {
        items: [
          { id: "t1", title: "Buy groceries", status: "needsAction" },
          { id: "t2", title: "Walk dog", status: "completed", completed: "2025-01-15" },
        ],
      },
    },
  });
  const tasks = createTasksService(client);

  const result = await tasks.list({});
  assertEquals(result.ok, true);
  if (result.ok) {
    assertEquals(result.value.length, 2);
    assertEquals(result.value[0].title, "Buy groceries");
    assertEquals(result.value[1].status, "completed");
  }
});

Deno.test("TasksService.list: returns empty when no tasks", async () => {
  const client = createMockClient({
    "/tasks": { ok: true, value: {} },
  });
  const tasks = createTasksService(client);

  const result = await tasks.list({});
  assertEquals(result.ok, true);
  if (result.ok) {
    assertEquals(result.value.length, 0);
  }
});

Deno.test("TasksService.create: returns created task", async () => {
  const client = createMockClient({
    "/tasks": {
      ok: true,
      value: { id: "t_new", title: "Read book", status: "needsAction" },
    },
  });
  const tasks = createTasksService(client);

  const result = await tasks.create({ title: "Read book" });
  assertEquals(result.ok, true);
  if (result.ok) {
    assertEquals(result.value.id, "t_new");
    assertEquals(result.value.title, "Read book");
  }
});

Deno.test("TasksService.complete: marks task as completed", async () => {
  const client = createMockClient({
    "/tasks/t1": {
      ok: true,
      value: { id: "t1", title: "Buy groceries", status: "completed" },
    },
  });
  const tasks = createTasksService(client);

  const result = await tasks.complete("t1");
  assertEquals(result.ok, true);
  if (result.ok) {
    assertEquals(result.value.status, "completed");
  }
});

Deno.test("TasksService.list: propagates API errors", async () => {
  const client = createMockClient({
    "/tasks": {
      ok: false,
      error: { code: "HTTP_500", message: "Server error", status: 500 },
    },
  });
  const tasks = createTasksService(client);

  const result = await tasks.list({});
  assertEquals(result.ok, false);
});
