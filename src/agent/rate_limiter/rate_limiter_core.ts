/**
 * Sliding-window rate limiter core logic.
 *
 * Maintains a sliding window of usage events and exposes
 * `waitForCapacity` / `recordUsage` for coordination.
 * State is held in a closure — immutable config, mutable counters only.
 * No LLM calls inside the limiter; purely deterministic token accounting.
 *
 * @module
 */

import type {
  RateLimiter,
  RateLimiterConfig,
  RateLimiterSnapshot,
  UsageEvent,
} from "./rate_limiter_types.ts";

// ---------------------------------------------------------------------------
// Window arithmetic
// ---------------------------------------------------------------------------

/** Prune events older than the sliding window cutoff. */
function pruneExpiredEvents(events: UsageEvent[], cutoff: number): void {
  while (events.length > 0 && events[0].ts < cutoff) {
    events.shift();
  }
}

/** Sum tokens in the sliding window after pruning expired events. */
function sumWindowTokens(
  tokenEvents: UsageEvent[],
  requestEvents: UsageEvent[],
  windowMs: number,
  now: number,
): number {
  const cutoff = now - windowMs;
  pruneExpiredEvents(tokenEvents, cutoff);
  pruneExpiredEvents(requestEvents, cutoff);
  return tokenEvents.reduce((sum, e) => sum + e.tokens, 0);
}

/** Count requests in the sliding window after pruning expired events. */
function countWindowRequests(
  tokenEvents: UsageEvent[],
  requestEvents: UsageEvent[],
  windowMs: number,
  now: number,
): number {
  const cutoff = now - windowMs;
  pruneExpiredEvents(tokenEvents, cutoff);
  pruneExpiredEvents(requestEvents, cutoff);
  return requestEvents.length;
}

// ---------------------------------------------------------------------------
// Capacity checking
// ---------------------------------------------------------------------------

/** Check whether there is capacity for an additional request. */
function checkRateCapacity(
  tokenEvents: UsageEvent[],
  requestEvents: UsageEvent[],
  config: RateLimiterConfig,
  windowMs: number,
  estimatedTokens: number,
  now: number,
): boolean {
  const tokens = sumWindowTokens(tokenEvents, requestEvents, windowMs, now);
  if (config.tpm !== Infinity && tokens + estimatedTokens > config.tpm) {
    return false;
  }
  const requests = countWindowRequests(
    tokenEvents,
    requestEvents,
    windowMs,
    now,
  );
  return !(config.rpm !== Infinity && requests + 1 > config.rpm);
}

// ---------------------------------------------------------------------------
// Snapshot builder
// ---------------------------------------------------------------------------

/** Build a snapshot of current rate limiter state. */
function buildRateLimiterSnapshot(
  tokenEvents: UsageEvent[],
  requestEvents: UsageEvent[],
  config: RateLimiterConfig,
  windowMs: number,
): RateLimiterSnapshot {
  const now = Date.now();
  return {
    tokensUsed: sumWindowTokens(tokenEvents, requestEvents, windowMs, now),
    requestsUsed: countWindowRequests(
      tokenEvents,
      requestEvents,
      windowMs,
      now,
    ),
    tpmLimit: config.tpm,
    rpmLimit: config.rpm,
    windowMs,
  };
}

// ---------------------------------------------------------------------------
// Capacity polling
// ---------------------------------------------------------------------------

/** Poll until rate capacity is available, then record the request event. */
function pollUntilCapacityAvailable(
  tokenEvents: UsageEvent[],
  requestEvents: UsageEvent[],
  config: RateLimiterConfig,
  windowMs: number,
  estimatedTokens: number,
  pollMs: number,
): Promise<void> {
  return new Promise<void>((resolve) => {
    const id = setInterval(() => {
      if (
        checkRateCapacity(
          tokenEvents,
          requestEvents,
          config,
          windowMs,
          estimatedTokens,
          Date.now(),
        )
      ) {
        clearInterval(id);
        requestEvents.push({ ts: Date.now(), tokens: 0 });
        resolve();
      }
    }, pollMs);
  });
}

/** Wait for capacity, recording the request event when available. */
async function waitForRateCapacity(
  tokenEvents: UsageEvent[],
  requestEvents: UsageEvent[],
  config: RateLimiterConfig,
  windowMs: number,
  pollMs: number,
  estimatedTokens: number,
): Promise<void> {
  if (
    checkRateCapacity(
      tokenEvents,
      requestEvents,
      config,
      windowMs,
      estimatedTokens,
      Date.now(),
    )
  ) {
    requestEvents.push({ ts: Date.now(), tokens: 0 });
    return;
  }
  await pollUntilCapacityAvailable(
    tokenEvents,
    requestEvents,
    config,
    windowMs,
    estimatedTokens,
    pollMs,
  );
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Create a standalone rate limiter.
 *
 * The limiter maintains a sliding window of usage events and
 * exposes `waitForCapacity` / `recordUsage` for coordination.
 *
 * @param config - TPM, RPM, and window settings
 * @returns A RateLimiter instance
 */
export function createRateLimiter(config: RateLimiterConfig): RateLimiter {
  const windowMs = config.windowMs ?? 60_000;
  const pollMs = config.pollIntervalMs ?? 500;
  const tokenEvents: UsageEvent[] = [];
  const requestEvents: UsageEvent[] = [];

  return {
    snapshot(): RateLimiterSnapshot {
      return buildRateLimiterSnapshot(
        tokenEvents,
        requestEvents,
        config,
        windowMs,
      );
    },
    waitForCapacity(estimatedTokens: number): Promise<void> {
      return waitForRateCapacity(
        tokenEvents,
        requestEvents,
        config,
        windowMs,
        pollMs,
        estimatedTokens,
      );
    },
    recordUsage(inputTokens: number, outputTokens: number): void {
      tokenEvents.push({ ts: Date.now(), tokens: inputTokens + outputTokens });
    },
  };
}
