/**
 * LRU cache with stale-while-revalidate for external secret providers.
 *
 * Sits between the resolver and any `ExternalSecretProvider`. Local backends
 * (keychain, encrypted file) do not use this cache — they are already local I/O.
 *
 * @module
 */

import type { Result } from "../../types/classification.ts";
import type { SecretMetadata } from "../backends/external_provider.ts";
import { createLogger } from "../../logger/logger.ts";

const log = createLogger("secrets:cache");

/** Configuration for the secret cache. */
export interface SecretCacheOptions {
  /** Maximum number of cached entries. Default: 256. */
  readonly maxEntries: number;
  /** Time-to-live in milliseconds. Default: 300_000 (5 min). */
  readonly ttlMs: number;
  /** Grace period for stale entries in milliseconds. Default: 60_000 (1 min). */
  readonly staleGraceMs: number;
}

/** A single cached secret entry. */
interface CacheEntry {
  readonly value: string;
  readonly metadata?: SecretMetadata;
  readonly fetchedAt: number;
  readonly lastAccessedAt: number;
}

/** Fetch function signature for cache miss resolution. */
export type SecretFetcher = (
  name: string,
) => Promise<Result<{ value: string; metadata?: SecretMetadata }, string>>;

/** Stats exposed for monitoring. */
export interface CacheStats {
  readonly entries: number;
  readonly hits: number;
  readonly misses: number;
  readonly staleServes: number;
}

/** Cache operations interface. */
export interface SecretCache {
  /** Get a secret, using the fetcher on cache miss. */
  readonly get: (
    name: string,
    fetcher: SecretFetcher,
  ) => Promise<Result<{ value: string; metadata?: SecretMetadata }, string>>;

  /** Invalidate a single entry. */
  readonly invalidate: (name: string) => void;

  /** Invalidate all entries. */
  readonly invalidateAll: () => void;

  /** Get cache statistics. */
  readonly stats: () => CacheStats;
}

function evictLruEntry(
  cache: Map<string, CacheEntry>,
): void {
  let oldestKey: string | undefined;
  let oldestAccess = Infinity;
  for (const [key, entry] of cache) {
    if (entry.lastAccessedAt < oldestAccess) {
      oldestAccess = entry.lastAccessedAt;
      oldestKey = key;
    }
  }
  if (oldestKey !== undefined) {
    cache.delete(oldestKey);
  }
}

function isFresh(entry: CacheEntry, now: number, ttlMs: number): boolean {
  return (now - entry.fetchedAt) < ttlMs;
}

function isWithinGrace(
  entry: CacheEntry,
  now: number,
  ttlMs: number,
  graceMs: number,
): boolean {
  return (now - entry.fetchedAt) < (ttlMs + graceMs);
}

/**
 * Create an LRU cache with stale-while-revalidate semantics.
 *
 * - **Cache hit (fresh)**: Return immediately.
 * - **Cache hit (stale, within grace)**: Return stale value, trigger async refresh.
 * - **Cache miss**: Fetch from provider, populate cache, return.
 * - **Provider unreachable, stale entry exists**: Return stale with warning.
 * - **Provider unreachable, no entry**: Return error (fail-closed).
 */
export function createSecretCache(
  options: Partial<SecretCacheOptions> = {},
): SecretCache {
  const maxEntries = options.maxEntries ?? 256;
  const ttlMs = options.ttlMs ?? 300_000;
  const staleGraceMs = options.staleGraceMs ?? 60_000;

  const cache = new Map<string, CacheEntry>();
  let hits = 0;
  let misses = 0;
  let staleServes = 0;

  const get: SecretCache["get"] = async (name, fetcher) => {
    const now = Date.now();
    const existing = cache.get(name);

    if (existing && isFresh(existing, now, ttlMs)) {
      cache.set(name, { ...existing, lastAccessedAt: now });
      hits++;
      return {
        ok: true,
        value: { value: existing.value, metadata: existing.metadata },
      };
    }

    if (existing && isWithinGrace(existing, now, ttlMs, staleGraceMs)) {
      cache.set(name, { ...existing, lastAccessedAt: now });
      staleServes++;

      fetcher(name).then((result) => {
        if (result.ok) {
          cache.set(name, {
            value: result.value.value,
            metadata: result.value.metadata,
            fetchedAt: Date.now(),
            lastAccessedAt: Date.now(),
          });
        }
      }).catch((err) => {
        log.warn("Secret cache background revalidation failed", {
          operation: "get",
          name,
          err,
        });
      });

      return {
        ok: true,
        value: { value: existing.value, metadata: existing.metadata },
      };
    }

    misses++;
    const result = await fetcher(name);

    if (!result.ok) {
      if (existing) {
        staleServes++;
        return {
          ok: true,
          value: { value: existing.value, metadata: existing.metadata },
        };
      }
      return result;
    }

    if (cache.size >= maxEntries) {
      evictLruEntry(cache);
    }

    cache.set(name, {
      value: result.value.value,
      metadata: result.value.metadata,
      fetchedAt: now,
      lastAccessedAt: now,
    });

    return result;
  };

  return {
    get,
    invalidate: (name) => {
      cache.delete(name);
    },
    invalidateAll: () => {
      cache.clear();
    },
    stats: () => ({
      entries: cache.size,
      hits,
      misses,
      staleServes,
    }),
  };
}
