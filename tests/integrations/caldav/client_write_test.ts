/**
 * @module
 *
 * CalDAV HTTP client write operation and URL resolution tests.
 *
 * Tests PUT (create/update), DELETE operations, ETag handling,
 * conflict detection, and URL resolution.
 */
import { assertEquals } from "@std/assert";
import { createCalDavClient } from "../../../src/integrations/caldav/client.ts";

/** Create a mock fetch function from a handler. */
function createMockFetch(
  handler: (url: string, init: RequestInit) => Response,
): typeof fetch {
  return ((url: string | URL | Request, init?: RequestInit) => {
    const urlStr = typeof url === "string" ? url : url instanceof URL ? url.toString() : url.url;
    return Promise.resolve(handler(urlStr, init ?? {}));
  }) as typeof fetch;
}

/** Create a 207 Multi-Status response with XML body. */
function multiStatusResponse(xml: string): Response {
  return new Response(xml, {
    status: 207,
    headers: { "Content-Type": "application/xml" },
  });
}

// ─── PUT Tests ────────────────────────────────────────────────────────────────

Deno.test("client: PUT sends iCal data with If-None-Match for create", async () => {
  let capturedHeaders: Record<string, string> = {};
  let capturedBody = "";

  const mockFetch = createMockFetch((_url, init) => {
    capturedHeaders = Object.fromEntries(
      Object.entries(init.headers ?? {}),
    );
    capturedBody = typeof init.body === "string" ? init.body : "";
    return new Response("", {
      status: 201,
      headers: { ETag: '"new-etag-456"' },
    });
  });

  const client = createCalDavClient({
    baseUrl: "https://caldav.example.com",
    authHeaders: {},
    fetchFn: mockFetch,
  });

  const icalData = "BEGIN:VCALENDAR\r\nBEGIN:VEVENT\r\nEND:VEVENT\r\nEND:VCALENDAR\r\n";
  const result = await client.put("/calendars/user/default/event.ics", icalData);

  assertEquals(capturedHeaders["Content-Type"], "text/calendar; charset=utf-8");
  assertEquals(capturedHeaders["If-None-Match"], "*");
  assertEquals(capturedBody, icalData);
  assertEquals(result.ok, true);
  if (result.ok) {
    assertEquals(result.value.etag, "new-etag-456");
  }
});

Deno.test("client: PUT sends If-Match for update with ETag", async () => {
  let capturedHeaders: Record<string, string> = {};

  const mockFetch = createMockFetch((_url, init) => {
    capturedHeaders = Object.fromEntries(
      Object.entries(init.headers ?? {}),
    );
    return new Response(null, {
      status: 204,
      headers: { ETag: '"updated-etag"' },
    });
  });

  const client = createCalDavClient({
    baseUrl: "https://caldav.example.com",
    authHeaders: {},
    fetchFn: mockFetch,
  });

  const result = await client.put(
    "/calendars/user/default/event.ics",
    "BEGIN:VCALENDAR\r\nEND:VCALENDAR\r\n",
    "old-etag",
  );

  assertEquals(capturedHeaders["If-Match"], '"old-etag"');
  assertEquals(result.ok, true);
});

Deno.test("client: PUT returns error on 412 conflict", async () => {
  const mockFetch = createMockFetch(() =>
    new Response("Precondition Failed", { status: 412 })
  );

  const client = createCalDavClient({
    baseUrl: "https://caldav.example.com",
    authHeaders: {},
    fetchFn: mockFetch,
  });

  const result = await client.put(
    "/calendars/user/default/event.ics",
    "data",
    "stale-etag",
  );

  assertEquals(result.ok, false);
  if (!result.ok) {
    assertEquals(result.error.status, 412);
  }
});

// ─── DELETE Tests ─────────────────────────────────────────────────────────────

Deno.test("client: DELETE sends If-Match header with ETag", async () => {
  let capturedHeaders: Record<string, string> = {};

  const mockFetch = createMockFetch((_url, init) => {
    capturedHeaders = Object.fromEntries(
      Object.entries(init.headers ?? {}),
    );
    return new Response(null, { status: 204 });
  });

  const client = createCalDavClient({
    baseUrl: "https://caldav.example.com",
    authHeaders: {},
    fetchFn: mockFetch,
  });

  const result = await client.deleteResource(
    "/calendars/user/default/event.ics",
    "etag-to-delete",
  );

  assertEquals(capturedHeaders["If-Match"], '"etag-to-delete"');
  assertEquals(result.ok, true);
});

Deno.test("client: DELETE handles error response", async () => {
  const mockFetch = createMockFetch(() =>
    new Response("Not Found", { status: 404 })
  );

  const client = createCalDavClient({
    baseUrl: "https://caldav.example.com",
    authHeaders: {},
    fetchFn: mockFetch,
  });

  const result = await client.deleteResource("/calendars/user/default/missing.ics");
  assertEquals(result.ok, false);
  if (!result.ok) {
    assertEquals(result.error.status, 404);
  }
});

// ─── URL Resolution ───────────────────────────────────────────────────────────

Deno.test("client: resolves relative URLs against base", async () => {
  let capturedUrl = "";

  const mockFetch = createMockFetch((url) => {
    capturedUrl = url;
    return multiStatusResponse("<d:multistatus xmlns:d='DAV:'></d:multistatus>");
  });

  const client = createCalDavClient({
    baseUrl: "https://caldav.example.com",
    authHeaders: {},
    fetchFn: mockFetch,
  });

  await client.propfind("/calendars/user/", "0", []);
  assertEquals(capturedUrl, "https://caldav.example.com/calendars/user/");
});

Deno.test("client: passes through absolute URLs", async () => {
  let capturedUrl = "";

  const mockFetch = createMockFetch((url) => {
    capturedUrl = url;
    return multiStatusResponse("<d:multistatus xmlns:d='DAV:'></d:multistatus>");
  });

  const client = createCalDavClient({
    baseUrl: "https://caldav.example.com",
    authHeaders: {},
    fetchFn: mockFetch,
  });

  await client.propfind("https://other.example.com/dav/", "0", []);
  assertEquals(capturedUrl, "https://other.example.com/dav/");
});
