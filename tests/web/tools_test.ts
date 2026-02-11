/**
 * Phase A1: Web Tools Tests
 *
 * Tests tool definitions shape, web_search executor, web_fetch executor,
 * and fall-through for unknown tools.
 */
import { assertEquals } from "@std/assert";
import {
  createWebToolExecutor,
  getWebToolDefinitions,
} from "../../src/web/tools.ts";
import type { SearchProvider, SearchResult } from "../../src/web/search.ts";
import type { WebFetcher, FetchResult } from "../../src/web/fetch.ts";
import type { Result } from "../../src/core/types/classification.ts";

// ─── Tool Definitions ───────────────────────────────────────────────────────

Deno.test("getWebToolDefinitions: returns web_search and web_fetch", () => {
  const defs = getWebToolDefinitions();
  assertEquals(defs.length, 2);

  const names = defs.map((d) => d.name);
  assertEquals(names.includes("web_search"), true);
  assertEquals(names.includes("web_fetch"), true);
});

Deno.test("getWebToolDefinitions: web_search has required query param", () => {
  const defs = getWebToolDefinitions();
  const search = defs.find((d) => d.name === "web_search")!;
  assertEquals(search.parameters.query.required, true);
  assertEquals(search.parameters.query.type, "string");
});

Deno.test("getWebToolDefinitions: web_fetch has required url param", () => {
  const defs = getWebToolDefinitions();
  const fetch = defs.find((d) => d.name === "web_fetch")!;
  assertEquals(fetch.parameters.url.required, true);
  assertEquals(fetch.parameters.url.type, "string");
});

// ─── Mock Providers ─────────────────────────────────────────────────────────

function createMockSearchProvider(
  results: Result<SearchResult, string>,
): SearchProvider {
  return {
    id: "mock",
    name: "Mock Search",
    search(): Promise<Result<SearchResult, string>> {
      return Promise.resolve(results);
    },
  };
}

function createMockWebFetcher(
  result: Result<FetchResult, string>,
): WebFetcher {
  return {
    fetch(): Promise<Result<FetchResult, string>> {
      return Promise.resolve(result);
    },
  };
}

// ─── web_search Executor ────────────────────────────────────────────────────

Deno.test("web_search executor: validates non-empty query", async () => {
  const executor = createWebToolExecutor(
    createMockSearchProvider({
      ok: true,
      value: { query: "test", results: [] },
    }),
    undefined,
  );

  const result = await executor("web_search", { query: "" });
  assertEquals(result !== null, true);
  assertEquals(result!.includes("Error"), true);
});

Deno.test("web_search executor: returns formatted results", async () => {
  const executor = createWebToolExecutor(
    createMockSearchProvider({
      ok: true,
      value: {
        query: "deno runtime",
        results: [
          {
            title: "Deno Home",
            url: "https://deno.land",
            snippet: "A modern runtime for JavaScript and TypeScript.",
          },
          {
            title: "Deno Manual",
            url: "https://docs.deno.com",
            snippet: "Official Deno documentation.",
          },
        ],
      },
    }),
    undefined,
  );

  const result = await executor("web_search", { query: "deno runtime" });
  assertEquals(result !== null, true);
  assertEquals(result!.includes("Deno Home"), true);
  assertEquals(result!.includes("https://deno.land"), true);
  assertEquals(result!.includes("Deno Manual"), true);
});

Deno.test("web_search executor: handles search error", async () => {
  const executor = createWebToolExecutor(
    createMockSearchProvider({ ok: false, error: "API rate limited" }),
    undefined,
  );

  const result = await executor("web_search", { query: "test" });
  assertEquals(result !== null, true);
  assertEquals(result!.includes("API rate limited"), true);
});

Deno.test("web_search executor: returns message when no provider", async () => {
  const executor = createWebToolExecutor(undefined, undefined);
  const result = await executor("web_search", { query: "test" });
  assertEquals(result !== null, true);
  assertEquals(result!.includes("not configured"), true);
});

Deno.test("web_search executor: handles empty results", async () => {
  const executor = createWebToolExecutor(
    createMockSearchProvider({
      ok: true,
      value: { query: "obscure query", results: [] },
    }),
    undefined,
  );

  const result = await executor("web_search", { query: "obscure query" });
  assertEquals(result !== null, true);
  assertEquals(result!.includes("No results found"), true);
});

// ─── web_fetch Executor ─────────────────────────────────────────────────────

Deno.test("web_fetch executor: validates non-empty url", async () => {
  const executor = createWebToolExecutor(
    undefined,
    createMockWebFetcher({
      ok: true,
      value: {
        url: "https://example.com",
        title: "Example",
        content: "Hello",
        contentType: "text/html",
        statusCode: 200,
        mode: "readability",
        byteLength: 5,
      },
    }),
  );

  const result = await executor("web_fetch", { url: "" });
  assertEquals(result !== null, true);
  assertEquals(result!.includes("Error"), true);
});

Deno.test("web_fetch executor: returns content with header", async () => {
  const executor = createWebToolExecutor(
    undefined,
    createMockWebFetcher({
      ok: true,
      value: {
        url: "https://example.com/article",
        title: "Great Article",
        content: "Article body text here.",
        contentType: "text/html",
        statusCode: 200,
        mode: "readability",
        byteLength: 500,
      },
    }),
  );

  const result = await executor("web_fetch", {
    url: "https://example.com/article",
  });
  assertEquals(result !== null, true);
  assertEquals(result!.includes("Great Article"), true);
  assertEquals(result!.includes("Article body text here."), true);
  assertEquals(result!.includes("readability"), true);
});

Deno.test("web_fetch executor: handles fetch error", async () => {
  const executor = createWebToolExecutor(
    undefined,
    createMockWebFetcher({
      ok: false,
      error: "SSRF blocked: resolves to private IP",
    }),
  );

  const result = await executor("web_fetch", {
    url: "https://internal.corp/secret",
  });
  assertEquals(result !== null, true);
  assertEquals(result!.includes("SSRF blocked"), true);
});

Deno.test("web_fetch executor: returns message when no fetcher", async () => {
  const executor = createWebToolExecutor(undefined, undefined);
  const result = await executor("web_fetch", { url: "https://example.com" });
  assertEquals(result !== null, true);
  assertEquals(result!.includes("not available"), true);
});

// ─── Unknown Tool Falls Through ─────────────────────────────────────────────

Deno.test("web tool executor: returns null for unknown tool", async () => {
  const executor = createWebToolExecutor(undefined, undefined);
  const result = await executor("unknown_tool", {});
  assertEquals(result, null);
});

Deno.test("web tool executor: returns null for read_file", async () => {
  const executor = createWebToolExecutor(undefined, undefined);
  const result = await executor("read_file", { path: "/tmp/test" });
  assertEquals(result, null);
});
