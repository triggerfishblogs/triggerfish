/**
 * Phase A1: Web Search Provider Tests
 *
 * Tests SearchProvider interface contract, Brave provider request
 * construction, error handling, and option propagation.
 */
import { assertEquals, assertGreaterOrEqual, assertLessOrEqual } from "@std/assert";
import { createBraveSearchProvider, createRateLimitedSearchProvider } from "../../../src/tools/web/search.ts";
import type { SearchProvider, SearchResult } from "../../../src/tools/web/search.ts";
import type { Result } from "../../../src/core/types/classification.ts";

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

// ─── Rate-Limited Search Provider ────────────────────────────────────────────

/** Create a fake SearchProvider that records call timestamps. */
function createMockProvider(): SearchProvider & { readonly calls: number[] } {
  const calls: number[] = [];
  return {
    id: "mock",
    name: "Mock Search",
    calls,
    search(
      query: string,
    ): Promise<Result<SearchResult, string>> {
      calls.push(Date.now());
      return Promise.resolve({
        ok: true,
        value: { query, results: [] },
      });
    },
  };
}

/** Create a mock that rejects on specific call indices. */
function createFailingMockProvider(
  failOnIndices: ReadonlySet<number>,
): SearchProvider & { readonly calls: number[] } {
  const calls: number[] = [];
  let callIndex = 0;
  return {
    id: "failing-mock",
    name: "Failing Mock",
    calls,
    search(
      query: string,
    ): Promise<Result<SearchResult, string>> {
      const idx = callIndex++;
      calls.push(Date.now());
      if (failOnIndices.has(idx)) {
        return Promise.reject(new Error(`Simulated failure on call ${idx}`));
      }
      return Promise.resolve({ ok: true, value: { query, results: [] } });
    },
  };
}

Deno.test("RateLimitedSearchProvider: preserves id and name", () => {
  const mock = createMockProvider();
  const limited = createRateLimitedSearchProvider(mock, 10);
  assertEquals(limited.id, "mock");
  assertEquals(limited.name, "Mock Search");
});

Deno.test("RateLimitedSearchProvider: single call passes through immediately", async () => {
  const mock = createMockProvider();
  const limited = createRateLimitedSearchProvider(mock, 1);
  const before = Date.now();
  const result = await limited.search("hello");
  const elapsed = Date.now() - before;

  assertEquals(result.ok, true);
  assertEquals(mock.calls.length, 1);
  assertLessOrEqual(elapsed, 100); // should be near-instant
});

Deno.test("RateLimitedSearchProvider: two rapid calls enforce interval", async () => {
  const mock = createMockProvider();
  // 2 req/s → 500ms interval
  const limited = createRateLimitedSearchProvider(mock, 2);

  const p1 = limited.search("first");
  const p2 = limited.search("second");
  await Promise.all([p1, p2]);

  assertEquals(mock.calls.length, 2);
  const gap = mock.calls[1] - mock.calls[0];
  assertGreaterOrEqual(gap, 450); // 500ms - tolerance
});

Deno.test("RateLimitedSearchProvider: three concurrent calls serialize with correct spacing", async () => {
  const mock = createMockProvider();
  // 4 req/s → 250ms interval
  const limited = createRateLimitedSearchProvider(mock, 4);

  const p1 = limited.search("a");
  const p2 = limited.search("b");
  const p3 = limited.search("c");
  await Promise.all([p1, p2, p3]);

  assertEquals(mock.calls.length, 3);
  const gap1 = mock.calls[1] - mock.calls[0];
  const gap2 = mock.calls[2] - mock.calls[1];
  assertGreaterOrEqual(gap1, 200); // 250ms - tolerance
  assertGreaterOrEqual(gap2, 200);
});

Deno.test("RateLimitedSearchProvider: preserves search results", async () => {
  const mock: SearchProvider = {
    id: "custom",
    name: "Custom",
    search(query) {
      return Promise.resolve({
        ok: true as const,
        value: {
          query,
          results: [{ title: "Result", url: "https://example.com", snippet: "Snippet" }],
          totalEstimate: 42,
        },
      });
    },
  };

  const limited = createRateLimitedSearchProvider(mock, 10);
  const result = await limited.search("test");
  assertEquals(result.ok, true);
  if (result.ok) {
    assertEquals(result.value.query, "test");
    assertEquals(result.value.results.length, 1);
    assertEquals(result.value.results[0].title, "Result");
    assertEquals(result.value.totalEstimate, 42);
  }
});

Deno.test("RateLimitedSearchProvider: error in one call does not break subsequent calls", async () => {
  const mock = createFailingMockProvider(new Set([1])); // second call throws
  const limited = createRateLimitedSearchProvider(mock, 100); // fast rate for test speed

  const r1 = await limited.search("first");
  assertEquals(r1.ok, true);

  let threw = false;
  try {
    await limited.search("second");
  } catch {
    threw = true;
  }
  assertEquals(threw, true);

  // Third call should still work — queue not broken
  const r3 = await limited.search("third");
  assertEquals(r3.ok, true);
  assertEquals(mock.calls.length, 3);
});
