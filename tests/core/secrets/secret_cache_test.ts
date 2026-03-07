/**
 * Secret cache tests — LRU, TTL, stale-while-revalidate, invalidation.
 *
 * @module
 */

import { assertEquals } from "@std/assert";
import { createSecretCache } from "../../../src/core/secrets/cache/secret_cache.ts";
import type { SecretFetcher } from "../../../src/core/secrets/cache/secret_cache.ts";

function createCountingFetcher(
  store: Map<string, string>,
): { fetcher: SecretFetcher; callCount: () => number } {
  let calls = 0;
  return {
    fetcher: (name) => {
      calls++;
      const value = store.get(name);
      if (value === undefined) {
        return Promise.resolve({
          ok: false as const,
          error: `Secret '${name}' not found`,
        });
      }
      return Promise.resolve({ ok: true as const, value: { value } });
    },
    callCount: () => calls,
  };
}

Deno.test("cache: returns fetched value on cache miss", async () => {
  const cache = createSecretCache({ ttlMs: 60_000 });
  const store = new Map([["key", "value"]]);
  const { fetcher } = createCountingFetcher(store);

  const result = await cache.get("key", fetcher);
  assertEquals(result.ok, true);
  if (result.ok) assertEquals(result.value.value, "value");
});

Deno.test("cache: returns cached value on cache hit", async () => {
  const cache = createSecretCache({ ttlMs: 60_000 });
  const store = new Map([["key", "original"]]);
  const { fetcher, callCount } = createCountingFetcher(store);

  await cache.get("key", fetcher);
  store.set("key", "updated");
  const result = await cache.get("key", fetcher);

  assertEquals(result.ok, true);
  if (result.ok) assertEquals(result.value.value, "original");
  assertEquals(callCount(), 1);
});

Deno.test("cache: tracks stats correctly", async () => {
  const cache = createSecretCache({ ttlMs: 60_000 });
  const store = new Map([["key", "value"]]);
  const { fetcher } = createCountingFetcher(store);

  await cache.get("key", fetcher);
  await cache.get("key", fetcher);

  const stats = cache.stats();
  assertEquals(stats.misses, 1);
  assertEquals(stats.hits, 1);
  assertEquals(stats.entries, 1);
});

Deno.test("cache: invalidate removes specific entry", async () => {
  const cache = createSecretCache({ ttlMs: 60_000 });
  const store = new Map([["key", "value"]]);
  const { fetcher, callCount } = createCountingFetcher(store);

  await cache.get("key", fetcher);
  cache.invalidate("key");
  store.set("key", "updated");
  const result = await cache.get("key", fetcher);

  assertEquals(result.ok, true);
  if (result.ok) assertEquals(result.value.value, "updated");
  assertEquals(callCount(), 2);
});

Deno.test("cache: invalidateAll clears all entries", async () => {
  const cache = createSecretCache({ ttlMs: 60_000 });
  const store = new Map([["a", "1"], ["b", "2"]]);
  const { fetcher } = createCountingFetcher(store);

  await cache.get("a", fetcher);
  await cache.get("b", fetcher);
  assertEquals(cache.stats().entries, 2);

  cache.invalidateAll();
  assertEquals(cache.stats().entries, 0);
});

Deno.test("cache: fail-closed when provider unreachable and no cached entry", async () => {
  const cache = createSecretCache({ ttlMs: 60_000 });
  const store = new Map<string, string>();
  const { fetcher } = createCountingFetcher(store);

  const result = await cache.get("missing", fetcher);
  assertEquals(result.ok, false);
});

Deno.test("cache: evicts LRU entry when max entries reached", async () => {
  const cache = createSecretCache({ maxEntries: 2, ttlMs: 60_000 });
  const store = new Map([["a", "1"], ["b", "2"], ["c", "3"]]);
  const { fetcher } = createCountingFetcher(store);

  await cache.get("a", fetcher);
  await cache.get("b", fetcher);
  await cache.get("c", fetcher);

  assertEquals(cache.stats().entries, 2);
});

Deno.test("cache: stale entry served when provider fails during re-fetch", async () => {
  const cache = createSecretCache({
    ttlMs: 1,
    staleGraceMs: 60_000,
  });
  const store = new Map([["key", "stale-value"]]);
  const { fetcher } = createCountingFetcher(store);

  await cache.get("key", fetcher);

  await new Promise((r) => setTimeout(r, 10));

  store.delete("key");
  const result = await cache.get("key", fetcher);

  assertEquals(result.ok, true);
  if (result.ok) assertEquals(result.value.value, "stale-value");
});
