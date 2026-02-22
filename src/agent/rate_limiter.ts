/**
 * Sliding-window rate limiter for LLM providers.
 *
 * Wraps any LlmProvider to enforce tokens-per-minute (TPM) and
 * requests-per-minute (RPM) limits before each completion call.
 * When a limit would be exceeded the call is held until the window
 * has advanced enough to accommodate it, rather than being rejected.
 *
 * Design notes:
 * - Pure sliding-window over a configurable window size (default 60 s).
 * - State is held in a closure — immutable config, mutable counters only.
 * - No LLM calls inside the limiter; purely deterministic token accounting.
 * - Streaming and non-streaming completions both consume from the same budget.
 *   Token cost for a streaming call is accounted for after the stream ends
 *   (when actual usage figures are available).
 *
 * @module
 */

import type {
  LlmCompletionResult,
  LlmMessage,
  LlmProvider,
  LlmStreamChunk,
} from "./llm.ts";

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
interface UsageEvent {
  readonly ts: number;
  readonly tokens: number;
}

// ---------------------------------------------------------------------------
// createRateLimiter
// ---------------------------------------------------------------------------

/** Prune events older than the sliding window cutoff. */
function pruneExpiredEvents(
  events: UsageEvent[],
  cutoff: number,
): void {
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
    },

    async waitForCapacity(estimatedTokens: number): Promise<void> {
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
      await new Promise<void>((resolve) => {
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
    },

    recordUsage(inputTokens: number, outputTokens: number): void {
      tokenEvents.push({ ts: Date.now(), tokens: inputTokens + outputTokens });
    },
  };
}

// ---------------------------------------------------------------------------
// createRateLimitedProvider
// ---------------------------------------------------------------------------

/** Estimate input tokens from messages using a character-length heuristic (÷ 4). */
function estimateTokenCost(
  messages: readonly LlmMessage[],
  customEstimator?: (messages: readonly LlmMessage[]) => number,
): number {
  if (customEstimator) return customEstimator(messages);
  return messages.reduce((sum, m) => {
    const text = typeof m.content === "string"
      ? m.content
      : JSON.stringify(m.content);
    return sum + Math.ceil(text.length / 4);
  }, 0);
}

/** Attach a rate-limited streaming method to the provider if supported. */
function attachRateLimitedStream(
  rateLimitedProvider: LlmProvider,
  provider: LlmProvider,
  limiter: RateLimiter,
  customEstimator?: (messages: readonly LlmMessage[]) => number,
): void {
  if (!provider.stream) return;
  const upstreamStream = provider.stream.bind(provider);
  rateLimitedProvider.stream = async function* (
    messages: readonly LlmMessage[],
    tools: readonly unknown[],
    options: Record<string, unknown>,
  ): AsyncIterable<LlmStreamChunk> {
    await limiter.waitForCapacity(
      estimateTokenCost(messages, customEstimator),
    );
    let lastUsage: { inputTokens: number; outputTokens: number } | undefined;
    for await (const chunk of upstreamStream(messages, tools, options)) {
      if (chunk.done && chunk.usage) lastUsage = chunk.usage;
      yield chunk;
    }
    if (lastUsage) {
      limiter.recordUsage(lastUsage.inputTokens, lastUsage.outputTokens);
    }
  };
}

/**
 * Wrap an LlmProvider with a sliding-window rate limiter.
 *
 * Both `complete` and `stream` will wait for available capacity before
 * issuing the underlying provider call. Actual token usage is recorded
 * after each call using the usage figures returned by the provider.
 */
export function createRateLimitedProvider(
  provider: LlmProvider,
  limiter: RateLimiter,
  estimateInputTokens?: (messages: readonly LlmMessage[]) => number,
): LlmProvider {
  const rateLimitedProvider: LlmProvider = {
    name: provider.name,
    supportsStreaming: provider.supportsStreaming,
    contextWindow: provider.contextWindow,
    async complete(
      messages: readonly LlmMessage[],
      tools: readonly unknown[],
      options: Record<string, unknown>,
    ): Promise<LlmCompletionResult> {
      await limiter.waitForCapacity(
        estimateTokenCost(messages, estimateInputTokens),
      );
      const result = await provider.complete(messages, tools, options);
      limiter.recordUsage(result.usage.inputTokens, result.usage.outputTokens);
      return result;
    },
  };
  attachRateLimitedStream(
    rateLimitedProvider,
    provider,
    limiter,
    estimateInputTokens,
  );
  return rateLimitedProvider;
}
