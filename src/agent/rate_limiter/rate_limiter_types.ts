/**
 * Public and internal type definitions for the sliding-window rate limiter.
 *
 * @module
 */

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/** Configuration for a rate-limited provider. */
export interface RateLimiterConfig {
  /**
   * Maximum tokens per minute (input + output combined).
   * Set to `Infinity` to disable TPM enforcement.
   */
  readonly tpm: number;
  /**
   * Maximum requests per minute.
   * Set to `Infinity` to disable RPM enforcement.
   */
  readonly rpm: number;
  /**
   * Sliding-window duration in milliseconds.
   * Defaults to 60 000 ms (1 minute).
   */
  readonly windowMs?: number;
  /**
   * How frequently (in ms) to poll when waiting for the window to clear.
   * Defaults to 500 ms.
   */
  readonly pollIntervalMs?: number;
}

/** Live snapshot of limiter usage within the current window. */
export interface RateLimiterSnapshot {
  /** Tokens consumed in the current window. */
  readonly tokensUsed: number;
  /** Requests made in the current window. */
  readonly requestsUsed: number;
  /** Configured TPM ceiling. */
  readonly tpmLimit: number;
  /** Configured RPM ceiling. */
  readonly rpmLimit: number;
  /** Window size in milliseconds. */
  readonly windowMs: number;
}

/** A rate limiter that can be queried for its current state. */
export interface RateLimiter {
  /** Return the current usage snapshot (does not block). */
  snapshot(): RateLimiterSnapshot;
  /**
   * Wait until there is capacity for `estimatedTokens` tokens.
   * Resolves as soon as capacity is available.
   */
  waitForCapacity(estimatedTokens: number): Promise<void>;
  /**
   * Record actual usage after a completion.
   * Call this with the `usage` returned by `LlmCompletionResult`.
   */
  recordUsage(inputTokens: number, outputTokens: number): void;
}

// ---------------------------------------------------------------------------
// Internal record types
// ---------------------------------------------------------------------------

/** A timestamped token usage event in the sliding window. */
export interface UsageEvent {
  readonly ts: number;
  readonly tokens: number;
}
