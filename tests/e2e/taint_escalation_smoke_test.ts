/**
 * Smoke test: observable taint escalation through the full orchestrator.
 *
 * Run with: deno task test tests/e2e/taint_escalation_smoke_test.ts
 *
 * This test exercises the REAL pipeline (orchestrator → hooks → escalation)
 * with mock LLM + mock classifiers, and prints taint state at each step
 * so you can visually confirm the escalation sequence.
 */
import { assertEquals } from "@std/assert";
import { createOrchestrator } from "../../src/agent/orchestrator.ts";
import { createPolicyEngine } from "../../src/core/policy/engine.ts";
import { createHookRunner, createDefaultRules } from "../../src/core/policy/hooks.ts";
import { createSession } from "../../src/core/types/session.ts";
import type { UserId, ChannelId } from "../../src/core/types/session.ts";
import type { ClassificationLevel } from "../../src/core/types/classification.ts";
import type { LlmProvider } from "../../src/agent/llm.ts";
import { createProviderRegistry } from "../../src/agent/llm.ts";
import type { PathClassifier } from "../../src/core/security/path_classification.ts";
import type { DomainClassifier } from "../../src/tools/web/domains.ts";

// ── Helpers ──

function makeHookRunner() {
  const engine = createPolicyEngine();
  for (const rule of createDefaultRules()) engine.addRule(rule);
  return createHookRunner(engine);
}

function mockPathClassifier(): PathClassifier {
  return {
    classify(path: string) {
      if (path.includes("confidential")) return { classification: "CONFIDENTIAL" as ClassificationLevel, source: "configured" as const };
      if (path.includes("restricted")) return { classification: "RESTRICTED" as ClassificationLevel, source: "configured" as const };
      return { classification: "INTERNAL" as ClassificationLevel, source: "default" as const };
    },
  };
}

function mockDomainClassifier(): DomainClassifier {
  return {
    classify(url: string) {
      if (url.includes("intranet.corp")) return { classification: "CONFIDENTIAL" as ClassificationLevel, source: "domain-policy" };
      if (url.includes("gmail.com")) return { classification: "CONFIDENTIAL" as ClassificationLevel, source: "domain-policy" };
      if (url.includes("public-forum.com")) return { classification: "PUBLIC" as ClassificationLevel, source: "domain-policy" };
      return { classification: "INTERNAL" as ClassificationLevel, source: "domain-policy" };
    },
  };
}

// ── Scenario: full taint lifecycle ──

Deno.test("SMOKE: full taint lifecycle — read → escalate → write-down blocked → URL → further escalation", async () => {
  const log: string[] = [];

  let sessionTaint: ClassificationLevel = "PUBLIC";
  const order: Record<string, number> = { PUBLIC: 0, INTERNAL: 1, CONFIDENTIAL: 2, RESTRICTED: 3 };

  // LLM issues 4 tool calls across 4 iterations
  const toolSequence = [
    { name: "read_file", args: { path: "/workspace/internal/report.txt" } },
    { name: "web_fetch", args: { url: "https://intranet.corp/secret-doc" } },
    { name: "write_file", args: { path: "/workspace/internal/notes.txt", content: "data" } },  // should be BLOCKED
    { name: "read_file", args: { path: "/workspace/restricted/keys.txt" } },
  ];
  let toolIdx = 0;

  const provider: LlmProvider = {
    name: "scenario",
    supportsStreaming: false,
    // deno-lint-ignore require-await
    async complete(_messages, _tools, _options) {
      if (toolIdx < toolSequence.length) {
        const tool = toolSequence[toolIdx++];
        return {
          content: "",
          toolCalls: [{ type: "function", function: { name: tool.name, arguments: JSON.stringify(tool.args) } }],
          usage: { inputTokens: 10, outputTokens: 5 },
        };
      }
      return { content: "All done.", toolCalls: [], usage: { inputTokens: 5, outputTokens: 5 } };
    },
  };

  const registry = createProviderRegistry();
  registry.register(provider);
  registry.setDefault("scenario");

  const toolDefs = [
    { name: "read_file", description: "Read", parameters: { path: { type: "string", description: "p", required: true } } },
    { name: "write_file", description: "Write", parameters: { path: { type: "string", description: "p", required: true }, content: { type: "string", description: "c", required: true } } },
    { name: "web_fetch", description: "Fetch", parameters: { url: { type: "string", description: "u", required: true } } },
  ];

  const orchestrator = createOrchestrator({
    hookRunner: makeHookRunner(),
    providerRegistry: registry,
    tools: toolDefs,
    // deno-lint-ignore require-await
    toolExecutor: async (name, _input) => `${name} result`,
    pathClassifier: mockPathClassifier(),
    domainClassifier: mockDomainClassifier(),
    getSessionTaint: () => sessionTaint,
    escalateTaint: (level: ClassificationLevel, reason: string) => {
      const prev = sessionTaint;
      if (order[level] > order[sessionTaint]) {
        sessionTaint = level;
      }
      log.push(`ESCALATE: ${prev} → ${sessionTaint} (${reason})`);
    },
    isOwnerSession: () => true,
    onEvent: (event) => {
      if (event.type === "tool_call") {
        log.push(`TOOL_CALL: ${event.name} [taint=${sessionTaint}]`);
      }
      if (event.type === "tool_result") {
        log.push(`TOOL_RESULT: ${event.name} blocked=${event.blocked} [taint=${sessionTaint}]`);
      }
    },
  });

  const session = createSession({ userId: "u" as UserId, channelId: "c" as ChannelId });
  const result = await orchestrator.processMessage({
    session,
    message: "Do all the things",
    targetClassification: "RESTRICTED",
  });

  // Print the full event log
  console.log("\n── Taint Escalation Log ──");
  for (const entry of log) {
    console.log(`  ${entry}`);
  }
  console.log(`  FINAL TAINT: ${sessionTaint}`);
  console.log("──────────────────────────\n");

  assertEquals(result.ok, true);

  // Verify the sequence:
  // 1. read_file internal/report.txt → taint PUBLIC→INTERNAL
  // 2. web_fetch intranet.corp → taint INTERNAL→CONFIDENTIAL
  // 3. write_file internal/notes.txt → BLOCKED (write-down: CONFIDENTIAL → INTERNAL)
  // 4. read_file restricted/keys.txt → taint CONFIDENTIAL→RESTRICTED
  assertEquals(sessionTaint, "RESTRICTED", "Final taint should be RESTRICTED");

  // Check that write_file was blocked
  const writeResult = log.find(l => l.includes("TOOL_RESULT: write_file"));
  assertEquals(writeResult?.includes("blocked=true"), true, "write_file should have been blocked");
});

Deno.test("SMOKE: browser_navigate with no floor — PUBLIC session allowed directly", async () => {
  const log: string[] = [];

  let sessionTaint: ClassificationLevel = "PUBLIC";
  const order: Record<string, number> = { PUBLIC: 0, INTERNAL: 1, CONFIDENTIAL: 2, RESTRICTED: 3 };

  // LLM calls browser_navigate from a PUBLIC session.
  // browser_navigate has no floor — it should be allowed immediately without
  // any taint escalation requirement.
  const toolSequence = [
    { name: "browser_navigate", args: { url: "https://ibm.com" } },
  ];
  let toolIdx = 0;

  const provider: LlmProvider = {
    name: "scenario",
    supportsStreaming: false,
    // deno-lint-ignore require-await
    async complete(_messages, _tools, _options) {
      if (toolIdx < toolSequence.length) {
        const tool = toolSequence[toolIdx++];
        return {
          content: "",
          toolCalls: [{ type: "function", function: { name: tool.name, arguments: JSON.stringify(tool.args) } }],
          usage: { inputTokens: 10, outputTokens: 5 },
        };
      }
      return { content: "Done.", toolCalls: [], usage: { inputTokens: 5, outputTokens: 5 } };
    },
  };

  const registry = createProviderRegistry();
  registry.register(provider);
  registry.setDefault("scenario");

  const toolDefs = [
    { name: "browser_navigate", description: "Navigate", parameters: { url: { type: "string", description: "u", required: true } } },
  ];

  // No hardcoded floor for browser_navigate — it has no floor in HARDCODED_TOOL_FLOORS
  const toolFloorRegistry = {
    getFloor(_toolName: string): ClassificationLevel | null {
      return null;
    },
    canInvoke(_toolName: string, _sessionTaint: ClassificationLevel): boolean {
      return true;
    },
  };

  const orchestrator = createOrchestrator({
    hookRunner: makeHookRunner(),
    providerRegistry: registry,
    tools: toolDefs,
    // deno-lint-ignore require-await
    toolExecutor: async (name, _input) => `${name} result`,
    domainClassifier: mockDomainClassifier(),
    toolFloorRegistry,
    getSessionTaint: () => sessionTaint,
    escalateTaint: (level: ClassificationLevel, reason: string) => {
      const prev = sessionTaint;
      if (order[level] > order[sessionTaint]) {
        sessionTaint = level;
      }
      log.push(`ESCALATE: ${prev} → ${sessionTaint} (${reason})`);
    },
    isOwnerSession: () => true,
    onEvent: (event) => {
      if (event.type === "tool_call") {
        log.push(`TOOL_CALL: ${event.name} [taint=${sessionTaint}]`);
      }
      if (event.type === "tool_result") {
        log.push(`TOOL_RESULT: ${event.name} blocked=${event.blocked} [taint=${sessionTaint}]`);
      }
    },
  });

  const session = createSession({ userId: "u" as UserId, channelId: "c" as ChannelId });
  const result = await orchestrator.processMessage({
    session,
    message: "Open ibm.com",
    targetClassification: "PUBLIC",
  });

  console.log("\n── Browser Navigate (no floor) Log ──");
  for (const entry of log) {
    console.log(`  ${entry}`);
  }
  console.log(`  FINAL TAINT: ${sessionTaint}`);
  console.log("────────────────────────────────────────\n");

  assertEquals(result.ok, true);

  // browser_navigate should NOT be blocked — no floor means PUBLIC sessions are allowed
  const navResult = log.find(l => l.includes("TOOL_RESULT: browser_navigate"));
  assertEquals(navResult?.includes("blocked=false"), true, "browser_navigate should NOT be blocked for PUBLIC session");
});
