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

import type { LlmProvider, LlmMessage, LlmCompletionResult, LlmStreamChunk } from "./llm.ts";

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

  // Mutable sliding-window event log.
  // Events older than `windowMs` are pruned before each check.
  const tokenEvents: UsageEvent[] = [];
  const requestEvents: UsageEvent[] = [];

  function prune(now: number): void {
    const cutoff = now - windowMs;
    while (tokenEvents.length > 0 && tokenEvents[0].ts < cutoff) {
      tokenEvents.shift();
    }
    while (requestEvents.length > 0 && requestEvents[0].ts < cutoff) {
      requestEvents.shift();
    }
  }

  function windowTokens(now: number): number {
    prune(now);
    return tokenEvents.reduce((sum, e) => sum + e.tokens, 0);
  }

  function windowRequests(now: number): number {
    prune(now);
    return requestEvents.length;
  }

  function hasCapacity(estimatedTokens: number, now: number): boolean {
    if (config.tpm !== Infinity && windowTokens(now) + estimatedTokens > config.tpm) {
      return false;
    }
    if (config.rpm !== Infinity && windowRequests(now) + 1 > config.rpm) {
      return false;
    }
    return true;
  }

  return {
    snapshot(): RateLimiterSnapshot {
      const now = Date.now();
      return {
        tokensUsed: windowTokens(now),
        requestsUsed: windowRequests(now),
        tpmLimit: config.tpm,
        rpmLimit: config.rpm,
        windowMs,
      };
    },

    async waitForCapacity(estimatedTokens: number): Promise<void> {
      // Optimistic path — no waiting needed.
      if (hasCapacity(estimatedTokens, Date.now())) {
        // Record the request slot immediately (token cost recorded later via recordUsage).
        requestEvents.push({ ts: Date.now(), tokens: 0 });
        return;
      }

      // Poll until capacity is available.
      await new Promise<void>((resolve) => {
        const id = setInterval(() => {
          if (hasCapacity(estimatedTokens, Date.now())) {
            clearInterval(id);
            requestEvents.push({ ts: Date.now(), tokens: 0 });
            resolve();
          }
        }, pollMs);
      });
    },

    recordUsage(inputTokens: number, outputTokens: number): void {
      const now = Date.now();
      tokenEvents.push({ ts: now, tokens: inputTokens + outputTokens });
    },
  };
}

// ---------------------------------------------------------------------------
// createRateLimitedProvider
// ---------------------------------------------------------------------------

/**
 * Wrap an LlmProvider with a sliding-window rate limiter.
 *
 * Both `complete` and `stream` will wait for available capacity before
 * issuing the underlying provider call. Actual token usage is recorded
 * after each call using the usage figures returned by the provider.
 *
 * The estimated token cost passed to `waitForCapacity` before the call is
 * derived from the prompt token count (input). After the call, the real
 * total (input + output) is recorded via `recordUsage`.
 *
 * @param provider  - The underlying LlmProvider to wrap
 * @param limiter   - A RateLimiter created via createRateLimiter
 * @param estimateInputTokens - Optional callback to estimate input tokens from
 *   messages before a call. Defaults to a character-length heuristic (÷ 4).
 * @returns A new LlmProvider that enforces the rate limit
 */
export function createRateLimitedProvider(
  provider: LlmProvider,
  limiter: RateLimiter,
  estimateInputTokens?: (messages: readonly LlmMessage[]) => number,
): LlmProvider {
  function estimateTokens(messages: readonly LlmMessage[]): number {
    if (estimateInputTokens) return estimateInputTokens(messages);
    // Conservative heuristic: ~4 characters per token.
    return messages.reduce((sum, m) => {
      const text = typeof m.content === "string" ? m.content : JSON.stringify(m.content);
      return sum + Math.ceil(text.length / 4);
    }, 0);
  }

  const rateLimitedProvider: LlmProvider = {
    name: provider.name,
    supportsStreaming: provider.supportsStreaming,
    contextWindow: provider.contextWindow,

    async complete(
      messages: readonly LlmMessage[],
      tools: readonly unknown[],
      options: Record<string, unknown>,
    ): Promise<LlmCompletionResult> {
      const estimated = estimateTokens(messages);
      await limiter.waitForCapacity(estimated);

      const result = await provider.complete(messages, tools, options);
      limiter.recordUsage(result.usage.inputTokens, result.usage.outputTokens);
      return result;
    },
  };

  // Only attach stream() if the underlying provider supports it.
  if (provider.stream) {
    const upstreamStream = provider.stream.bind(provider);

    rateLimitedProvider.stream = async function* (
      messages: readonly LlmMessage[],
      tools: readonly unknown[],
      options: Record<string, unknown>,
    ): AsyncIterable<LlmStreamChunk> {
      const estimated = estimateTokens(messages);
      await limiter.waitForCapacity(estimated);

      let lastUsage: { inputTokens: number; outputTokens: number } | undefined;

      for await (const chunk of upstreamStream(messages, tools, options)) {
        if (chunk.done && chunk.usage) {
          lastUsage = chunk.usage;
        }
        yield chunk;
      }

      if (lastUsage) {
        limiter.recordUsage(lastUsage.inputTokens, lastUsage.outputTokens);
      }
    };
  }

  return rateLimitedProvider;
}
