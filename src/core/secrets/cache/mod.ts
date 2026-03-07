/**
 * Secret cache module — LRU cache with stale-while-revalidate for external providers.
 *
 * @module
 */

export { createSecretCache } from "./secret_cache.ts";
export type {
  CacheStats,
  SecretCache,
  SecretCacheOptions,
  SecretFetcher,
} from "./secret_cache.ts";
