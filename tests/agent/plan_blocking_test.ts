/**
 * Plan mode tool blocking tests (defense-in-depth).
 *
 * Verifies that the orchestrator blocks write tools during plan mode
 * even when the LLM hallucinates write tool calls. Also verifies that
 * read tools remain available in plan mode.
 */
import { assertEquals, assert, assertStringIncludes } from "@std/assert";
import type { LlmProvider } from "../../src/agent/llm.ts";
import { createProviderRegistry } from "../../src/agent/llm.ts";
import { createOrchestrator } from "../../src/agent/orchestrator.ts";
import type { ToolDefinition } from "../../src/agent/orchestrator.ts";
import { createPolicyEngine } from "../../src/core/policy/engine.ts";
import {
  createHookRunner,
  createDefaultRules,
} from "../../src/core/policy/hooks.ts";
import { createSession } from "../../src/core/types/session.ts";
import type { UserId, ChannelId } from "../../src/core/types/session.ts";
import { createPlanManager } from "../../src/agent/plan.ts";
import { getPlanToolDefinitions } from "../../src/agent/plan_tools.ts";

/** A mock response: text content and/or native tool calls. */
interface MockResponse {
  readonly content: string;
  readonly toolCalls?: readonly Record<string, unknown>[];
}

/** Create a mock response with native tool calls. */
function toolResponse(...calls: Array<{ name: string; args: Record<string, unknown> }>): MockResponse {
  return {
    content: '',
    toolCalls: calls.map((c) => ({
      type: "function",
      function: { name: c.name, arguments: JSON.stringify(c.args) },
    })),
  };
}

/** Create a mock response with just text. */
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
      const r = responses[callIndex] ?? { content: "No more responses", toolCalls: [] };
      callIndex++;
      return {
        content: r.content,
        toolCalls: r.toolCalls ?? [],
        usage: { inputTokens: 10, outputTokens: 5 },
      };
    },
  };
}

function createTestOrchestrator(
  responses: readonly MockResponse[],
  planManager: ReturnType<typeof createPlanManager>,
) {
  const registry = createProviderRegistry();
  registry.register(createMockProvider(responses));
  registry.setDefault("mock");

  const engine = createPolicyEngine();
  for (const rule of createDefaultRules()) engine.addRule(rule);
  const hookRunner = createHookRunner(engine);

  const tools: readonly ToolDefinition[] = [
    ...getPlanToolDefinitions(),
    {
      name: "write_file",
      description: "Write file",
      parameters: {
        path: { type: "string", description: "Path", required: true },
        content: { type: "string", description: "Content", required: true },
      },
    },
    {
      name: "read_file",
      description: "Read file",
      parameters: {
        path: { type: "string", description: "Path", required: true },
      },
    },
    {
      name: "run_command",
      description: "Run command",
      parameters: {
        command: { type: "string", description: "Command", required: true },
      },
    },
  ];

  const toolResults: Array<{ name: string; result: string; blocked: boolean }> = [];
  let externalToolCalled = false;

  const orchestrator = createOrchestrator({
    hookRunner,
    providerRegistry: registry,
    tools,
    // deno-lint-ignore require-await
    toolExecutor: async (name, _input) => {
      externalToolCalled = true;
      return `Executed ${name}`;
    },
    planManager,
    onEvent: (event) => {
      if (event.type === "tool_result") {
        toolResults.push({
          name: event.name,
          result: event.result,
          blocked: event.blocked,
        });
      }
    },
  });

  const session = createSession({
    userId: "owner" as UserId,
    channelId: "test" as ChannelId,
  });

  return { orchestrator, session, toolResults, wasExternalToolCalled: () => externalToolCalled };
}

// --- Blocking Tests ---

Deno.test("Blocking: write_file is blocked in plan mode", async () => {
  const tmpDir = Deno.makeTempDirSync();
  const pm = createPlanManager({ plansDir: `${tmpDir}/plans` });

  // LLM response 1: enter plan mode, then try to write
  const responses = [
    // First call: LLM enters plan mode
    toolResponse({ name: "plan_enter", args: { goal: "Build feature" } }),
    // Second call: LLM tries to write a file (should be blocked)
    toolResponse({ name: "write_file", args: { path: "test.ts", content: "hello" } }),
    // Third call: LLM gets the blocked message and gives up
    textResponse("I see that write_file is blocked in plan mode. Let me create a plan instead."),
  ];

  const { orchestrator, session, toolResults } = createTestOrchestrator(responses, pm);

  const result = await orchestrator.processMessage({
    session,
    message: "Build a new feature",
    targetClassification: "INTERNAL",
  });

  assert(result.ok);

  // Find the write_file tool result — should be blocked
  const writeResult = toolResults.find((r) => r.name === "write_file");
  assert(writeResult !== undefined, "write_file tool call should have been attempted");
  assert(writeResult!.blocked, "write_file should be blocked");
  assertStringIncludes(writeResult!.result, "blocked in plan mode");
});

Deno.test("Blocking: read_file is allowed in plan mode", async () => {
  const tmpDir = Deno.makeTempDirSync();
  const pm = createPlanManager({ plansDir: `${tmpDir}/plans` });

  const responses = [
    // Enter plan mode then read a file
    toolResponse({ name: "plan_enter", args: { goal: "Explore codebase" } }),
    // Read a file (should be allowed)
    toolResponse({ name: "read_file", args: { path: "/tmp/test.txt" } }),
    // Final response
    textResponse("I've explored the codebase."),
  ];

  const { orchestrator, session, toolResults, wasExternalToolCalled } = createTestOrchestrator(responses, pm);

  await orchestrator.processMessage({
    session,
    message: "Explore the code",
    targetClassification: "INTERNAL",
  });

  const readResult = toolResults.find((r) => r.name === "read_file");
  assert(readResult !== undefined, "read_file should have been called");
  assertEquals(readResult!.blocked, false, "read_file should not be blocked in plan mode");
  assert(wasExternalToolCalled(), "External tool executor should have been called for read_file");
});

Deno.test("Blocking: tools unblocked after plan_exit", async () => {
  const tmpDir = Deno.makeTempDirSync();
  const pm = createPlanManager({ plansDir: `${tmpDir}/plans` });

  const planJson = JSON.stringify({
    summary: "Build feature",
    approach: "Direct",
    steps: [{ id: 1, description: "Create file", files: ["x.ts"], depends_on: [], verification: "test" }],
    risks: [],
    files_to_create: ["x.ts"],
    files_to_modify: [],
    tests_to_write: [],
    estimated_complexity: "small",
  });

  const responses = [
    // Enter plan mode
    toolResponse({ name: "plan_enter", args: { goal: "Build" } }),
    // Exit plan mode with plan
    toolResponse({ name: "plan_exit", args: { plan: JSON.parse(planJson) } }),
    // Now in awaiting_approval — write should be allowed
    toolResponse({ name: "write_file", args: { path: "test.ts", content: "hello" } }),
    // Done
    textResponse("File written."),
  ];

  const { orchestrator, session, toolResults } = createTestOrchestrator(responses, pm);

  await orchestrator.processMessage({
    session,
    message: "Build something",
    targetClassification: "INTERNAL",
  });

  // write_file should NOT be blocked after plan_exit (mode = awaiting_approval, not plan)
  const writeResult = toolResults.find((r) => r.name === "write_file");
  assert(writeResult !== undefined, "write_file should have been attempted");
  assertEquals(writeResult!.blocked, false, "write_file should not be blocked after plan_exit");
});

Deno.test("Blocking: plan_enter itself is never blocked", async () => {
  const tmpDir = Deno.makeTempDirSync();
  const pm = createPlanManager({ plansDir: `${tmpDir}/plans` });

  const responses = [
    toolResponse({ name: "plan_enter", args: { goal: "Build" } }),
    textResponse("In plan mode now."),
  ];

  const { orchestrator, session, toolResults } = createTestOrchestrator(responses, pm);

  await orchestrator.processMessage({
    session,
    message: "Plan something",
    targetClassification: "INTERNAL",
  });

  const enterResult = toolResults.find((r) => r.name === "plan_enter");
  assert(enterResult !== undefined);
  assertEquals(enterResult!.blocked, false);
  assertStringIncludes(enterResult!.result, "entered");
});

Deno.test("Blocking: cron_create blocked in plan mode", async () => {
  const tmpDir = Deno.makeTempDirSync();
  const pm = createPlanManager({ plansDir: `${tmpDir}/plans` });

  // Pre-enter plan mode
  pm.enter(session_id(), "Test");

  const responses: readonly MockResponse[] = [
    toolResponse({ name: "cron_create", args: { expression: "0 * * * *", task: "test" } }),
    textResponse("Blocked, I see."),
  ];

  const sess = createSession({
    userId: "owner" as UserId,
    channelId: "test" as ChannelId,
  });

  // We need to pre-enter plan mode for this session
  pm.enter(sess.id as string, "Test");

  const registry = createProviderRegistry();
  let callIdx = 0;
  registry.register({
    name: "mock",
    supportsStreaming: false,
    // deno-lint-ignore require-await
    async complete() {
      const r = responses[callIdx] ?? { content: "done", toolCalls: [] };
      callIdx++;
      return { content: r.content, toolCalls: r.toolCalls ?? [], usage: { inputTokens: 10, outputTokens: 5 } };
    },
  });
  registry.setDefault("mock");

  const engine = createPolicyEngine();
  for (const rule of createDefaultRules()) engine.addRule(rule);

  const toolResults: Array<{ name: string; blocked: boolean }> = [];
  const orchestrator = createOrchestrator({
    hookRunner: createHookRunner(engine),
    providerRegistry: registry,
    tools: [
      ...getPlanToolDefinitions(),
      {
        name: "cron_create",
        description: "Create cron",
        parameters: {
          expression: { type: "string", description: "Expr", required: true },
          task: { type: "string", description: "Task", required: true },
        },
      },
    ],
    // deno-lint-ignore require-await
    toolExecutor: async () => "executed",
    planManager: pm,
    onEvent: (e) => {
      if (e.type === "tool_result") toolResults.push({ name: e.name, blocked: e.blocked });
    },
  });

  await orchestrator.processMessage({
    session: sess,
    message: "Create a cron job",
    targetClassification: "INTERNAL",
  });

  const cronResult = toolResults.find((r) => r.name === "cron_create");
  assert(cronResult !== undefined);
  assert(cronResult!.blocked, "cron_create should be blocked in plan mode");
});

// Helper to avoid unused variable lint
function session_id(): string {
  return "unused";
}
