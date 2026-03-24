/**
 * X API per-endpoint rate limit tracker.
 *
 * Reads `x-rate-limit-remaining` and `x-rate-limit-reset` headers from
 * X API responses and proactively blocks requests when quota is exhausted,
 * preventing unnecessary 429 errors.
 *
 * @module
 */

import { createLogger } from "../../../core/logger/logger.ts";

const log = createLogger("x-rate-limiter");

/** Per-endpoint rate limit state parsed from X API response headers. */
interface EndpointRateLimit {
  /** Remaining requests in the current 15-minute window. */
  readonly remaining: number;
  /** Unix timestamp (seconds) when the rate limit window resets. */
  readonly resetAt: number;
}

/** Rate limit check result. */
export type RateLimitCheckResult =
  | { readonly ok: true }
  | {
    readonly ok: false;
    readonly error: {
      readonly endpoint: string;
      readonly resetAt: number;
      readonly message: string;
    };
  };

/** Per-endpoint rate limit tracker for X API v2. */
export interface XRateLimiter {
  /**
   * Record rate limit headers from an X API response.
   *
   * @param endpoint - The API endpoint path (e.g. "/2/tweets")
   * @param headers - Response headers containing rate limit info
   */
  readonly recordResponse: (endpoint: string, headers: Headers) => void;

  /**
   * Check whether a request to an endpoint would be rate-limited.
   *
   * @param endpoint - The API endpoint path to check
   * @returns ok if the request can proceed, error with reset time if blocked
   */
  readonly checkLimit: (endpoint: string) => RateLimitCheckResult;

  /** Clear all tracked rate limit state. */
  readonly reset: () => void;
}

/**
 * Create an X API rate limiter.
 *
 * @param nowFn - Injectable clock for testing (defaults to Date.now)
 */
export function createXRateLimiter(
  nowFn: () => number = Date.now,
): XRateLimiter {
  const limits = new Map<string, EndpointRateLimit>();

  return {
    recordResponse(endpoint: string, headers: Headers): void {
      const remaining = headers.get("x-rate-limit-remaining");
      const reset = headers.get("x-rate-limit-reset");
      if (remaining === null || reset === null) return;

      const remainingNum = parseInt(remaining, 10);
      const resetNum = parseInt(reset, 10);
      if (isNaN(remainingNum) || isNaN(resetNum)) return;

      limits.set(endpoint, { remaining: remainingNum, resetAt: resetNum });
      if (remainingNum <= 5) {
        log.warn("X API rate limit low", {
          operation: "recordXRateLimit",
          endpoint,
          remaining: remainingNum,
          resetAt: resetNum,
        });
      }
    },

    checkLimit(endpoint: string): RateLimitCheckResult {
      const state = limits.get(endpoint);
      if (!state) return { ok: true };

      const nowSeconds = Math.floor(nowFn() / 1000);
      if (nowSeconds >= state.resetAt) {
        limits.delete(endpoint);
        return { ok: true };
      }

      if (state.remaining <= 0) {
        const resetDate = new Date(state.resetAt * 1000);
        const message =
          `X API rate limit exhausted for ${endpoint}. Resets at ${resetDate.toISOString()}`;
        log.warn("X API rate limit blocked", {
          operation: "checkXRateLimit",
          endpoint,
          resetAt: state.resetAt,
        });
        return {
          ok: false,
          error: { endpoint, resetAt: state.resetAt, message },
        };
      }

      return { ok: true };
    },

    reset(): void {
      limits.clear();
    },
  };
}
