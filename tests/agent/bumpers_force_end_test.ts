/**
 * Bumpers force-end tests.
 *
 * Verifies that when bumpers block a tool call, the agent turn
 * force-ends with a canned user-facing response. The LLM must
 * never see the block result (preventing silent retry).
 */
import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import type { LlmProvider } from "../../src/agent/llm.ts";
import { createProviderRegistry } from "../../src/agent/llm.ts";
import { createOrchestrator } from "../../src/agent/orchestrator/orchestrator.ts";
import type { ToolDefinition } from "../../src/agent/orchestrator/orchestrator_types.ts";
import { createPolicyEngine } from "../../src/core/policy/engine.ts";
import {
  createDefaultRules,
  createHookRunner,
} from "../../src/core/policy/hooks/hooks.ts";
import { createSession } from "../../src/core/types/session.ts";
import type { ChannelId, UserId } from "../../src/core/types/session.ts";
import { BUMPER_BLOCK_MESSAGE } from "../../src/core/session/bumpers.ts";
import { BUMPERS_BLOCK_USER_RESPONSE } from "../../src/agent/dispatch/tool_dispatch.ts";

// ─── Mock helpers ───────────────────────────────────────────────────────────

interface MockResponse {
  readonly content: string;
  readonly toolCalls?: readonly Record<string, unknown>[];
}

function toolResponse(
  ...calls: Array<{ name: string; args: Record<string, unknown> }>
): MockResponse {
  return {
    content: "",
    toolCalls: calls.map((c) => ({
      type: "function",
      function: { name: c.name, arguments: JSON.stringify(c.args) },
    })),
  };
}

function textResponse(content: string): MockResponse {
  return { content, toolCalls: [] };
}

function createMockProvider(responses: readonly MockResponse[]): LlmProvider {
  let callIndex = 0;
  return {
    name: "mock",
    supportsStreaming: false,
    // deno-lint-ignore require-await
    async complete(_messages, _tools, _options) {
      const r = responses[callIndex] ??
        { content: "No more responses", toolCalls: [] };
      callIndex++;
      return {
        content: r.content,
        toolCalls: r.toolCalls ?? [],
        usage: { inputTokens: 10, outputTokens: 5 },
      };
    },
  };
}

// ─── Test orchestrator factory ──────────────────────────────────────────────

interface TestHarness {
  readonly orchestrator: ReturnType<typeof createOrchestrator>;
  readonly session: ReturnType<typeof createSession>;
  readonly toolResults: Array<{
    name: string;
    result: string;
    blocked: boolean;
  }>;
  readonly responseEvents: string[];
  readonly llmCallCount: () => number;
}

function createBumpersTestOrchestrator(
  responses: readonly MockResponse[],
): TestHarness {
  let callCount = 0;
  const registry = createProviderRegistry();
  const baseProvider = createMockProvider(responses);
  const countingProvider: LlmProvider = {
    name: "mock",
    supportsStreaming: false,
    complete(messages, tools, options) {
      callCount++;
      return baseProvider.complete(messages, tools, options);
    },
  };
  registry.register(countingProvider);
  registry.setDefault("mock");

  const engine = createPolicyEngine();
  for (const rule of createDefaultRules()) engine.addRule(rule);
  const hookRunner = createHookRunner(engine);

  const tools: readonly ToolDefinition[] = [
    {
      name: "gmail_read",
      description: "Read Gmail",
      parameters: {
        id: { type: "string", description: "Email ID", required: true },
      },
    },
    {
      name: "echo",
      description: "Echo text",
      parameters: {
        text: { type: "string", description: "Text", required: true },
      },
    },
  ];

  const toolResults: Array<{
    name: string;
    result: string;
    blocked: boolean;
  }> = [];
  const responseEvents: string[] = [];

  const orchestrator = createOrchestrator({
    hookRunner,
    providerRegistry: registry,
    tools,
    // deno-lint-ignore require-await
    toolExecutor: async (name, args) => {
      return `Executed ${name}: ${JSON.stringify(args)}`;
    },
    // gmail_ prefix classified as CONFIDENTIAL
    toolClassifications: new Map([["gmail_", "CONFIDENTIAL"]]),
    // Bumpers block anything above PUBLIC
    checkBumpersBlock: (level) => {
      if (level !== "PUBLIC") return BUMPER_BLOCK_MESSAGE;
      return null;
    },
    onEvent: (event) => {
      if (event.type === "tool_result") {
        toolResults.push({
          name: event.name,
          result: event.result,
          blocked: event.blocked,
        });
      }
      if (event.type === "response") {
        responseEvents.push(event.text);
      }
    },
  });

  const session = createSession({
    userId: "owner" as UserId,
    channelId: "test" as ChannelId,
  });

  return {
    orchestrator,
    session,
    toolResults,
    responseEvents,
    llmCallCount: () => callCount,
  };
}

// ─── Tests ──────────────────────────────────────────────────────────────────

Deno.test("Bumpers force-end: blocked tool call ends turn with canned response", async () => {
  // LLM tries to call gmail_read (CONFIDENTIAL) → bumpers block → turn ends.
  // Second response should never be reached.
  const responses = [
    toolResponse({ name: "gmail_read", args: { id: "msg-123" } }),
    textResponse("I should never appear because the turn was force-ended."),
  ];

  const harness = createBumpersTestOrchestrator(responses);
  const result = await harness.orchestrator.executeAgentTurn({
    session: harness.session,
    message: "Read my latest email",
    targetClassification: "PUBLIC",
  });

  // Turn should succeed (not error) with the canned bumpers message
  assert(result.ok, "Turn should complete successfully");
  if (result.ok) {
    assertEquals(result.value.response, BUMPERS_BLOCK_USER_RESPONSE);
  }

  // The tool_result event should show the block
  const gmailResult = harness.toolResults.find((r) => r.name === "gmail_read");
  assert(gmailResult !== undefined, "gmail_read tool call should appear");
  assert(gmailResult!.blocked, "gmail_read should be blocked");

  // LLM should only have been called ONCE — the force-end prevents a second call
  assertEquals(
    harness.llmCallCount(),
    1,
    "LLM must not be called again after bumpers force-end",
  );
});

Deno.test("Bumpers force-end: response event is emitted with canned message", async () => {
  const responses = [
    toolResponse({ name: "gmail_read", args: { id: "msg-456" } }),
    textResponse("unreachable"),
  ];

  const harness = createBumpersTestOrchestrator(responses);
  await harness.orchestrator.executeAgentTurn({
    session: harness.session,
    message: "Check my email",
    targetClassification: "PUBLIC",
  });

  // A response event should have been emitted with the canned message
  assert(
    harness.responseEvents.length > 0,
    "At least one response event should be emitted",
  );
  assertStringIncludes(
    harness.responseEvents[harness.responseEvents.length - 1],
    "bumpers",
  );
});

Deno.test("Bumpers force-end: non-blocked tools still execute normally", async () => {
  // echo tool has no classification prefix → no bumper block
  const responses = [
    toolResponse({ name: "echo", args: { text: "hello" } }),
    textResponse("Done echoing."),
  ];

  const harness = createBumpersTestOrchestrator(responses);
  const result = await harness.orchestrator.executeAgentTurn({
    session: harness.session,
    message: "Echo hello",
    targetClassification: "PUBLIC",
  });

  assert(result.ok, "Turn should succeed");
  if (result.ok) {
    assertEquals(result.value.response, "Done echoing.");
  }

  // echo should not be blocked
  const echoResult = harness.toolResults.find((r) => r.name === "echo");
  assert(echoResult !== undefined, "echo tool call should appear");
  assert(!echoResult!.blocked, "echo should NOT be blocked");

  // LLM called twice: once for tool call, once for final response
  assertEquals(harness.llmCallCount(), 2);
});
