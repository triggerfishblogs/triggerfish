/**
 * Sliding-window rate limiter for Reddit's 60 requests/minute ceiling.
 *
 * @module
 */

/** Sliding-window rate limiter interface. */
export interface RateLimiter {
  readonly tryAcquire: () => boolean;
  readonly waitForSlot: () => Promise<void>;
}

/** Create a rate limiter that enforces the given requests-per-window limit. */
export function createRateLimiter(
  opts: {
    readonly maxRequests?: number;
    readonly windowMs?: number;
    readonly nowFn?: () => number;
  } = {},
): RateLimiter {
  const maxRequests = opts.maxRequests ?? 60;
  const windowMs = opts.windowMs ?? 60_000;
  const nowFn = opts.nowFn ?? (() => Date.now());
  const timestamps: number[] = [];

  function pruneOld(): void {
    const cutoff = nowFn() - windowMs;
    while (timestamps.length > 0 && timestamps[0] < cutoff) {
      timestamps.shift();
    }
  }

  return {
    tryAcquire(): boolean {
      pruneOld();
      if (timestamps.length >= maxRequests) return false;
      timestamps.push(nowFn());
      return true;
    },
    async waitForSlot(): Promise<void> {
      while (true) {
        pruneOld();
        if (timestamps.length < maxRequests) {
          timestamps.push(nowFn());
          return;
        }
        const oldest = timestamps[0];
        const waitMs = oldest + windowMs - nowFn() + 1;
        if (waitMs > 0) {
          await new Promise((r) => setTimeout(r, waitMs));
        }
      }
    },
  };
}
