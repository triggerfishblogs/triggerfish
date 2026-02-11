/**
 * Phase A1: Web Search Provider Tests
 *
 * Tests SearchProvider interface contract, Brave provider request
 * construction, error handling, and option propagation.
 */
import { assertEquals } from "@std/assert";
import { createBraveSearchProvider } from "../../src/web/search.ts";
import type { SearchProvider } from "../../src/web/search.ts";

// ─── SearchProvider Interface Contract ──────────────────────────────────────

Deno.test("BraveSearchProvider: has correct id and name", () => {
  const provider: SearchProvider = createBraveSearchProvider({
    apiKey: "test-key",
  });
  assertEquals(provider.id, "brave");
  assertEquals(provider.name, "Brave Search");
});

// ─── Empty Query ────────────────────────────────────────────────────────────

Deno.test("BraveSearchProvider: empty query returns error", async () => {
  const provider = createBraveSearchProvider({ apiKey: "test-key" });
  const result = await provider.search("");
  assertEquals(result.ok, false);
  if (!result.ok) {
    assertEquals(result.error, "Search query cannot be empty");
  }
});

Deno.test("BraveSearchProvider: whitespace-only query returns error", async () => {
  const provider = createBraveSearchProvider({ apiKey: "test-key" });
  const result = await provider.search("   ");
  assertEquals(result.ok, false);
});

// ─── Mock Fetch: Successful Response ────────────────────────────────────────

Deno.test("BraveSearchProvider: parses successful response", async () => {
  const mockResponse = {
    web: {
      results: [
        {
          title: "Example Page",
          url: "https://example.com",
          description: "An example page.",
          page_age: "2024-01-15",
        },
        {
          title: "Another Page",
          url: "https://another.com",
          description: "Another page.",
        },
      ],
      totalEstimatedMatches: 100,
    },
  };

  const mockEndpoint = "https://mock.api.test/search";
  const provider = createBraveSearchProvider({
    apiKey: "test-key-123",
    endpoint: mockEndpoint,
  });

  const originalFetch = globalThis.fetch;
  let capturedUrl = "";
  let capturedHeaders: Record<string, string> = {};

  globalThis.fetch = ((
    input: string | URL | Request,
    init?: RequestInit,
  ) => {
    capturedUrl = typeof input === "string" ? input : input.toString();
    capturedHeaders = {};
    if (init?.headers) {
      const h = init.headers as Record<string, string>;
      for (const [k, v] of Object.entries(h)) {
        capturedHeaders[k] = v;
      }
    }
    return Promise.resolve(
      new Response(JSON.stringify(mockResponse), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
  }) as typeof fetch;

  try {
    const result = await provider.search("test query", { maxResults: 5 });

    assertEquals(capturedUrl.startsWith(mockEndpoint), true);
    assertEquals(capturedUrl.includes("q=test+query"), true);
    assertEquals(capturedUrl.includes("count=5"), true);
    assertEquals(capturedHeaders["X-Subscription-Token"], "test-key-123");

    assertEquals(result.ok, true);
    if (result.ok) {
      assertEquals(result.value.query, "test query");
      assertEquals(result.value.results.length, 2);
      assertEquals(result.value.results[0].title, "Example Page");
      assertEquals(result.value.results[0].url, "https://example.com");
      assertEquals(result.value.results[0].snippet, "An example page.");
      assertEquals(result.value.results[0].publishedDate, "2024-01-15");
      assertEquals(result.value.results[1].publishedDate, undefined);
      assertEquals(result.value.totalEstimate, 100);
    }
  } finally {
    globalThis.fetch = originalFetch;
  }
});

// ─── Mock Fetch: API Error ──────────────────────────────────────────────────

Deno.test("BraveSearchProvider: handles API error response", async () => {
  const provider = createBraveSearchProvider({
    apiKey: "bad-key",
    endpoint: "https://mock.api.test/search",
  });

  const originalFetch = globalThis.fetch;
  globalThis.fetch = (() =>
    Promise.resolve(
      new Response("Unauthorized", { status: 401 }),
    )) as unknown as typeof fetch;

  try {
    const result = await provider.search("test");
    assertEquals(result.ok, false);
    if (!result.ok) {
      assertEquals(result.error.includes("401"), true);
    }
  } finally {
    globalThis.fetch = originalFetch;
  }
});

// ─── Mock Fetch: Network Error ──────────────────────────────────────────────

Deno.test("BraveSearchProvider: handles network error", async () => {
  const provider = createBraveSearchProvider({
    apiKey: "test-key",
    endpoint: "https://mock.api.test/search",
  });

  const originalFetch = globalThis.fetch;
  globalThis.fetch = (() =>
    Promise.reject(new Error("Network unreachable"))) as unknown as typeof fetch;

  try {
    const result = await provider.search("test");
    assertEquals(result.ok, false);
    if (!result.ok) {
      assertEquals(result.error.includes("Network unreachable"), true);
    }
  } finally {
    globalThis.fetch = originalFetch;
  }
});

// ─── Option Propagation ─────────────────────────────────────────────────────

Deno.test("BraveSearchProvider: respects safeSearch and language options", async () => {
  const provider = createBraveSearchProvider({
    apiKey: "test-key",
    endpoint: "https://mock.api.test/search",
  });

  const originalFetch = globalThis.fetch;
  let capturedUrl = "";

  globalThis.fetch = ((input: string | URL | Request) => {
    capturedUrl = typeof input === "string" ? input : input.toString();
    return Promise.resolve(
      new Response(JSON.stringify({ web: { results: [] } }), { status: 200 }),
    );
  }) as typeof fetch;

  try {
    await provider.search("test", {
      safeSearch: "strict",
      language: "en",
      region: "US",
      maxResults: 10,
    });

    assertEquals(capturedUrl.includes("safesearch=strict"), true);
    assertEquals(capturedUrl.includes("search_lang=en"), true);
    assertEquals(capturedUrl.includes("country=US"), true);
    assertEquals(capturedUrl.includes("count=10"), true);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

// ─── Max Results Clamping ───────────────────────────────────────────────────

Deno.test("BraveSearchProvider: clamps maxResults to 20", async () => {
  const provider = createBraveSearchProvider({
    apiKey: "test-key",
    endpoint: "https://mock.api.test/search",
  });

  const originalFetch = globalThis.fetch;
  let capturedUrl = "";

  globalThis.fetch = ((input: string | URL | Request) => {
    capturedUrl = typeof input === "string" ? input : input.toString();
    return Promise.resolve(
      new Response(JSON.stringify({ web: { results: [] } }), { status: 200 }),
    );
  }) as typeof fetch;

  try {
    await provider.search("test", { maxResults: 100 });
    assertEquals(capturedUrl.includes("count=20"), true);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
