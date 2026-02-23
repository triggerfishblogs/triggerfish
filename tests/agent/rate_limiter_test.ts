/**
 * Tests for the sliding-window rate limiter.
 *
 * @module
 */

import { assertEquals, assertExists } from "@std/assert";
import {
  createRateLimiter,
  createRateLimitedProvider,
} from "../../src/agent/rate_limiter/rate_limiter.ts";
import type { LlmProvider, LlmMessage, LlmCompletionResult, LlmStreamChunk } from "../../src/agent/llm.ts";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeMockProvider(
  usage = { inputTokens: 10, outputTokens: 5 },
): LlmProvider & { callCount: number } {
  const provider = {
    name: "mock",
    supportsStreaming: true,
    callCount: 0,

    complete(
      _messages: readonly LlmMessage[],
      _tools: readonly unknown[],
      _options: Record<string, unknown>,
    ): Promise<LlmCompletionResult> {
      provider.callCount++;
      return Promise.resolve({
        content: "hello",
        toolCalls: [],
        usage,
      });
    },

    async *stream(
      _messages: readonly LlmMessage[],
      _tools: readonly unknown[],
      _options: Record<string, unknown>,
    ): AsyncIterable<LlmStreamChunk> {
      provider.callCount++;
      yield { text: "hello", done: false };
      yield { text: "", done: true, usage, toolCalls: [] };
    },
  };
  return provider;
}

const messages: readonly LlmMessage[] = [
  { role: "user", content: "hi" },
];

// ---------------------------------------------------------------------------
// createRateLimiter — unit tests
// ---------------------------------------------------------------------------

Deno.test("createRateLimiter — snapshot starts at zero", () => {
  const limiter = createRateLimiter({ tpm: 1000, rpm: 10 });
  const snap = limiter.snapshot();
  assertEquals(snap.tokensUsed, 0);
  assertEquals(snap.requestsUsed, 0);
  assertEquals(snap.tpmLimit, 1000);
  assertEquals(snap.rpmLimit, 10);
  assertEquals(snap.windowMs, 60_000);
});

Deno.test("createRateLimiter — recordUsage accumulates tokens", () => {
  const limiter = createRateLimiter({ tpm: 1000, rpm: 10 });
  limiter.recordUsage(100, 50);
  limiter.recordUsage(200, 75);
  const snap = limiter.snapshot();
  assertEquals(snap.tokensUsed, 425);
});

Deno.test("createRateLimiter — waitForCapacity resolves immediately under limit", async () => {
  const limiter = createRateLimiter({ tpm: 1000, rpm: 10 });
  await limiter.waitForCapacity(500);
  const snap = limiter.snapshot();
  // One request registered
  assertEquals(snap.requestsUsed, 1);
});

Deno.test("createRateLimiter — custom window size respected in snapshot", () => {
  const limiter = createRateLimiter({ tpm: 500, rpm: 5, windowMs: 30_000 });
  const snap = limiter.snapshot();
  assertEquals(snap.windowMs, 30_000);
});

Deno.test("createRateLimiter — Infinity limits never block", async () => {
  const limiter = createRateLimiter({ tpm: Infinity, rpm: Infinity });
  // Should resolve immediately even with huge token count
  await limiter.waitForCapacity(1_000_000_000);
  const snap = limiter.snapshot();
  assertEquals(snap.requestsUsed, 1);
});

// ---------------------------------------------------------------------------
// createRateLimitedProvider — wraps complete()
// ---------------------------------------------------------------------------

Deno.test("createRateLimitedProvider — complete() passes through result", async () => {
  const mock = makeMockProvider();
  const limiter = createRateLimiter({ tpm: 10_000, rpm: 100 });
  const wrapped = createRateLimitedProvider(mock, limiter);

  const result = await wrapped.complete(messages, [], {});
  assertEquals(result.content, "hello");
  assertEquals(result.usage.inputTokens, 10);
  assertEquals(result.usage.outputTokens, 5);
  assertEquals(mock.callCount, 1);
});

Deno.test("createRateLimitedProvider — complete() records usage in limiter", async () => {
  const mock = makeMockProvider({ inputTokens: 20, outputTokens: 30 });
  const limiter = createRateLimiter({ tpm: 10_000, rpm: 100 });
  const wrapped = createRateLimitedProvider(mock, limiter);

  await wrapped.complete(messages, [], {});
  const snap = limiter.snapshot();
  assertEquals(snap.tokensUsed, 50); // 20 + 30
});

Deno.test("createRateLimitedProvider — multiple completes accumulate usage", async () => {
  const mock = makeMockProvider({ inputTokens: 10, outputTokens: 5 });
  const limiter = createRateLimiter({ tpm: 10_000, rpm: 100 });
  const wrapped = createRateLimitedProvider(mock, limiter);

  await wrapped.complete(messages, [], {});
  await wrapped.complete(messages, [], {});
  await wrapped.complete(messages, [], {});

  const snap = limiter.snapshot();
  assertEquals(snap.tokensUsed, 45); // 3 × 15
  assertEquals(snap.requestsUsed, 3);
});

Deno.test("createRateLimitedProvider — preserves provider name and streaming flag", () => {
  const mock = makeMockProvider();
  const limiter = createRateLimiter({ tpm: 1000, rpm: 10 });
  const wrapped = createRateLimitedProvider(mock, limiter);

  assertEquals(wrapped.name, "mock");
  assertEquals(wrapped.supportsStreaming, true);
});

Deno.test("createRateLimitedProvider — stream() passes through chunks", async () => {
  const mock = makeMockProvider();
  const limiter = createRateLimiter({ tpm: 10_000, rpm: 100 });
  const wrapped = createRateLimitedProvider(mock, limiter);

  assertExists(wrapped.stream);
  const chunks: LlmStreamChunk[] = [];
  for await (const chunk of wrapped.stream!(messages, [], {})) {
    chunks.push(chunk);
  }

  assertEquals(chunks.length, 2);
  assertEquals(chunks[0].text, "hello");
  assertEquals(chunks[1].done, true);
  assertEquals(chunks[1].usage?.inputTokens, 10);
});

Deno.test("createRateLimitedProvider — stream() records usage in limiter", async () => {
  const mock = makeMockProvider({ inputTokens: 40, outputTokens: 60 });
  const limiter = createRateLimiter({ tpm: 10_000, rpm: 100 });
  const wrapped = createRateLimitedProvider(mock, limiter);

  for await (const _chunk of wrapped.stream!(messages, [], {})) {
    // consume stream
  }

  const snap = limiter.snapshot();
  assertEquals(snap.tokensUsed, 100); // 40 + 60
});

Deno.test("createRateLimitedProvider — provider without stream has no stream method", () => {
  const mock: LlmProvider = {
    name: "no-stream",
    supportsStreaming: false,
    complete(): Promise<LlmCompletionResult> {
      return Promise.resolve({ content: "", toolCalls: [], usage: { inputTokens: 1, outputTokens: 1 } });
    },
  };
  const limiter = createRateLimiter({ tpm: 1000, rpm: 10 });
  const wrapped = createRateLimitedProvider(mock, limiter);
  assertEquals(wrapped.stream, undefined);
});

Deno.test("createRateLimitedProvider — custom token estimator is used", async () => {
  const mock = makeMockProvider({ inputTokens: 10, outputTokens: 5 });
  const limiter = createRateLimiter({ tpm: 10_000, rpm: 100 });

  let estimatorCalled = false;
  const wrapped = createRateLimitedProvider(mock, limiter, (_msgs) => {
    estimatorCalled = true;
    return 999;
  });

  await wrapped.complete(messages, [], {});
  assertEquals(estimatorCalled, true);
});

// ---------------------------------------------------------------------------
// OpenAI limit constants
// ---------------------------------------------------------------------------

Deno.test("openai_limits — getOpenAiLimits returns correct tier1 limits for gpt-4o", async () => {
  const { getOpenAiLimits, GPT4O_TIER1 } = await import(
    "../../src/agent/providers/openai_limits.ts"
  );
  const limits = getOpenAiLimits("gpt-4o");
  assertExists(limits);
  assertEquals(limits, GPT4O_TIER1);
  assertEquals(limits!.tpm, 30_000);
  assertEquals(limits!.rpm, 500);
});

Deno.test("openai_limits — getOpenAiLimits returns free tier for gpt-4o", async () => {
  const { getOpenAiLimits, GPT4O_FREE } = await import(
    "../../src/agent/providers/openai_limits.ts"
  );
  const limits = getOpenAiLimits("gpt-4o", "free");
  assertExists(limits);
  assertEquals(limits, GPT4O_FREE);
  assertEquals(limits!.tpm, 20_000);
});

Deno.test("openai_limits — getOpenAiLimits resolves gpt-4o-mini before gpt-4o", async () => {
  const { getOpenAiLimits, GPT4O_MINI_TIER1, GPT4O_TIER1 } = await import(
    "../../src/agent/providers/openai_limits.ts"
  );
  const mini = getOpenAiLimits("gpt-4o-mini");
  const full = getOpenAiLimits("gpt-4o");
  assertExists(mini);
  assertExists(full);
  // mini and full should have different limits
  assertEquals(mini, GPT4O_MINI_TIER1);
  assertEquals(full, GPT4O_TIER1);
  assertEquals(mini!.tpm, 200_000);
  assertEquals(full!.tpm, 30_000);
});

Deno.test("openai_limits — getOpenAiLimits returns undefined for unknown model", async () => {
  const { getOpenAiLimits } = await import(
    "../../src/agent/providers/openai_limits.ts"
  );
  const result = getOpenAiLimits("unknown-model-xyz");
  assertEquals(result, undefined);
});

Deno.test("openai_limits — o1 free maps to tier1", async () => {
  const { getOpenAiLimits, O1_TIER1 } = await import(
    "../../src/agent/providers/openai_limits.ts"
  );
  const free = getOpenAiLimits("o1", "free");
  assertEquals(free, O1_TIER1);
});

Deno.test("openai_limits — all tier constants are readonly and non-zero", async () => {
  const {
    GPT4O_TIER1, GPT4O_TIER2, GPT4O_TIER3, GPT4O_TIER4, GPT4O_TIER5,
    GPT4O_MINI_TIER1, O1_TIER1, O3_MINI_TIER1,
  } = await import("../../src/agent/providers/openai_limits.ts");

  for (const c of [GPT4O_TIER1, GPT4O_TIER2, GPT4O_TIER3, GPT4O_TIER4, GPT4O_TIER5,
    GPT4O_MINI_TIER1, O1_TIER1, O3_MINI_TIER1]) {
    assertEquals(typeof c.tpm, "number");
    assertEquals(typeof c.rpm, "number");
    assertEquals(typeof c.tpd, "number");
    assertEquals(c.tpm > 0, true);
    assertEquals(c.rpm > 0, true);
    assertEquals(c.tpd > 0, true);
  }
});
