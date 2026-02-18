/**
 * Tests for context_usage event emission.
 *
 * Verifies that the orchestrator's getContextUsage() returns sensible values
 * and that createChatSession exposes getContextUsage().
 *
 * @module
 */

import { assertEquals, assertExists, assert } from "@std/assert";
import { createOrchestrator } from "../../src/agent/orchestrator.ts";
import { createChatSession } from "../../src/gateway/chat.ts";
import { createProviderRegistry } from "../../src/agent/llm.ts";
import type { LlmProvider } from "../../src/agent/llm.ts";
import { createPolicyEngine } from "../../src/core/policy/engine.ts";
import { createHookRunner, createDefaultRules } from "../../src/core/policy/hooks.ts";
import { createSession } from "../../src/core/types/session.ts";
import type { UserId, ChannelId } from "../../src/core/types/session.ts";
import type { ChatEvent } from "../../src/gateway/chat.ts";

// ─── Helpers ────────────────────────────────────────────────────

function createMockProvider(response = "mock response"): LlmProvider {
  return {
    name: "mock",
    supportsStreaming: false,
    // deno-lint-ignore require-await
    async complete(_messages, _tools, _options) {
      return {
        content: response,
        toolCalls: [],
        usage: { inputTokens: 10, outputTokens: 5 },
      };
    },
  };
}

function makeHookRunner() {
  const engine = createPolicyEngine();
  for (const r of createDefaultRules()) engine.addRule(r);
  return createHookRunner(engine);
}

function makeSession() {
  return createSession({
    userId: "u1" as UserId,
    channelId: "cli" as ChannelId,
  });
}

// ─── Orchestrator.getContextUsage() ─────────────────────────────

Deno.test("Orchestrator.getContextUsage: returns zeros for empty history", () => {
  const registry = createProviderRegistry();
  registry.register(createMockProvider());
  registry.setDefault("mock");

  const orch = createOrchestrator({
    hookRunner: makeHookRunner(),
    providerRegistry: registry,
    compactorConfig: { contextBudget: 100_000 },
  });

  const session = makeSession();
  const usage = orch.getContextUsage(session.id);
  assertEquals(usage.current, 0);
  assertEquals(usage.max, 100_000);
  assertEquals(usage.compactAt, 70_000);
});

Deno.test("Orchestrator.getContextUsage: compactAt is 70% of max", () => {
  const registry = createProviderRegistry();
  registry.register(createMockProvider());
  registry.setDefault("mock");

  const orch = createOrchestrator({
    hookRunner: makeHookRunner(),
    providerRegistry: registry,
    compactorConfig: { contextBudget: 200_000 },
  });

  const session = makeSession();
  const usage = orch.getContextUsage(session.id);
  assertEquals(usage.max, 200_000);
  assertEquals(usage.compactAt, 140_000); // 70% of 200k
});

Deno.test("Orchestrator.getContextUsage: current increases after processMessage", async () => {
  const registry = createProviderRegistry();
  registry.register(createMockProvider("Hello!"));
  registry.setDefault("mock");

  const orch = createOrchestrator({
    hookRunner: makeHookRunner(),
    providerRegistry: registry,
    compactorConfig: { contextBudget: 100_000 },
  });

  const session = makeSession();
  const before = orch.getContextUsage(session.id);
  assertEquals(before.current, 0);

  await orch.processMessage({
    session,
    message: "What is 2+2?",
    targetClassification: "PUBLIC",
  });

  const after = orch.getContextUsage(session.id);
  assert(after.current > 0, "current tokens must be > 0 after processing a message");
});

// ─── ChatSession.getContextUsage() ──────────────────────────────

Deno.test("ChatSession: exposes getContextUsage()", () => {
  const registry = createProviderRegistry();
  registry.register(createMockProvider());
  registry.setDefault("mock");

  const session = makeSession();
  const chatSession = createChatSession({
    hookRunner: makeHookRunner(),
    providerRegistry: registry,
    session,
    compactorConfig: { contextBudget: 100_000 },
  });

  assertExists(chatSession.getContextUsage);
  const usage = chatSession.getContextUsage!();
  assertEquals(usage.current, 0);
  assertEquals(usage.max, 100_000);
  assertEquals(usage.compactAt, 70_000);
});

// ─── context_usage emitted after llm_complete ───────────────────

Deno.test("ChatSession: emits context_usage event after llm_complete", async () => {
  const registry = createProviderRegistry();
  registry.register(createMockProvider("Hello!"));
  registry.setDefault("mock");

  const session = makeSession();
  const chatSession = createChatSession({
    hookRunner: makeHookRunner(),
    providerRegistry: registry,
    session,
    compactorConfig: { contextBudget: 100_000 },
  });

  const events: ChatEvent[] = [];
  await chatSession.processMessage(
    "Hi there",
    (evt) => events.push(evt),
  );

  const contextUsageEvents = events.filter((e) => e.type === "context_usage");
  assert(contextUsageEvents.length > 0, "must emit at least one context_usage event");

  const lastUsage = contextUsageEvents[contextUsageEvents.length - 1];
  if (lastUsage.type !== "context_usage") throw new Error("wrong type");
  assert(lastUsage.current >= 0);
  assertEquals(lastUsage.max, 100_000);
  assertEquals(lastUsage.compactAt, 70_000);
});

// ─── context_usage emitted after compact ────────────────────────

Deno.test("ChatSession: emits context_usage event after compact", async () => {
  const registry = createProviderRegistry();
  registry.register(createMockProvider("Hello!"));
  registry.setDefault("mock");

  const session = makeSession();
  const chatSession = createChatSession({
    hookRunner: makeHookRunner(),
    providerRegistry: registry,
    session,
    compactorConfig: { contextBudget: 100_000 },
  });

  // Send a message first to populate history
  await chatSession.processMessage("Hi there", () => {});

  const events: ChatEvent[] = [];
  await chatSession.compact((evt) => events.push(evt));

  const contextUsageEvents = events.filter((e) => e.type === "context_usage");
  assert(contextUsageEvents.length > 0, "must emit context_usage after compact");
});
