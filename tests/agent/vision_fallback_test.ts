/**
 * Tests for vision model fallback in the orchestrator.
 *
 * When a separate vision provider is configured, the orchestrator
 * should describe images via the vision provider and pass text-only
 * content to the primary model.
 *
 * @module
 */

import { assertEquals, assert, assertExists } from "@std/assert";
import type { LlmProvider } from "../../src/agent/llm.ts";
import { createProviderRegistry } from "../../src/agent/llm.ts";
import { createOrchestrator } from "../../src/agent/orchestrator/orchestrator.ts";
import type { OrchestratorEvent } from "../../src/agent/orchestrator/orchestrator_types.ts";
import { createPolicyEngine } from "../../src/core/policy/engine.ts";
import { createHookRunner, createDefaultRules } from "../../src/core/policy/hooks/hooks.ts";
import { createSession } from "../../src/core/types/session.ts";
import type { UserId, ChannelId } from "../../src/core/types/session.ts";
import type { ContentBlock } from "../../src/core/image/content.ts";
import { resolveVisionProvider } from "../../src/agent/providers/config.ts";
import type { ModelsConfig } from "../../src/agent/providers/config.ts";

// --- Helpers ---

function createMockProvider(name: string, response = "mock response"): LlmProvider {
  return {
    name,
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
    userId: "u" as UserId,
    channelId: "c" as ChannelId,
  });
}

function makeImageMessage(text = "What is this?"): readonly ContentBlock[] {
  return [
    { type: "image", source: { type: "base64", media_type: "image/png", data: "abc123" } },
    { type: "text", text },
  ];
}

// --- Vision Fallback Tests ---

Deno.test("Vision fallback: describes images when visionProvider is configured", async () => {
  let primaryReceivedContent: string | unknown = "";
  const primaryProvider: LlmProvider = {
    name: "text-only",
    supportsStreaming: false,
    // deno-lint-ignore require-await
    async complete(messages, _tools, _options) {
      const lastUser = messages.filter((m) => m.role === "user").pop();
      primaryReceivedContent = lastUser?.content;
      return {
        content: "I see you described an image.",
        toolCalls: [],
        usage: { inputTokens: 10, outputTokens: 5 },
      };
    },
  };

  const visionProvider: LlmProvider = {
    name: "vision",
    supportsStreaming: false,
    // deno-lint-ignore require-await
    async complete(_messages, _tools, _options) {
      return {
        content: "A red car parked on a street.",
        toolCalls: [],
        usage: { inputTokens: 100, outputTokens: 20 },
      };
    },
  };

  const registry = createProviderRegistry();
  registry.register(primaryProvider);
  registry.setDefault("text-only");

  const orchestrator = createOrchestrator({
    hookRunner: makeHookRunner(),
    providerRegistry: registry,
    visionProvider,
  });

  const result = await orchestrator.executeAgentTurn({
    session: makeSession(),
    message: makeImageMessage(),
    targetClassification: "INTERNAL",
  });

  assertEquals(result.ok, true);
  // Primary should receive text-only content with the image description
  assert(typeof primaryReceivedContent === "string", "Primary should receive text-only content");
  assert(
    (primaryReceivedContent as string).includes("A red car parked on a street."),
    "Should include image description",
  );
  assert(
    (primaryReceivedContent as string).includes("What is this?"),
    "Should include original user text",
  );
});

Deno.test("Vision fallback: no fallback when visionProvider not configured", async () => {
  let primaryReceivedContent: string | unknown = "";
  const provider: LlmProvider = {
    name: "multimodal",
    supportsStreaming: false,
    // deno-lint-ignore require-await
    async complete(messages, _tools, _options) {
      const lastUser = messages.filter((m) => m.role === "user").pop();
      primaryReceivedContent = lastUser?.content;
      return {
        content: "I can see the image directly.",
        toolCalls: [],
        usage: { inputTokens: 10, outputTokens: 5 },
      };
    },
  };

  const registry = createProviderRegistry();
  registry.register(provider);
  registry.setDefault("multimodal");

  const orchestrator = createOrchestrator({
    hookRunner: makeHookRunner(),
    providerRegistry: registry,
    // No visionProvider — images pass through
  });

  const result = await orchestrator.executeAgentTurn({
    session: makeSession(),
    message: makeImageMessage(),
    targetClassification: "INTERNAL",
  });

  assertEquals(result.ok, true);
  // Without vision fallback, content should remain as ContentBlock[]
  assert(typeof primaryReceivedContent !== "string", "Should pass through image blocks");
});

Deno.test("Vision fallback: emits vision_start and vision_complete events", async () => {
  const visionProvider: LlmProvider = {
    name: "vision",
    supportsStreaming: false,
    // deno-lint-ignore require-await
    async complete() {
      return { content: "description", toolCalls: [], usage: { inputTokens: 0, outputTokens: 0 } };
    },
  };

  const registry = createProviderRegistry();
  registry.register(createMockProvider("mock", "got it"));
  registry.setDefault("mock");

  const events: OrchestratorEvent[] = [];
  const orchestrator = createOrchestrator({
    hookRunner: makeHookRunner(),
    providerRegistry: registry,
    visionProvider,
    onEvent: (evt) => events.push(evt),
  });

  await orchestrator.executeAgentTurn({
    session: makeSession(),
    message: makeImageMessage(),
    targetClassification: "INTERNAL",
  });

  const eventTypes = events.map((e) => e.type);
  assert(eventTypes.includes("vision_start"), "Should emit vision_start");
  assert(eventTypes.includes("vision_complete"), "Should emit vision_complete");
  // Vision events should come before llm_start
  assert(
    eventTypes.indexOf("vision_start") < eventTypes.indexOf("llm_start"),
    "vision_start should precede llm_start",
  );
  assert(
    eventTypes.indexOf("vision_complete") < eventTypes.indexOf("llm_start"),
    "vision_complete should precede llm_start",
  );
});

Deno.test("Vision fallback: reports correct imageCount", async () => {
  const visionProvider: LlmProvider = {
    name: "vision",
    supportsStreaming: false,
    // deno-lint-ignore require-await
    async complete() {
      return { content: "image desc", toolCalls: [], usage: { inputTokens: 0, outputTokens: 0 } };
    },
  };

  const registry = createProviderRegistry();
  registry.register(createMockProvider("mock"));
  registry.setDefault("mock");

  const events: OrchestratorEvent[] = [];
  const orchestrator = createOrchestrator({
    hookRunner: makeHookRunner(),
    providerRegistry: registry,
    visionProvider,
    onEvent: (evt) => events.push(evt),
  });

  // Message with 2 images
  const twoImageMessage: readonly ContentBlock[] = [
    { type: "image", source: { type: "base64", media_type: "image/png", data: "img1" } },
    { type: "image", source: { type: "base64", media_type: "image/jpeg", data: "img2" } },
    { type: "text", text: "Compare these" },
  ];

  await orchestrator.executeAgentTurn({
    session: makeSession(),
    message: twoImageMessage,
    targetClassification: "INTERNAL",
  });

  const visionStart = events.find((e) => e.type === "vision_start") as
    | { type: "vision_start"; imageCount: number }
    | undefined;
  assertExists(visionStart);
  assertEquals(visionStart!.imageCount, 2);
});

Deno.test("Vision fallback: handles vision provider error gracefully", async () => {
  const visionProvider: LlmProvider = {
    name: "vision",
    supportsStreaming: false,
    // deno-lint-ignore require-await
    async complete() {
      throw new Error("Vision API unavailable");
    },
  };

  const registry = createProviderRegistry();
  registry.register(createMockProvider("mock", "fallback response"));
  registry.setDefault("mock");

  const orchestrator = createOrchestrator({
    hookRunner: makeHookRunner(),
    providerRegistry: registry,
    visionProvider,
  });

  // Should not throw — graceful degradation
  const result = await orchestrator.executeAgentTurn({
    session: makeSession(),
    message: makeImageMessage(),
    targetClassification: "INTERNAL",
  });

  assertEquals(result.ok, true);
});

Deno.test("Vision fallback: skips for string-only messages", async () => {
  let visionCalled = false;
  const visionProvider: LlmProvider = {
    name: "vision",
    supportsStreaming: false,
    // deno-lint-ignore require-await
    async complete() {
      visionCalled = true;
      return { content: "desc", toolCalls: [], usage: { inputTokens: 0, outputTokens: 0 } };
    },
  };

  const registry = createProviderRegistry();
  registry.register(createMockProvider("mock"));
  registry.setDefault("mock");

  const orchestrator = createOrchestrator({
    hookRunner: makeHookRunner(),
    providerRegistry: registry,
    visionProvider,
  });

  await orchestrator.executeAgentTurn({
    session: makeSession(),
    message: "just a text message",
    targetClassification: "INTERNAL",
  });

  assertEquals(visionCalled, false, "Vision provider should not be called for text-only messages");
});

Deno.test("Vision fallback: skips for text-only content blocks", async () => {
  let visionCalled = false;
  const visionProvider: LlmProvider = {
    name: "vision",
    supportsStreaming: false,
    // deno-lint-ignore require-await
    async complete() {
      visionCalled = true;
      return { content: "desc", toolCalls: [], usage: { inputTokens: 0, outputTokens: 0 } };
    },
  };

  const registry = createProviderRegistry();
  registry.register(createMockProvider("mock"));
  registry.setDefault("mock");

  const orchestrator = createOrchestrator({
    hookRunner: makeHookRunner(),
    providerRegistry: registry,
    visionProvider,
  });

  // Content blocks without images
  const textBlocks: readonly ContentBlock[] = [
    { type: "text", text: "just text blocks" },
  ];

  await orchestrator.executeAgentTurn({
    session: makeSession(),
    message: textBlocks,
    targetClassification: "INTERNAL",
  });

  assertEquals(visionCalled, false, "Vision provider should not be called when no images present");
});

// --- Config Tests ---

Deno.test("resolveVisionProvider: returns undefined when no vision model", () => {
  const config: ModelsConfig = {
    primary: { provider: "zai", model: "glm-5" },
    providers: { zai: { model: "glm-5", apiKey: "test" } },
  };
  const result = resolveVisionProvider(config);
  assertEquals(result, undefined);
});

Deno.test("resolveVisionProvider: returns undefined when provider not in config", () => {
  const config: ModelsConfig = {
    primary: { provider: "google", model: "gemini-pro" },
    vision: "gemini-pro-vision",
    providers: { zai: { model: "glm-5", apiKey: "test" } },
  };
  // google provider not in providers config
  const result = resolveVisionProvider(config);
  assertEquals(result, undefined);
});
