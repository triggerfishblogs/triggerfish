/**
 * @module search_test
 *
 * Tests for The Reef registry search and catalog caching.
 */
import { assert, assertEquals } from "@std/assert";
import { createReefRegistry } from "../../../src/tools/skills/registry.ts";
import {
  buildTestCatalog,
  createTestRegistry,
} from "./registry_test_helpers.ts";

// ─── Search tests ────────────────────────────────────────────────────────────

Deno.test("ReefRegistry.search: finds skills by name substring", async () => {
  const registry = await createTestRegistry();
  const result = await registry.search({ query: "weather" });
  assert(result.ok);
  // Both weather versions should match, but latest comes through
  assert(result.value.length >= 1);
  assert(result.value.some((s) => s.name === "weather"));
});

Deno.test("ReefRegistry.search: finds skills by tag", async () => {
  const registry = await createTestRegistry();
  const result = await registry.search({ query: "research" });
  assert(result.ok);
  assert(result.value.some((s) => s.name === "deep-research"));
});

Deno.test("ReefRegistry.search: finds skills by category", async () => {
  const registry = await createTestRegistry();
  const result = await registry.search({ query: "utilities" });
  assert(result.ok);
  assert(result.value.some((s) => s.name === "weather"));
});

Deno.test("ReefRegistry.search: returns empty for no match", async () => {
  const registry = await createTestRegistry();
  const result = await registry.search({ query: "nonexistent-skill-xyz" });
  assert(result.ok);
  assertEquals(result.value.length, 0);
});

Deno.test("ReefRegistry.search: respects limit", async () => {
  const registry = await createTestRegistry();
  const result = await registry.search({ query: "weather", limit: 1 });
  assert(result.ok);
  assertEquals(result.value.length, 1);
});

Deno.test("ReefRegistry.search: listings include classification ceiling", async () => {
  const registry = await createTestRegistry();
  const result = await registry.search({ query: "weather" });
  assert(result.ok);
  assert(result.value.length > 0);
  assertEquals(result.value[0].classificationCeiling, "PUBLIC");
});

// ─── Catalog cache tests ─────────────────────────────────────────────────────

Deno.test("ReefRegistry.search: caches catalog across calls", async () => {
  let fetchCount = 0;
  const catalog = await buildTestCatalog();
  const countingFetch = ((input: string | URL | Request): Promise<Response> => {
    const url = typeof input === "string"
      ? input
      : input instanceof URL
      ? input.toString()
      : input.url;
    if (url.includes("catalog.json")) fetchCount++;
    return Promise.resolve(
      new Response(JSON.stringify(catalog), { status: 200 }),
    );
  }) as typeof fetch;

  const registry = createReefRegistry({
    baseUrl: "https://test.reef",
    fetchFn: countingFetch,
    cacheTtlMs: 60_000,
  });

  await registry.search({ query: "weather" });
  await registry.search({ query: "research" });
  assertEquals(fetchCount, 1, "Catalog should be fetched only once (cached)");
});

Deno.test("ReefRegistry.search: serves stale cache on fetch failure", async () => {
  const catalog = await buildTestCatalog();
  let callCount = 0;
  const failingAfterFirstFetch = ((
    input: string | URL | Request,
  ): Promise<Response> => {
    const url = typeof input === "string"
      ? input
      : input instanceof URL
      ? input.toString()
      : input.url;
    if (url.includes("catalog.json")) {
      callCount++;
      if (callCount === 1) {
        return Promise.resolve(
          new Response(JSON.stringify(catalog), { status: 200 }),
        );
      }
      return Promise.resolve(
        new Response("Server error", { status: 500 }),
      );
    }
    return Promise.resolve(new Response("Not found", { status: 404 }));
  }) as typeof fetch;

  const registry = createReefRegistry({
    baseUrl: "https://test.reef",
    fetchFn: failingAfterFirstFetch,
    cacheTtlMs: 0, // Force re-fetch every time
  });

  // First call succeeds and populates cache
  const first = await registry.search({ query: "weather" });
  assert(first.ok);

  // Second call fails network but returns stale cache
  const second = await registry.search({ query: "weather" });
  assert(second.ok);
  assert(second.value.length > 0);
});
