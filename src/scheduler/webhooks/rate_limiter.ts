/**
 * Token bucket rate limiter for webhook request throttling.
 *
 * Provides per-key rate limiting with configurable sustained rate and burst
 * size. Each unique key gets its own token bucket, lazily initialized on
 * first use.
 *
 * @module
 */

/** Rate limiter configuration. */
export interface RateLimiterConfig {
  /** Sustained requests per minute. */
  readonly perMinute: number;
  /** Maximum burst size (max tokens in bucket). */
  readonly burst: number;
}

/** Per-key token bucket rate limiter. */
export interface RateLimiter {
  /** Returns true if the request for this key is allowed, false if rate-limited. */
  allowRequest(key: string): boolean;
}

interface Bucket {
  tokens: number;
  lastRefillMs: number;
}

/**
 * Create a token bucket rate limiter.
 *
 * Each unique key gets its own bucket. Tokens refill at `perMinute / 60_000`
 * per millisecond, capped at `burst`. A new bucket starts full.
 */
export function createRateLimiter(config: RateLimiterConfig): RateLimiter {
  const buckets = new Map<string, Bucket>();
  const msPerToken = 60_000 / config.perMinute;

  return {
    allowRequest(key: string): boolean {
      const now = Date.now();
      const bucket = buckets.get(key) ??
        { tokens: config.burst, lastRefillMs: now };
      const elapsed = now - bucket.lastRefillMs;
      const refilled = Math.floor(elapsed / msPerToken);
      const newTokens = Math.min(config.burst, bucket.tokens + refilled);
      const newLastRefill = refilled > 0
        ? bucket.lastRefillMs + refilled * msPerToken
        : bucket.lastRefillMs;

      if (newTokens <= 0) {
        buckets.set(key, { tokens: 0, lastRefillMs: newLastRefill });
        return false;
      }
      buckets.set(key, { tokens: newTokens - 1, lastRefillMs: newLastRefill });
      return true;
    },
  };
}
