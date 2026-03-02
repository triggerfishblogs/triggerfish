/**
 * Google Calendar service unit tests.
 *
 * @module
 */

import { assertEquals } from "@std/assert";
import { createCalendarService } from "../../../src/integrations/google/calendar/calendar.ts";
import type {
  GoogleApiClient,
  GoogleApiResult,
} from "../../../src/integrations/google/types.ts";

function createMockClient(
  responses: Record<string, GoogleApiResult<unknown>>,
): GoogleApiClient {
  function findResponse(url: string): GoogleApiResult<unknown> {
    for (const [key, value] of Object.entries(responses)) {
      if (url.includes(key)) return value;
    }
    return {
      ok: false,
      error: { code: "NOT_FOUND", message: `No mock for: ${url}` },
    };
  }

  return {
    get<T>(
      url: string,
      _params?: Record<string, string>,
    ): Promise<GoogleApiResult<T>> {
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

Deno.test("CalendarService.list: returns events", async () => {
  const client = createMockClient({
    "/events": {
      ok: true,
      value: {
        items: [
          {
            id: "evt1",
            summary: "Standup",
            start: { dateTime: "2025-01-15T09:00:00Z" },
            end: { dateTime: "2025-01-15T09:30:00Z" },
          },
        ],
      },
    },
  });
  const calendar = createCalendarService(client);

  const result = await calendar.list({});
  assertEquals(result.ok, true);
  if (result.ok) {
    assertEquals(result.value.length, 1);
    assertEquals(result.value[0].summary, "Standup");
    assertEquals(result.value[0].start, "2025-01-15T09:00:00Z");
  }
});

Deno.test("CalendarService.list: returns empty when no events", async () => {
  const client = createMockClient({
    "/events": { ok: true, value: { items: [] } },
  });
  const calendar = createCalendarService(client);

  const result = await calendar.list({});
  assertEquals(result.ok, true);
  if (result.ok) {
    assertEquals(result.value.length, 0);
  }
});

Deno.test("CalendarService.create: returns created event", async () => {
  const client = createMockClient({
    "/events": {
      ok: true,
      value: {
        id: "evt_new",
        summary: "Lunch",
        start: { dateTime: "2025-01-15T12:00:00Z" },
        end: { dateTime: "2025-01-15T13:00:00Z" },
        htmlLink: "https://calendar.google.com/event/evt_new",
      },
    },
  });
  const calendar = createCalendarService(client);

  const result = await calendar.create({
    summary: "Lunch",
    start: "2025-01-15T12:00:00Z",
    end: "2025-01-15T13:00:00Z",
  });
  assertEquals(result.ok, true);
  if (result.ok) {
    assertEquals(result.value.id, "evt_new");
    assertEquals(result.value.summary, "Lunch");
  }
});

Deno.test("CalendarService.update: returns updated event", async () => {
  const client = createMockClient({
    "/events/evt1": {
      ok: true,
      value: {
        id: "evt1",
        summary: "Updated Standup",
        start: { dateTime: "2025-01-15T10:00:00Z" },
        end: { dateTime: "2025-01-15T10:30:00Z" },
      },
    },
  });
  const calendar = createCalendarService(client);

  const result = await calendar.update({
    eventId: "evt1",
    summary: "Updated Standup",
  });
  assertEquals(result.ok, true);
  if (result.ok) {
    assertEquals(result.value.summary, "Updated Standup");
  }
});

Deno.test("CalendarService.list: propagates API errors", async () => {
  const client = createMockClient({
    "/events": {
      ok: false,
      error: { code: "HTTP_401", message: "Unauthorized", status: 401 },
    },
  });
  const calendar = createCalendarService(client);

  const result = await calendar.list({});
  assertEquals(result.ok, false);
});
