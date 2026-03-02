/**
 * Tests for the llm_task tool — isolated one-shot LLM completions.
 *
 * Covers: basic completion, system prompt passthrough, model override,
 * missing provider error, empty prompt validation, null-return chain.
 */
import { assertEquals, assertStringIncludes } from "@std/assert";
import {
  createLlmTaskToolExecutor,
  getLlmTaskToolDefinitions,
  LLM_TASK_SYSTEM_PROMPT,
} from "../../src/tools/mod.ts";
import type {
  LlmCompletionResult,
  LlmMessage,
  LlmProvider,
  LlmProviderRegistry,
} from "../../src/agent/llm.ts";

/** Recorded call to the mock provider. */
interface RecordedCall {
  readonly messages: readonly LlmMessage[];
}

/** Create a mock LlmProvider that records calls and returns canned responses. */
function createMockProvider(
  name: string,
  response: string,
): { provider: LlmProvider; calls: RecordedCall[] } {
  const calls: RecordedCall[] = [];
  const provider: LlmProvider = {
    name,
    supportsStreaming: false,
    complete(messages: readonly LlmMessage[]): Promise<LlmCompletionResult> {
      calls.push({ messages });
      return Promise.resolve({
        content: response,
        toolCalls: [],
        usage: { inputTokens: 10, outputTokens: 5 },
      });
    },
  };
  return { provider, calls };
}

/** Create a mock registry with optional default and named providers. */
function createMockRegistry(
  defaultProvider?: LlmProvider,
  namedProviders?: Record<string, LlmProvider>,
): LlmProviderRegistry {
  const providers = new Map<string, LlmProvider>();
  if (namedProviders) {
    for (const [name, p] of Object.entries(namedProviders)) {
      providers.set(name, p);
    }
  }
  return {
    register(p: LlmProvider): void {
      providers.set(p.name, p);
    },
    get(name: string): LlmProvider | undefined {
      return providers.get(name);
    },
    setDefault(_name: string): void {
      // no-op for mock
    },
    getDefault(): LlmProvider | undefined {
      return defaultProvider;
    },
  };
}

// ─── Tool definitions ──────────────────────────────────────────

Deno.test("getLlmTaskToolDefinitions returns llm_task definition", () => {
  const defs = getLlmTaskToolDefinitions();
  assertEquals(defs.length, 1);
  assertEquals(defs[0].name, "llm_task");
  assertEquals(typeof defs[0].description, "string");
  assertEquals(typeof defs[0].parameters.prompt, "object");
});

Deno.test("LLM_TASK_SYSTEM_PROMPT is non-empty", () => {
  assertEquals(typeof LLM_TASK_SYSTEM_PROMPT, "string");
  assertStringIncludes(LLM_TASK_SYSTEM_PROMPT, "llm_task");
});

// ─── Basic completion ──────────────────────────────────────────

Deno.test("llm_task: basic completion returns provider response", async () => {
  const { provider, calls } = createMockProvider("default", "Hello from LLM");
  const registry = createMockRegistry(provider);
  const executor = createLlmTaskToolExecutor(registry);

  const result = await executor("llm_task", { prompt: "Say hello" });
  assertEquals(result, "Hello from LLM");
  assertEquals(calls.length, 1);
  assertEquals(calls[0].messages.length, 1);
  assertEquals(calls[0].messages[0].role, "user");
  assertEquals(calls[0].messages[0].content, "Say hello");
});

// ─── System prompt passthrough ─────────────────────────────────

Deno.test("llm_task: system prompt passed to provider", async () => {
  const { provider, calls } = createMockProvider("default", "OK");
  const registry = createMockRegistry(provider);
  const executor = createLlmTaskToolExecutor(registry);

  await executor("llm_task", { prompt: "Do something", system: "Be helpful" });
  assertEquals(calls[0].messages.length, 2);
  assertEquals(calls[0].messages[0].role, "system");
  assertEquals(calls[0].messages[0].content, "Be helpful");
  assertEquals(calls[0].messages[1].role, "user");
  assertEquals(calls[0].messages[1].content, "Do something");
});

// ─── Model override ────────────────────────────────────────────

Deno.test("llm_task: model override uses named provider", async () => {
  const { provider: defaultP } = createMockProvider(
    "default",
    "default response",
  );
  const { provider: gpt4, calls: gpt4Calls } = createMockProvider(
    "gpt-4",
    "gpt-4 response",
  );
  const registry = createMockRegistry(defaultP, { "gpt-4": gpt4 });
  const executor = createLlmTaskToolExecutor(registry);

  const result = await executor("llm_task", { prompt: "Test", model: "gpt-4" });
  assertEquals(result, "gpt-4 response");
  assertEquals(gpt4Calls.length, 1);
});

Deno.test("llm_task: unknown model falls back to default", async () => {
  const { provider: defaultP, calls: defaultCalls } = createMockProvider(
    "default",
    "default response",
  );
  const registry = createMockRegistry(defaultP);
  const executor = createLlmTaskToolExecutor(registry);

  const result = await executor("llm_task", {
    prompt: "Test",
    model: "nonexistent",
  });
  assertEquals(result, "default response");
  assertEquals(defaultCalls.length, 1);
});

// ─── Missing provider ──────────────────────────────────────────

Deno.test("llm_task: no provider returns error", async () => {
  const registry = createMockRegistry(undefined);
  const executor = createLlmTaskToolExecutor(registry);

  const result = await executor("llm_task", { prompt: "Test" });
  assertStringIncludes(result!, "Error: No LLM provider available");
});

// ─── Empty prompt ──────────────────────────────────────────────

Deno.test("llm_task: empty prompt returns error", async () => {
  const { provider } = createMockProvider("default", "OK");
  const registry = createMockRegistry(provider);
  const executor = createLlmTaskToolExecutor(registry);

  const result = await executor("llm_task", { prompt: "" });
  assertStringIncludes(result!, "Error");
});

Deno.test("llm_task: missing prompt returns error", async () => {
  const { provider } = createMockProvider("default", "OK");
  const registry = createMockRegistry(provider);
  const executor = createLlmTaskToolExecutor(registry);

  const result = await executor("llm_task", {});
  assertStringIncludes(result!, "Error");
});

// ─── Null-return chain ─────────────────────────────────────────

Deno.test("llm_task: returns null for unknown tool name", async () => {
  const { provider } = createMockProvider("default", "OK");
  const registry = createMockRegistry(provider);
  const executor = createLlmTaskToolExecutor(registry);

  const result = await executor("unknown_tool", { prompt: "Test" });
  assertEquals(result, null);
});

// ─── Provider error handling ───────────────────────────────────

Deno.test("llm_task: provider error returns error string", async () => {
  const provider: LlmProvider = {
    name: "failing",
    supportsStreaming: false,
    complete(): Promise<LlmCompletionResult> {
      return Promise.reject(new Error("API rate limited"));
    },
  };
  const registry = createMockRegistry(provider);
  const executor = createLlmTaskToolExecutor(registry);

  const result = await executor("llm_task", { prompt: "Test" });
  assertStringIncludes(result!, "Error in llm_task");
  assertStringIncludes(result!, "API rate limited");
});
