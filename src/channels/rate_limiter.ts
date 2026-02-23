/**
 * Per-user sliding window rate limiter for non-owner channel messages.
 *
 * Prevents a single non-owner sender from flooding the agent in group
 * chats, protecting against DoS via API cost exhaustion. Each sender
 * has an independent token bucket tracked by a sliding window of
 * recent request timestamps.
 *
 * This rate limiter is distinct from the LLM provider rate limiter in
 * `src/agent/rate_limiter/` — it operates at the channel message layer,
 * before any LLM call is made.
 *
 * @module
 */

/** Configuration for a per-user rate limiter. */
export interface UserRateLimiterConfig {
  /** Maximum number of messages allowed per sender within the window. */
  readonly maxRequests: number;
  /** Sliding window duration in milliseconds. */
  readonly windowMs: number;
}

/** Per-user sliding window rate limiter. */
export interface UserRateLimiter {
  /**
   * Check whether a sender is within their rate limit.
   *
   * If allowed, records the request timestamp. If denied, does not
   * consume any capacity (idempotent on rejection).
   *
   * @returns true if the request is allowed, false if rate limited.
   */
  isAllowed(senderId: string): boolean;
  /**
   * Remove entries for senders whose entire window has expired.
   *
   * Call periodically to prevent unbounded memory growth. In typical
   * usage, the chat session can call this on each non-owner message.
   */
  prune(): void;
}

/** Build the per-sender sliding window tracker. */
function buildWindowTracker(windowMs: number): {
  timestamps: Map<string, number[]>;
  cutoff: () => number;
} {
  return {
    timestamps: new Map(),
    cutoff: () => Date.now() - windowMs,
  };
}

/** Get active timestamps for a sender, pruning expired entries. */
function activeTimestamps(
  timestamps: Map<string, number[]>,
  senderId: string,
  cutoff: number,
): number[] {
  return (timestamps.get(senderId) ?? []).filter((t) => t > cutoff);
}

/**
 * Create a per-user sliding window rate limiter.
 *
 * @param config - Max requests and window duration.
 * @returns A UserRateLimiter instance.
 */
export function createUserRateLimiter(
  config: UserRateLimiterConfig,
): UserRateLimiter {
  const { timestamps, cutoff } = buildWindowTracker(config.windowMs);

  return {
    isAllowed(senderId: string): boolean {
      const now = Date.now();
      const windowCutoff = cutoff();
      const active = activeTimestamps(timestamps, senderId, windowCutoff);
      if (active.length >= config.maxRequests) return false;
      active.push(now);
      timestamps.set(senderId, active);
      return true;
    },

    prune(): void {
      const windowCutoff = cutoff();
      for (const [id, ts] of timestamps) {
        const active = ts.filter((t) => t > windowCutoff);
        if (active.length === 0) {
          timestamps.delete(id);
        } else {
          timestamps.set(id, active);
        }
      }
    },
  };
}
