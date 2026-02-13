/**
 * Tests for the summarize tool — focused text summarization.
 *
 * Covers: default length/style, all length variants, all style variants,
 * empty text validation, null-return chain, prompt construction.
 */
import { assertEquals, assertStringIncludes } from "jsr:@std/assert";
import {
  buildSummarizePrompt,
  createSummarizeToolExecutor,
  getSummarizeToolDefinitions,
  SUMMARIZE_SYSTEM_PROMPT,
} from "../../src/tools/mod.ts";
import type { LlmProvider, LlmProviderRegistry, LlmCompletionResult, LlmMessage } from "../../src/agent/llm.ts";

/** Create a mock provider that captures the prompt it receives. */
function createCapturingProvider(): { provider: LlmProvider; prompts: string[] } {
  const prompts: string[] = [];
  const provider: LlmProvider = {
    name: "mock",
    supportsStreaming: false,
    complete(messages: readonly LlmMessage[]): Promise<LlmCompletionResult> {
      const userMsg = messages.find((m) => m.role === "user");
      prompts.push(userMsg?.content as string ?? "");
      return Promise.resolve({
        content: "Summary result",
        toolCalls: [],
        usage: { inputTokens: 10, outputTokens: 5 },
      });
    },
  };
  return { provider, prompts };
}

/** Create a mock registry with a default provider. */
function createMockRegistry(defaultProvider?: LlmProvider): LlmProviderRegistry {
  return {
    register(): void {},
    get(): LlmProvider | undefined { return undefined; },
    setDefault(): void {},
    getDefault(): LlmProvider | undefined { return defaultProvider; },
  };
}

// ─── Tool definitions ──────────────────────────────────────────

Deno.test("getSummarizeToolDefinitions returns summarize definition", () => {
  const defs = getSummarizeToolDefinitions();
  assertEquals(defs.length, 1);
  assertEquals(defs[0].name, "summarize");
  assertEquals(typeof defs[0].parameters.text, "object");
});

Deno.test("SUMMARIZE_SYSTEM_PROMPT is non-empty", () => {
  assertStringIncludes(SUMMARIZE_SYSTEM_PROMPT, "summarize");
});

// ─── buildSummarizePrompt ──────────────────────────────────────

Deno.test("buildSummarizePrompt: brief + neutral", () => {
  const prompt = buildSummarizePrompt("Some text", "brief", "neutral");
  assertStringIncludes(prompt, "1-2 sentences");
  assertStringIncludes(prompt, "neutral");
  assertStringIncludes(prompt, "Some text");
});

Deno.test("buildSummarizePrompt: standard + executive", () => {
  const prompt = buildSummarizePrompt("Some text", "standard", "executive");
  assertStringIncludes(prompt, "one concise paragraph");
  assertStringIncludes(prompt, "busy executive");
});

Deno.test("buildSummarizePrompt: detailed + technical", () => {
  const prompt = buildSummarizePrompt("Some text", "detailed", "technical");
  assertStringIncludes(prompt, "3-5 paragraphs");
  assertStringIncludes(prompt, "technical detail");
});

// ─── Default length/style ──────────────────────────────────────

Deno.test("summarize: default length/style when omitted", async () => {
  const { provider, prompts } = createCapturingProvider();
  const registry = createMockRegistry(provider);
  const executor = createSummarizeToolExecutor(registry);

  await executor("summarize", { text: "Test content" });
  assertEquals(prompts.length, 1);
  assertStringIncludes(prompts[0], "one concise paragraph");
  assertStringIncludes(prompts[0], "neutral");
});

// ─── Brief ─────────────────────────────────────────────────────

Deno.test("summarize: brief length", async () => {
  const { provider, prompts } = createCapturingProvider();
  const registry = createMockRegistry(provider);
  const executor = createSummarizeToolExecutor(registry);

  await executor("summarize", { text: "Test content", length: "brief" });
  assertStringIncludes(prompts[0], "1-2 sentences");
});

// ─── Detailed ──────────────────────────────────────────────────

Deno.test("summarize: detailed length", async () => {
  const { provider, prompts } = createCapturingProvider();
  const registry = createMockRegistry(provider);
  const executor = createSummarizeToolExecutor(registry);

  await executor("summarize", { text: "Test content", length: "detailed" });
  assertStringIncludes(prompts[0], "3-5 paragraphs");
});

// ─── Executive style ───────────────────────────────────────────

Deno.test("summarize: executive style", async () => {
  const { provider, prompts } = createCapturingProvider();
  const registry = createMockRegistry(provider);
  const executor = createSummarizeToolExecutor(registry);

  await executor("summarize", { text: "Test content", style: "executive" });
  assertStringIncludes(prompts[0], "busy executive");
});

// ─── Technical style ───────────────────────────────────────────

Deno.test("summarize: technical style", async () => {
  const { provider, prompts } = createCapturingProvider();
  const registry = createMockRegistry(provider);
  const executor = createSummarizeToolExecutor(registry);

  await executor("summarize", { text: "Test content", style: "technical" });
  assertStringIncludes(prompts[0], "technical detail");
});

// ─── Empty text ────────────────────────────────────────────────

Deno.test("summarize: empty text returns error", async () => {
  const { provider } = createCapturingProvider();
  const registry = createMockRegistry(provider);
  const executor = createSummarizeToolExecutor(registry);

  const result = await executor("summarize", { text: "" });
  assertStringIncludes(result!, "Error");
});

Deno.test("summarize: missing text returns error", async () => {
  const { provider } = createCapturingProvider();
  const registry = createMockRegistry(provider);
  const executor = createSummarizeToolExecutor(registry);

  const result = await executor("summarize", {});
  assertStringIncludes(result!, "Error");
});

// ─── No provider ───────────────────────────────────────────────

Deno.test("summarize: no provider returns error", async () => {
  const registry = createMockRegistry(undefined);
  const executor = createSummarizeToolExecutor(registry);

  const result = await executor("summarize", { text: "Test" });
  assertStringIncludes(result!, "Error: No LLM provider available");
});

// ─── Null-return chain ─────────────────────────────────────────

Deno.test("summarize: returns null for unknown tool name", async () => {
  const { provider } = createCapturingProvider();
  const registry = createMockRegistry(provider);
  const executor = createSummarizeToolExecutor(registry);

  const result = await executor("unknown_tool", { text: "Test" });
  assertEquals(result, null);
});

// ─── Invalid length/style defaults gracefully ──────────────────

Deno.test("summarize: invalid length defaults to standard", async () => {
  const { provider, prompts } = createCapturingProvider();
  const registry = createMockRegistry(provider);
  const executor = createSummarizeToolExecutor(registry);

  await executor("summarize", { text: "Test", length: "invalid" });
  assertStringIncludes(prompts[0], "one concise paragraph");
});

Deno.test("summarize: invalid style defaults to neutral", async () => {
  const { provider, prompts } = createCapturingProvider();
  const registry = createMockRegistry(provider);
  const executor = createSummarizeToolExecutor(registry);

  await executor("summarize", { text: "Test", style: "invalid" });
  assertStringIncludes(prompts[0], "neutral");
});
