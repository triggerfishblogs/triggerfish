/**
 * Tests for provider retry decorator.
 */
import { assertEquals, assertRejects } from "@std/assert";
import {
  executeWithRetry,
  isRetryableError,
  withRetry,
} from "../../src/agent/providers/retry.ts";
import type { LlmProvider } from "../../src/agent/llm.ts";

// ─── isRetryableError ────────────────────────────────────────────────────────

Deno.test("isRetryableError: detects 429 status", () => {
  assertEquals(
    isRetryableError(new Error("Request failed (429): rate limited")),
    true,
  );
});

Deno.test("isRetryableError: detects 502 status", () => {
  assertEquals(
    isRetryableError(new Error("Proxy error (502): bad gateway")),
    true,
  );
});

Deno.test("isRetryableError: detects 503 status", () => {
  assertEquals(isRetryableError(new Error("Service unavailable (503)")), true);
});

Deno.test("isRetryableError: rejects 400 status", () => {
  assertEquals(isRetryableError(new Error("Bad request (400)")), false);
});

Deno.test("isRetryableError: rejects 401 status", () => {
  assertEquals(isRetryableError(new Error("Unauthorized (401)")), false);
});

Deno.test("isRetryableError: rejects non-Error", () => {
  assertEquals(isRetryableError("string error"), false);
  assertEquals(isRetryableError(null), false);
  assertEquals(isRetryableError(undefined), false);
});

// ─── executeWithRetry ────────────────────────────────────────────────────────

Deno.test("executeWithRetry: succeeds on first attempt", async () => {
  let attempts = 0;
  const result = await executeWithRetry(
    () => {
      attempts++;
      return Promise.resolve("ok");
    },
    {
      maxRetries: 2,
      baseDelayMs: 1,
      providerName: "test",
      operation: "complete",
    },
  );
  assertEquals(result, "ok");
  assertEquals(attempts, 1);
});

Deno.test("executeWithRetry: retries on 429 and succeeds", async () => {
  let attempts = 0;
  const result = await executeWithRetry(
    () => {
      attempts++;
      if (attempts < 3) {
        return Promise.reject(new Error("Overloaded (429): try later"));
      }
      return Promise.resolve("recovered");
    },
    {
      maxRetries: 2,
      baseDelayMs: 1,
      providerName: "test",
      operation: "complete",
    },
  );
  assertEquals(result, "recovered");
  assertEquals(attempts, 3);
});

Deno.test("executeWithRetry: throws after exhausting retries", async () => {
  let attempts = 0;
  await assertRejects(
    () =>
      executeWithRetry(
        () => {
          attempts++;
          return Promise.reject(new Error("Service unavailable (503)"));
        },
        {
          maxRetries: 2,
          baseDelayMs: 1,
          providerName: "test",
          operation: "complete",
        },
      ),
    Error,
    "(503)",
  );
  assertEquals(attempts, 3);
});

Deno.test("executeWithRetry: does not retry non-retryable errors", async () => {
  let attempts = 0;
  await assertRejects(
    () =>
      executeWithRetry(
        () => {
          attempts++;
          return Promise.reject(new Error("Invalid API key (401)"));
        },
        {
          maxRetries: 2,
          baseDelayMs: 1,
          providerName: "test",
          operation: "complete",
        },
      ),
    Error,
    "(401)",
  );
  assertEquals(attempts, 1);
});

Deno.test("executeWithRetry: respects abort signal", async () => {
  const controller = new AbortController();
  controller.abort(new Error("user cancelled"));
  let attempts = 0;
  await assertRejects(
    () =>
      executeWithRetry(
        () => {
          attempts++;
          return Promise.reject(new Error("Rate limited (429)"));
        },
        {
          maxRetries: 2,
          baseDelayMs: 100,
          providerName: "test",
          operation: "complete",
          signal: controller.signal,
        },
      ),
    Error,
  );
  assertEquals(attempts, 1);
});

// ─── withRetry decorator ─────────────────────────────────────────────────────

Deno.test("withRetry: preserves provider name and capabilities", () => {
  const inner: LlmProvider = {
    name: "test-provider",
    supportsStreaming: true,
    contextWindow: 128000,
    complete: () =>
      Promise.resolve({
        content: "",
        toolCalls: [],
        usage: { inputTokens: 0, outputTokens: 0 },
      }),
  };
  const wrapped = withRetry(inner);
  assertEquals(wrapped.name, "test-provider");
  assertEquals(wrapped.supportsStreaming, true);
  assertEquals(wrapped.contextWindow, 128000);
});

Deno.test("withRetry: retries complete() on transient failure", async () => {
  let attempts = 0;
  const inner: LlmProvider = {
    name: "test",
    supportsStreaming: false,
    complete: () => {
      attempts++;
      if (attempts === 1) {
        return Promise.reject(new Error("Overloaded (429): try again"));
      }
      return Promise.resolve({
        content: "hello",
        toolCalls: [],
        usage: { inputTokens: 10, outputTokens: 5 },
      });
    },
  };
  const wrapped = withRetry(inner, { maxRetries: 2, baseDelayMs: 1 });
  const result = await wrapped.complete([], [], {});
  assertEquals(result.content, "hello");
  assertEquals(attempts, 2);
});

Deno.test("withRetry: stream undefined when inner has no stream", () => {
  const inner: LlmProvider = {
    name: "test",
    supportsStreaming: false,
    complete: () =>
      Promise.resolve({
        content: "",
        toolCalls: [],
        usage: { inputTokens: 0, outputTokens: 0 },
      }),
  };
  const wrapped = withRetry(inner);
  assertEquals(wrapped.stream, undefined);
});

Deno.test("withRetry: stream retries initial connection on transient failure", async () => {
  let attempts = 0;
  const inner: LlmProvider = {
    name: "test",
    supportsStreaming: true,
    complete: () =>
      Promise.resolve({
        content: "",
        toolCalls: [],
        usage: { inputTokens: 0, outputTokens: 0 },
      }),
    stream: (_msgs, _tools, _opts) => {
      attempts++;
      if (attempts === 1) throw new Error("Bad gateway (502)");
      return (async function* () {
        yield { text: "hello", done: false };
        yield {
          text: "",
          done: true,
          usage: { inputTokens: 5, outputTokens: 3 },
        };
      })();
    },
  };
  const wrapped = withRetry(inner, { maxRetries: 2, baseDelayMs: 1 });
  const chunks: string[] = [];
  for await (const chunk of wrapped.stream!([], [], {})) {
    chunks.push(chunk.text);
  }
  assertEquals(chunks, ["hello", ""]);
  assertEquals(attempts, 2);
});
