/**
 * Notion API client tests.
 *
 * Tests HTTP request construction, header injection, error handling,
 * and user-friendly error formatting.
 *
 * @module
 */

import { assertEquals, assertStringIncludes } from "@std/assert";
import {
  createNotionClient,
  formatNotionError,
} from "../../../src/integrations/notion/client.ts";
import type { NotionError } from "../../../src/integrations/notion/types.ts";

/** Create a mock fetch that returns a configurable response. */
function mockFetch(body: unknown, status = 200): typeof fetch {
  return (
    _url: string | URL | Request,
    _init?: RequestInit,
  ): Promise<Response> => {
    return Promise.resolve(
      new Response(JSON.stringify(body), {
        status,
        headers: { "Content-Type": "application/json" },
      }),
    );
  };
}

/** Create a capturing mock fetch that records the request URL and init. */
function capturingFetch(body: unknown, status = 200) {
  let capturedUrl = "";
  let capturedInit: RequestInit | undefined;
  const fetchFn: typeof fetch = (url, init) => {
    capturedUrl = String(url);
    capturedInit = init;
    return Promise.resolve(
      new Response(JSON.stringify(body), {
        status,
        headers: { "Content-Type": "application/json" },
      }),
    );
  };
  return {
    fetchFn,
    getCaptured: () => ({ url: capturedUrl, init: capturedInit }),
  };
}

// ─── createNotionClient ─────────────────────────────────────────────────────

Deno.test("createNotionClient: sends correct auth headers", async () => {
  const { fetchFn, getCaptured } = capturingFetch({ ok: true });

  const client = createNotionClient({
    token: "ntn_test_token",
    fetchFn,
    rateLimitPerSecond: 1000,
  });

  await client.request("GET", "/pages/abc123");

  const { init } = getCaptured();
  const headers = init?.headers as Record<string, string>;
  assertEquals(headers["Authorization"], "Bearer ntn_test_token");
  assertEquals(headers["Notion-Version"], "2022-06-28");
});

Deno.test("createNotionClient: uses custom baseUrl", async () => {
  const { fetchFn, getCaptured } = capturingFetch({ id: "page1" });

  const client = createNotionClient({
    token: "ntn_tok",
    baseUrl: "https://custom.notion.api/v2",
    fetchFn,
    rateLimitPerSecond: 1000,
  });

  await client.request("GET", "/pages/page1");

  const { url } = getCaptured();
  assertStringIncludes(url, "https://custom.notion.api/v2/pages/page1");
});

Deno.test("createNotionClient: returns parsed JSON on success", async () => {
  const responseBody = { id: "page-123", object: "page" };
  const client = createNotionClient({
    token: "ntn_tok",
    fetchFn: mockFetch(responseBody, 200),
    rateLimitPerSecond: 1000,
  });

  const result = await client.request<{ id: string; object: string }>(
    "GET",
    "/pages/page-123",
  );

  assertEquals(result.ok, true);
  if (result.ok) {
    assertEquals(result.value.id, "page-123");
    assertEquals(result.value.object, "page");
  }
});

Deno.test("createNotionClient: returns error on 401", async () => {
  const errorBody = { code: "unauthorized", message: "API token is invalid" };
  const client = createNotionClient({
    token: "ntn_bad",
    fetchFn: mockFetch(errorBody, 401),
    rateLimitPerSecond: 1000,
  });

  const result = await client.request("GET", "/pages/abc");

  assertEquals(result.ok, false);
  if (!result.ok) {
    assertEquals(result.error.status, 401);
    assertEquals(result.error.code, "unauthorized");
    assertStringIncludes(result.error.message, "API token is invalid");
  }
});

Deno.test("createNotionClient: returns error on 404", async () => {
  const errorBody = {
    code: "object_not_found",
    message: "Could not find page with ID abc",
  };
  const client = createNotionClient({
    token: "ntn_tok",
    fetchFn: mockFetch(errorBody, 404),
    rateLimitPerSecond: 1000,
  });

  const result = await client.request("GET", "/pages/abc");

  assertEquals(result.ok, false);
  if (!result.ok) {
    assertEquals(result.error.status, 404);
    assertEquals(result.error.code, "object_not_found");
  }
});

Deno.test("createNotionClient: returns network error on fetch failure", async () => {
  const failingFetch: typeof fetch = () => {
    throw new Error("DNS resolution failed");
  };
  const client = createNotionClient({
    token: "ntn_tok",
    fetchFn: failingFetch,
    rateLimitPerSecond: 1000,
  });

  const result = await client.request("GET", "/pages/abc");

  assertEquals(result.ok, false);
  if (!result.ok) {
    assertEquals(result.error.status, 0);
    assertEquals(result.error.code, "network_error");
    assertStringIncludes(result.error.message, "DNS resolution failed");
  }
});

Deno.test("createNotionClient: handles 204 no content", async () => {
  const noContentFetch: typeof fetch = () => {
    return Promise.resolve(
      new Response(null, { status: 204 }),
    );
  };
  const client = createNotionClient({
    token: "ntn_tok",
    fetchFn: noContentFetch,
    rateLimitPerSecond: 1000,
  });

  const result = await client.request("DELETE", "/blocks/abc");

  assertEquals(result.ok, true);
  if (result.ok) {
    assertEquals(result.value, undefined);
  }
});

// ─── formatNotionError ──────────────────────────────────────────────────────

Deno.test("formatNotionError: formats 401 with reauth hint", () => {
  const error: NotionError = {
    status: 401,
    code: "unauthorized",
    message: "API token is invalid",
  };

  const formatted = formatNotionError(error);

  assertStringIncludes(formatted, "authentication failed");
  assertStringIncludes(formatted, "triggerfish connect notion");
});

Deno.test("formatNotionError: formats 404 with share hint", () => {
  const error: NotionError = {
    status: 404,
    code: "object_not_found",
    message: "Could not find page",
  };

  const formatted = formatNotionError(error);

  assertStringIncludes(formatted, "not found");
  assertStringIncludes(formatted, "shared with your integration");
});

Deno.test("formatNotionError: formats rate limit error", () => {
  const error: NotionError = {
    status: 429,
    code: "rate_limited",
    message: "Rate limited",
  };

  const formatted = formatNotionError(error);

  assertStringIncludes(formatted, "rate limit");
});
