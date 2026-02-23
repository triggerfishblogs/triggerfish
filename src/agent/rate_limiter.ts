/**
 * Sliding-window rate limiter for LLM providers.
 *
 * Re-exports from split modules:
 * - rate_limiter_types.ts — public interfaces and internal record types
 * - rate_limiter_core.ts — createRateLimiter and sliding-window logic
 * - rate_limiter_provider.ts — createRateLimitedProvider wrapper
 *
 * @module
 */

export type {
  RateLimiterConfig,
  RateLimiterSnapshot,
  RateLimiter,
} from "./rate_limiter_types.ts";

export { createRateLimiter } from "./rate_limiter_core.ts";

export { createRateLimitedProvider } from "./rate_limiter_provider.ts";
