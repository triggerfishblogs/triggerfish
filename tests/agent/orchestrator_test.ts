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
import { createOrchestrator, LEAKED_INTENT_PATTERN } from "../../src/agent/orchestrator.ts";
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

Deno.test("Orchestrator: parses tool calls with 'args' key", async () => {
  const engine = createPolicyEngine();
  const runner = createHookRunner(engine);
  const registry = createProviderRegistry();

  // Provider returns a tool call with "args" key, then a final response
  let callCount = 0;
  const toolProvider: LlmProvider = {
    name: "tool-test",
    supportsStreaming: false,
    async complete(_messages, _tools, _options) {
      callCount++;
      if (callCount === 1) {
        return {
          content: '<tool_call>\n{"name": "read_file", "args": {"path": "/tmp/test.txt"}}\n</tool_call>',
          toolCalls: [],
          usage: { inputTokens: 10, outputTokens: 5 },
        };
      }
      return { content: "Done reading file.", toolCalls: [], usage: { inputTokens: 10, outputTokens: 5 } };
    },
  };
  registry.register(toolProvider);
  registry.setDefault("tool-test");

  let executedArgs: Record<string, unknown> = {};
  const orchestrator = createOrchestrator({
    hookRunner: runner,
    providerRegistry: registry,
    tools: [{ name: "read_file", description: "Read a file", parameters: { path: { type: "string", description: "path", required: true } } }],
    toolExecutor: async (_name, input) => { executedArgs = input; return "file content"; },
  });

  const session = createSession({ userId: "u" as UserId, channelId: "c" as ChannelId });
  await orchestrator.processMessage({ session, message: "read it", targetClassification: "INTERNAL" });
  assertEquals(executedArgs.path, "/tmp/test.txt");
});

Deno.test("Orchestrator: parses tool calls with 'input' key", async () => {
  const engine = createPolicyEngine();
  const runner = createHookRunner(engine);
  const registry = createProviderRegistry();

  let callCount = 0;
  const toolProvider: LlmProvider = {
    name: "tool-test",
    supportsStreaming: false,
    async complete(_messages, _tools, _options) {
      callCount++;
      if (callCount === 1) {
        return {
          content: '<tool_call>\n{"name": "run_command", "input": {"command": "ls -la"}}\n</tool_call>',
          toolCalls: [],
          usage: { inputTokens: 10, outputTokens: 5 },
        };
      }
      return { content: "Listed files.", toolCalls: [], usage: { inputTokens: 10, outputTokens: 5 } };
    },
  };
  registry.register(toolProvider);
  registry.setDefault("tool-test");

  let executedArgs: Record<string, unknown> = {};
  const orchestrator = createOrchestrator({
    hookRunner: runner,
    providerRegistry: registry,
    tools: [{ name: "run_command", description: "Run command", parameters: { command: { type: "string", description: "cmd", required: true } } }],
    toolExecutor: async (_name, input) => { executedArgs = input; return "output"; },
  });

  const session = createSession({ userId: "u" as UserId, channelId: "c" as ChannelId });
  await orchestrator.processMessage({ session, message: "run ls", targetClassification: "INTERNAL" });
  assertEquals(executedArgs.command, "ls -la");
});

Deno.test("Orchestrator: parses tool calls with 'parameters' key", async () => {
  const engine = createPolicyEngine();
  const runner = createHookRunner(engine);
  const registry = createProviderRegistry();

  let callCount = 0;
  const toolProvider: LlmProvider = {
    name: "tool-test",
    supportsStreaming: false,
    async complete(_messages, _tools, _options) {
      callCount++;
      if (callCount === 1) {
        return {
          content: '<tool_call>\n{"name": "list_directory", "parameters": {"path": "/home"}}\n</tool_call>',
          toolCalls: [],
          usage: { inputTokens: 10, outputTokens: 5 },
        };
      }
      return { content: "Listed dir.", toolCalls: [], usage: { inputTokens: 10, outputTokens: 5 } };
    },
  };
  registry.register(toolProvider);
  registry.setDefault("tool-test");

  let executedArgs: Record<string, unknown> = {};
  const orchestrator = createOrchestrator({
    hookRunner: runner,
    providerRegistry: registry,
    tools: [{ name: "list_directory", description: "List dir", parameters: { path: { type: "string", description: "path", required: true } } }],
    toolExecutor: async (_name, input) => { executedArgs = input; return "/home/venom"; },
  });

  const session = createSession({ userId: "u" as UserId, channelId: "c" as ChannelId });
  await orchestrator.processMessage({ session, message: "list home", targetClassification: "INTERNAL" });
  assertEquals(executedArgs.path, "/home");
});

Deno.test("Orchestrator: parses tool calls with flat args format", async () => {
  const engine = createPolicyEngine();
  const runner = createHookRunner(engine);
  const registry = createProviderRegistry();

  let callCount = 0;
  const toolProvider: LlmProvider = {
    name: "tool-test",
    supportsStreaming: false,
    async complete(_messages, _tools, _options) {
      callCount++;
      if (callCount === 1) {
        return {
          content: '<tool_call>\n{"name": "run_command", "command": "echo hello"}\n</tool_call>',
          toolCalls: [],
          usage: { inputTokens: 10, outputTokens: 5 },
        };
      }
      return { content: "Echoed.", toolCalls: [], usage: { inputTokens: 10, outputTokens: 5 } };
    },
  };
  registry.register(toolProvider);
  registry.setDefault("tool-test");

  let executedArgs: Record<string, unknown> = {};
  const orchestrator = createOrchestrator({
    hookRunner: runner,
    providerRegistry: registry,
    tools: [{ name: "run_command", description: "Run command", parameters: { command: { type: "string", description: "cmd", required: true } } }],
    toolExecutor: async (_name, input) => { executedArgs = input; return "hello"; },
  });

  const session = createSession({ userId: "u" as UserId, channelId: "c" as ChannelId });
  await orchestrator.processMessage({ session, message: "echo", targetClassification: "INTERNAL" });
  assertEquals(executedArgs.command, "echo hello");
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

// --- LEAKED_INTENT_PATTERN tests ---

Deno.test("LEAKED_INTENT_PATTERN: matches common leaked-intent phrases", () => {
  const positives = [
    "I'll search for restaurants in Austin.",
    "Let me fetch that page for you.",
    "I need to look up the details.",
    "I should search for more information.",
    "I will fetch the content now.",
    "Let me find the best results.",
    "I can search for that.",
    "I am going to fetch the page.",
    "We need to fetch details.",
    "I need to retrieve the data.",
    "Let me browse the web for that.",
    "Let me use web_search to find it.",
  ];
  for (const phrase of positives) {
    assert(LEAKED_INTENT_PATTERN.test(phrase), `Should match: "${phrase}"`);
  }
});

Deno.test("LEAKED_INTENT_PATTERN: does not match normal response text", () => {
  const negatives = [
    "Based on my search of the documents, here are the results.",
    "The search engine returned 5 results.",
    "Here are the best fried fish restaurants in South Austin.",
    "I found 3 great options for you.",
    "The fetched data shows interesting trends.",
    "According to the website, the restaurant opens at 11am.",
    "Search results indicate several options.",
  ];
  for (const phrase of negatives) {
    assert(!LEAKED_INTENT_PATTERN.test(phrase), `Should NOT match: "${phrase}"`);
  }
});

// Note: The leaked-intent guard was removed from the orchestrator because it
// caused blank responses with some LLM providers. The LEAKED_INTENT_PATTERN
// regex is still exported and tested above for potential future use.
