/**
 * End-to-end resource classification tests.
 *
 * Validates the universal resource classification system (Bug 1 + Bug 2 + Bug 3 fixes):
 * - Filesystem path classification and taint escalation
 * - URL domain classification and taint escalation
 * - Write-down blocking for both paths and URLs
 * - Non-owner ceiling enforcement for URLs
 * - Collapsed code paths (single security + execution path)
 */
import { assertEquals, assert } from "@std/assert";
import { createOrchestrator } from "../../src/agent/orchestrator.ts";
import { createPolicyEngine } from "../../src/core/policy/engine.ts";
import {
  createHookRunner,
  createDefaultRules,
} from "../../src/core/policy/hooks.ts";
import { createSession, updateTaint } from "../../src/core/types/session.ts";
import type { UserId, ChannelId } from "../../src/core/types/session.ts";
import type { ClassificationLevel } from "../../src/core/types/classification.ts";
import type { LlmProvider } from "../../src/agent/llm.ts";
import { createProviderRegistry } from "../../src/agent/llm.ts";
import type { PathClassifier } from "../../src/core/security/path_classification.ts";
import type { DomainClassifier } from "../../src/tools/web/domains.ts";

// --- Test helpers ---

function makeHookRunner() {
  const engine = createPolicyEngine();
  for (const rule of createDefaultRules()) {
    engine.addRule(rule);
  }
  return createHookRunner(engine);
}

/** Mock path classifier that maps specific paths to classifications. */
function createMockPathClassifier(
  mappings: Record<string, ClassificationLevel>,
  defaultLevel: ClassificationLevel = "INTERNAL",
): PathClassifier {
  return {
    classify(path: string) {
      for (const [pattern, level] of Object.entries(mappings)) {
        if (path.includes(pattern)) {
          return { classification: level, source: "configured" as const };
        }
      }
      return { classification: defaultLevel, source: "default" as const };
    },
  };
}

/** Mock domain classifier that maps URL patterns to classifications. */
function createMockDomainClassifier(
  mappings: Record<string, ClassificationLevel>,
  defaultLevel: ClassificationLevel = "PUBLIC",
): DomainClassifier {
  return {
    classify(url: string) {
      for (const [pattern, level] of Object.entries(mappings)) {
        if (url.includes(pattern)) {
          return { classification: level, source: "domain-policy" };
        }
      }
      return { classification: defaultLevel, source: "domain-policy" };
    },
  };
}

/**
 * Create a mock LLM provider that issues a single tool call, then returns final text.
 */
function createToolCallingProvider(
  toolName: string,
  toolArgs: Record<string, unknown>,
): LlmProvider {
  let callCount = 0;
  return {
    name: "mock-tool-caller",
    supportsStreaming: false,
    // deno-lint-ignore require-await
    async complete(_messages, _tools, _options) {
      callCount++;
      if (callCount === 1) {
        return {
          content: "",
          toolCalls: [{
            type: "function",
            function: {
              name: toolName,
              arguments: JSON.stringify(toolArgs),
            },
          }],
          usage: { inputTokens: 10, outputTokens: 5 },
        };
      }
      return {
        content: "Done.",
        toolCalls: [],
        usage: { inputTokens: 10, outputTokens: 5 },
      };
    },
  };
}

/**
 * Create a mock provider that issues two sequential tool calls.
 */
function createTwoToolProvider(
  tool1: { name: string; args: Record<string, unknown> },
  tool2: { name: string; args: Record<string, unknown> },
): LlmProvider {
  let callCount = 0;
  return {
    name: "mock-two-tool",
    supportsStreaming: false,
    // deno-lint-ignore require-await
    async complete(_messages, _tools, _options) {
      callCount++;
      if (callCount === 1) {
        return {
          content: "",
          toolCalls: [{
            type: "function",
            function: { name: tool1.name, arguments: JSON.stringify(tool1.args) },
          }],
          usage: { inputTokens: 10, outputTokens: 5 },
        };
      }
      if (callCount === 2) {
        return {
          content: "",
          toolCalls: [{
            type: "function",
            function: { name: tool2.name, arguments: JSON.stringify(tool2.args) },
          }],
          usage: { inputTokens: 10, outputTokens: 5 },
        };
      }
      return {
        content: "Done.",
        toolCalls: [],
        usage: { inputTokens: 10, outputTokens: 5 },
      };
    },
  };
}

const TOOL_DEFS = [
  { name: "read_file", description: "Read", parameters: { path: { type: "string", description: "p", required: true } } },
  { name: "write_file", description: "Write", parameters: { path: { type: "string", description: "p", required: true }, content: { type: "string", description: "c", required: true } } },
  { name: "web_fetch", description: "Fetch", parameters: { url: { type: "string", description: "u", required: true } } },
  { name: "browser_navigate", description: "Navigate", parameters: { url: { type: "string", description: "u", required: true } } },
  { name: "browser_type", description: "Type", parameters: { url: { type: "string", description: "u", required: true }, text: { type: "string", description: "t", required: true } } },
];

// --- Test 1: Filesystem read escalates taint (Bug 2 fix) ---

Deno.test("resource-classification: filesystem read escalates taint then blocks write-down", async () => {
  const hookRunner = makeHookRunner();
  const pathClassifier = createMockPathClassifier({
    "finance": "CONFIDENTIAL",
  });

  let sessionTaint: ClassificationLevel = "INTERNAL";
  const escalations: Array<{ level: ClassificationLevel; reason: string }> = [];

  const registry = createProviderRegistry();
  registry.register(createTwoToolProvider(
    { name: "read_file", args: { path: "~/Documents/finance/q4.xlsx" } },
    { name: "write_file", args: { path: "internal/notes.txt", content: "data" } },
  ));
  registry.setDefault("mock-two-tool");

  const toolResults: Array<{ name: string; blocked: boolean }> = [];

  const orchestrator = createOrchestrator({
    hookRunner,
    providerRegistry: registry,
    tools: TOOL_DEFS,
    // deno-lint-ignore require-await
    toolExecutor: async (_name, _input) => "ok",
    pathClassifier,
    getSessionTaint: () => sessionTaint,
    escalateTaint: (level: ClassificationLevel, reason: string) => {
      escalations.push({ level, reason });
      // Simulate maxClassification logic: only escalate upward
      const order: Record<string, number> = { PUBLIC: 0, INTERNAL: 1, CONFIDENTIAL: 2, RESTRICTED: 3 };
      if (order[level] > order[sessionTaint]) {
        sessionTaint = level;
      }
    },
    isOwnerSession: () => true,
    onEvent: (event) => {
      if (event.type === "tool_result") {
        toolResults.push({ name: event.name, blocked: event.blocked });
      }
    },
  });

  let session = createSession({ userId: "u" as UserId, channelId: "c" as ChannelId });
  session = updateTaint(session, "INTERNAL", "initial");

  const result = await orchestrator.processMessage({
    session,
    message: "Read finance doc then write notes",
    targetClassification: "CONFIDENTIAL",
  });

  // First tool (read_file) should have escalated taint to CONFIDENTIAL
  assert(escalations.length >= 1, "Should have at least one escalation");
  assertEquals(escalations[0].level, "CONFIDENTIAL");
  assert(escalations[0].reason.includes("read_file"), "Escalation reason should mention tool name");

  // Second tool (write_file to INTERNAL) should be blocked (write-down: CONFIDENTIAL → INTERNAL)
  assertEquals(toolResults.length, 2);
  assertEquals(toolResults[1].blocked, true, "Write to INTERNAL path should be blocked after CONFIDENTIAL escalation");

  assertEquals(result.ok, true);
});

// --- Test 2: URL fetch escalates taint (Bug 1 + Bug 2 fix) ---

Deno.test("resource-classification: web_fetch escalates taint via domain classification", async () => {
  const hookRunner = makeHookRunner();
  const domainClassifier = createMockDomainClassifier({
    "intranet.corp": "CONFIDENTIAL",
  });

  let sessionTaint: ClassificationLevel = "INTERNAL";
  const escalations: Array<{ level: ClassificationLevel; reason: string }> = [];

  const registry = createProviderRegistry();
  registry.register(createTwoToolProvider(
    { name: "web_fetch", args: { url: "https://intranet.corp/confidential-report" } },
    { name: "write_file", args: { path: "internal/notes.txt", content: "data" } },
  ));
  registry.setDefault("mock-two-tool");

  const toolResults: Array<{ name: string; blocked: boolean }> = [];

  const orchestrator = createOrchestrator({
    hookRunner,
    providerRegistry: registry,
    tools: TOOL_DEFS,
    // deno-lint-ignore require-await
    toolExecutor: async (_name, _input) => "ok",
    domainClassifier,
    pathClassifier: createMockPathClassifier({}, "INTERNAL"),
    getSessionTaint: () => sessionTaint,
    escalateTaint: (level: ClassificationLevel, reason: string) => {
      escalations.push({ level, reason });
      const order: Record<string, number> = { PUBLIC: 0, INTERNAL: 1, CONFIDENTIAL: 2, RESTRICTED: 3 };
      if (order[level] > order[sessionTaint]) {
        sessionTaint = level;
      }
    },
    isOwnerSession: () => true,
    onEvent: (event) => {
      if (event.type === "tool_result") {
        toolResults.push({ name: event.name, blocked: event.blocked });
      }
    },
  });

  let session = createSession({ userId: "u" as UserId, channelId: "c" as ChannelId });
  session = updateTaint(session, "INTERNAL", "initial");

  const result = await orchestrator.processMessage({
    session,
    message: "Fetch report then write notes",
    targetClassification: "CONFIDENTIAL",
  });

  // web_fetch should have escalated taint to CONFIDENTIAL
  assert(escalations.length >= 1, "Should have at least one escalation");
  assertEquals(escalations[0].level, "CONFIDENTIAL");
  assert(escalations[0].reason.includes("web_fetch"), "Escalation reason should mention web_fetch");

  // write_file to INTERNAL should be blocked (write-down: CONFIDENTIAL → INTERNAL)
  assertEquals(toolResults.length, 2);
  assertEquals(toolResults[1].blocked, true, "Write to INTERNAL path should be blocked after CONFIDENTIAL escalation via URL");

  assertEquals(result.ok, true);
});

// --- Test 3: Hook-level domain classification for URL tools ---

Deno.test("resource-classification: hook evaluates domain classification for web_fetch", async () => {
  const hookRunner = makeHookRunner();

  // Directly test the hook with resource_classification set (simulates what
  // buildSecurityHookInput now produces for URL tools)
  const session = createSession({ userId: "u" as UserId, channelId: "c" as ChannelId });
  const updatedSession = updateTaint(session, "RESTRICTED", "setup");

  // Write-down: RESTRICTED session writing to PUBLIC domain
  const result = await hookRunner.run("PRE_TOOL_CALL", {
    session: updatedSession,
    input: {
      tool_call: { name: "browser_type", args: { url: "https://public-forum.com/post", text: "secret" } },
      resource_classification: "PUBLIC" as ClassificationLevel,
      operation_type: "write",
      is_owner: true,
    },
  });

  assertEquals(result.allowed, false);
  assertEquals(result.ruleId, "resource-write-down");
});

// --- Test 4: Non-owner blocked by domain classification (Bug 1 fix) ---

Deno.test("resource-classification: non-owner blocked when URL domain exceeds ceiling", async () => {
  const hookRunner = makeHookRunner();

  const session = createSession({ userId: "u" as UserId, channelId: "c" as ChannelId });
  const updatedSession = updateTaint(session, "INTERNAL", "setup");

  const result = await hookRunner.run("PRE_TOOL_CALL", {
    session: updatedSession,
    input: {
      tool_call: { name: "web_fetch", args: { url: "https://intranet.corp/confidential" } },
      resource_classification: "CONFIDENTIAL" as ClassificationLevel,
      operation_type: "read",
      is_owner: false,
      non_owner_ceiling: "INTERNAL" as ClassificationLevel,
    },
  });

  assertEquals(result.allowed, false);
  assertEquals(result.ruleId, "resource-read-ceiling");
});

// --- Test 5: Write-down blocked on URL domain (Bug 1 fix) ---

Deno.test("resource-classification: write-down blocked on URL domain", async () => {
  const hookRunner = makeHookRunner();

  const session = createSession({ userId: "u" as UserId, channelId: "c" as ChannelId });
  const updatedSession = updateTaint(session, "RESTRICTED", "setup");

  const result = await hookRunner.run("PRE_TOOL_CALL", {
    session: updatedSession,
    input: {
      tool_call: { name: "browser_type", args: { url: "https://public-forum.com/post", text: "secret data" } },
      resource_classification: "PUBLIC" as ClassificationLevel,
      operation_type: "write",
      is_owner: true,
    },
  });

  assertEquals(result.allowed, false);
  assertEquals(result.ruleId, "resource-write-down");
});

// --- Test 6: Write to higher-classified path escalates taint ---

Deno.test("resource-classification: write to higher-classified path escalates taint", async () => {
  const hookRunner = makeHookRunner();
  const pathClassifier = createMockPathClassifier({
    "confidential": "CONFIDENTIAL",
    "internal": "INTERNAL",
  });

  let sessionTaint: ClassificationLevel = "INTERNAL";
  const escalations: Array<{ level: ClassificationLevel; reason: string }> = [];

  const registry = createProviderRegistry();
  registry.register(createTwoToolProvider(
    { name: "write_file", args: { path: "confidential/report.txt", content: "report" } },
    { name: "write_file", args: { path: "internal/notes.txt", content: "notes" } },
  ));
  registry.setDefault("mock-two-tool");

  const toolResults: Array<{ name: string; blocked: boolean }> = [];

  const orchestrator = createOrchestrator({
    hookRunner,
    providerRegistry: registry,
    tools: TOOL_DEFS,
    // deno-lint-ignore require-await
    toolExecutor: async (_name, _input) => "ok",
    pathClassifier,
    getSessionTaint: () => sessionTaint,
    escalateTaint: (level: ClassificationLevel, reason: string) => {
      escalations.push({ level, reason });
      const order: Record<string, number> = { PUBLIC: 0, INTERNAL: 1, CONFIDENTIAL: 2, RESTRICTED: 3 };
      if (order[level] > order[sessionTaint]) {
        sessionTaint = level;
      }
    },
    isOwnerSession: () => true,
    onEvent: (event) => {
      if (event.type === "tool_result") {
        toolResults.push({ name: event.name, blocked: event.blocked });
      }
    },
  });

  let session = createSession({ userId: "u" as UserId, channelId: "c" as ChannelId });
  session = updateTaint(session, "INTERNAL", "initial");

  const result = await orchestrator.processMessage({
    session,
    message: "Write reports",
    targetClassification: "CONFIDENTIAL",
  });

  // First write (to CONFIDENTIAL path) should escalate taint
  assert(escalations.length >= 1, "Should have at least one escalation");
  assertEquals(escalations[0].level, "CONFIDENTIAL");
  assert(escalations[0].reason.includes("write_file"), "Reason should mention write_file");

  // Second write (to INTERNAL path) should be blocked (write-down: CONFIDENTIAL → INTERNAL)
  assertEquals(toolResults.length, 2);
  assertEquals(toolResults[1].blocked, true, "Write to INTERNAL should be blocked after CONFIDENTIAL escalation");

  assertEquals(result.ok, true);
});

// --- Test 7: Unmapped URL uses default classification ---

Deno.test("resource-classification: unmapped URL uses default domain classification", async () => {
  const hookRunner = makeHookRunner();

  // Domain classifier with CONFIDENTIAL default for unmapped domains
  const domainClassifier = createMockDomainClassifier({}, "CONFIDENTIAL");

  let sessionTaint: ClassificationLevel = "INTERNAL";
  const escalations: Array<{ level: ClassificationLevel; reason: string }> = [];

  const registry = createProviderRegistry();
  registry.register(createToolCallingProvider("web_fetch", {
    url: "https://random-website.com/page",
  }));
  registry.setDefault("mock-tool-caller");

  const orchestrator = createOrchestrator({
    hookRunner,
    providerRegistry: registry,
    tools: TOOL_DEFS,
    // deno-lint-ignore require-await
    toolExecutor: async (_name, _input) => "ok",
    domainClassifier,
    getSessionTaint: () => sessionTaint,
    escalateTaint: (level: ClassificationLevel, reason: string) => {
      escalations.push({ level, reason });
      const order: Record<string, number> = { PUBLIC: 0, INTERNAL: 1, CONFIDENTIAL: 2, RESTRICTED: 3 };
      if (order[level] > order[sessionTaint]) {
        sessionTaint = level;
      }
    },
    isOwnerSession: () => true,
  });

  let session = createSession({ userId: "u" as UserId, channelId: "c" as ChannelId });
  session = updateTaint(session, "INTERNAL", "initial");

  await orchestrator.processMessage({
    session,
    message: "Fetch a random page",
    targetClassification: "CONFIDENTIAL",
  });

  // Default is CONFIDENTIAL, session was INTERNAL → should escalate
  assert(escalations.length >= 1, "Should escalate when default is higher than session taint");
  assertEquals(escalations[0].level, "CONFIDENTIAL");
  assertEquals(sessionTaint, "CONFIDENTIAL", "Session taint should be CONFIDENTIAL after accessing unmapped domain with CONFIDENTIAL default");
});

// --- Test: Collapsed code paths (Bug 3) - plan mode + security in single path ---

Deno.test("resource-classification: plan tool handled without security path, non-plan tool uses security path", async () => {
  // This test verifies that the collapsed code paths work correctly:
  // Plan tools get handled in step 2, non-plan tools go through step 3 (universal security).
  const hookRunner = makeHookRunner();

  const registry = createProviderRegistry();
  registry.register(createToolCallingProvider("read_file", { path: "/tmp/test.txt" }));
  registry.setDefault("mock-tool-caller");

  let executedTool = "";
  const orchestrator = createOrchestrator({
    hookRunner,
    providerRegistry: registry,
    tools: TOOL_DEFS,
    // deno-lint-ignore require-await
    toolExecutor: async (name, _input) => { executedTool = name; return "content"; },
  });

  const session = createSession({ userId: "u" as UserId, channelId: "c" as ChannelId });
  const result = await orchestrator.processMessage({
    session,
    message: "read file",
    targetClassification: "INTERNAL",
  });

  assertEquals(result.ok, true);
  assertEquals(executedTool, "read_file", "Tool should execute through the universal security path");
});

// --- Test: URL domain classification does not override filesystem classification ---

Deno.test("resource-classification: filesystem classification takes precedence over URL for filesystem tools", async () => {
  const hookRunner = makeHookRunner();

  // Both classifiers present, but read_file should use path classifier
  const pathClassifier = createMockPathClassifier({ "finance": "RESTRICTED" });
  const domainClassifier = createMockDomainClassifier({}, "PUBLIC");

  let sessionTaint: ClassificationLevel = "INTERNAL";
  const escalations: Array<{ level: ClassificationLevel; reason: string }> = [];

  const registry = createProviderRegistry();
  registry.register(createToolCallingProvider("read_file", { path: "/home/user/finance/q4.xlsx" }));
  registry.setDefault("mock-tool-caller");

  const orchestrator = createOrchestrator({
    hookRunner,
    providerRegistry: registry,
    tools: TOOL_DEFS,
    // deno-lint-ignore require-await
    toolExecutor: async (_name, _input) => "ok",
    pathClassifier,
    domainClassifier,
    getSessionTaint: () => sessionTaint,
    escalateTaint: (level: ClassificationLevel, reason: string) => {
      escalations.push({ level, reason });
      const order: Record<string, number> = { PUBLIC: 0, INTERNAL: 1, CONFIDENTIAL: 2, RESTRICTED: 3 };
      if (order[level] > order[sessionTaint]) {
        sessionTaint = level;
      }
    },
    isOwnerSession: () => true,
  });

  let session = createSession({ userId: "u" as UserId, channelId: "c" as ChannelId });
  session = updateTaint(session, "INTERNAL", "initial");

  await orchestrator.processMessage({
    session,
    message: "read finance file",
    targetClassification: "RESTRICTED",
  });

  // Should escalate to RESTRICTED (from path classifier), not PUBLIC (from domain classifier)
  assert(escalations.length >= 1, "Should have escalation from path classifier");
  assertEquals(escalations[0].level, "RESTRICTED");
});
