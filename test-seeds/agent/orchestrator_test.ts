/**
 * Phase 10: Agent Orchestrator
 * Tests MUST FAIL until orchestrator.ts and llm.ts are implemented.
 * Tests LlmProvider interface, provider registry, orchestrator loop.
 */
import { assertEquals, assertExists, assert } from "jsr:@std/assert";
import {
  type LlmProvider,
  type LlmProviderRegistry,
  createProviderRegistry,
} from "../../src/agent/llm.ts";
import { createOrchestrator } from "../../src/agent/orchestrator.ts";
import { createPolicyEngine } from "../../src/core/policy/engine.ts";
import { createHookRunner, createDefaultRules } from "../../src/core/policy/hooks.ts";
import { createSession } from "../../src/core/types/session.ts";
import type { UserId, ChannelId } from "../../src/core/types/session.ts";

// --- Mock LLM Provider ---

function createMockProvider(name: string, response = "mock response"): LlmProvider {
  return {
    name,
    supportsStreaming: false,
    async complete(messages, _tools, _options) {
      return {
        content: response,
        toolCalls: [],
        usage: { inputTokens: 10, outputTokens: 5 },
      };
    },
  };
}

// --- Provider Registry ---

Deno.test("ProviderRegistry: register and get provider", () => {
  const registry = createProviderRegistry();
  const mock = createMockProvider("test-provider");
  registry.register(mock);
  const retrieved = registry.get("test-provider");
  assertExists(retrieved);
  assertEquals(retrieved!.name, "test-provider");
});

Deno.test("ProviderRegistry: get returns undefined for unregistered", () => {
  const registry = createProviderRegistry();
  assertEquals(registry.get("nonexistent"), undefined);
});

Deno.test("ProviderRegistry: setDefault and getDefault", () => {
  const registry = createProviderRegistry();
  const mock = createMockProvider("primary");
  registry.register(mock);
  registry.setDefault("primary");
  const def = registry.getDefault();
  assertExists(def);
  assertEquals(def!.name, "primary");
});

// --- LlmProvider interface ---

Deno.test("LlmProvider: complete returns content and usage", async () => {
  const provider = createMockProvider("test", "hello world");
  const result = await provider.complete(
    [{ role: "user", content: "hi" }],
    [],
    {},
  );
  assertEquals(result.content, "hello world");
  assertExists(result.usage);
  assert(result.usage.inputTokens > 0);
});

// --- Orchestrator ---

Deno.test("Orchestrator: processes message through full loop", async () => {
  const engine = createPolicyEngine();
  for (const r of createDefaultRules()) engine.addRule(r);
  const runner = createHookRunner(engine);

  const registry = createProviderRegistry();
  registry.register(createMockProvider("mock", "agent response"));
  registry.setDefault("mock");

  const orchestrator = createOrchestrator({
    hookRunner: runner,
    providerRegistry: registry,
  });

  const session = createSession({
    userId: "u" as UserId,
    channelId: "c" as ChannelId,
  });

  const result = await orchestrator.processMessage({
    session,
    message: "Hello agent",
    targetClassification: "INTERNAL",
  });
  assertEquals(result.ok, true);
  if (result.ok) {
    assertExists(result.value.response);
  }
});

Deno.test("Orchestrator: blocks output when write-down would occur", async () => {
  const engine = createPolicyEngine();
  for (const r of createDefaultRules()) engine.addRule(r);
  const runner = createHookRunner(engine);

  const registry = createProviderRegistry();
  registry.register(createMockProvider("mock"));
  registry.setDefault("mock");

  const orchestrator = createOrchestrator({
    hookRunner: runner,
    providerRegistry: registry,
  });

  // Session already tainted to RESTRICTED
  let session = createSession({ userId: "u" as UserId, channelId: "c" as ChannelId });
  const { updateTaint } = await import("../../src/core/types/session.ts");
  session = updateTaint(session, "RESTRICTED", "secret doc");

  // Trying to output to PUBLIC channel should be blocked
  const result = await orchestrator.processMessage({
    session,
    message: "tell me the secret",
    targetClassification: "PUBLIC",
  });
  assertEquals(result.ok, false);
});

Deno.test("Orchestrator: maintains conversation history per session", async () => {
  const engine = createPolicyEngine();
  const runner = createHookRunner(engine);
  const registry = createProviderRegistry();
  registry.register(createMockProvider("mock", "response"));
  registry.setDefault("mock");

  const orchestrator = createOrchestrator({
    hookRunner: runner,
    providerRegistry: registry,
  });

  const session = createSession({ userId: "u" as UserId, channelId: "c" as ChannelId });

  await orchestrator.processMessage({
    session,
    message: "first message",
    targetClassification: "INTERNAL",
  });

  const history = orchestrator.getHistory(session.id);
  assert(history.length >= 2); // user message + assistant response
});

Deno.test("Orchestrator: loads SPINE.md as system prompt foundation", async () => {
  const engine = createPolicyEngine();
  const runner = createHookRunner(engine);
  const registry = createProviderRegistry();

  // Track what system prompt the provider receives
  let receivedSystemPrompt = "";
  const trackingProvider: LlmProvider = {
    name: "tracking",
    supportsStreaming: false,
    async complete(messages, _tools, _options) {
      const system = messages.find((m) => m.role === "system");
      if (system) receivedSystemPrompt = system.content as string;
      return { content: "ok", toolCalls: [], usage: { inputTokens: 1, outputTokens: 1 } };
    },
  };
  registry.register(trackingProvider);
  registry.setDefault("tracking");

  const orchestrator = createOrchestrator({
    hookRunner: runner,
    providerRegistry: registry,
    spinePath: "/tmp/test-spine.md",
  });

  const session = createSession({ userId: "u" as UserId, channelId: "c" as ChannelId });
  await orchestrator.processMessage({
    session,
    message: "hi",
    targetClassification: "INTERNAL",
  });

  // Orchestrator should include SPINE.md content or a default system prompt
  assert(receivedSystemPrompt.length > 0, "System prompt should not be empty");
});

Deno.test("Orchestrator: uses default prompt when SPINE.md absent", async () => {
  const engine = createPolicyEngine();
  const runner = createHookRunner(engine);
  const registry = createProviderRegistry();
  registry.register(createMockProvider("mock", "ok"));
  registry.setDefault("mock");

  const orchestrator = createOrchestrator({
    hookRunner: runner,
    providerRegistry: registry,
    spinePath: "/nonexistent/SPINE.md",
  });

  const session = createSession({ userId: "u" as UserId, channelId: "c" as ChannelId });
  const result = await orchestrator.processMessage({
    session,
    message: "hi",
    targetClassification: "INTERNAL",
  });
  assertEquals(result.ok, true);
});
