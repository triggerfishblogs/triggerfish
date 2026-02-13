/**
 * Phase 21: Multi-Agent, Failover & Onboarding
 * Tests MUST FAIL until routing, failover, and dive setup are implemented.
 */
import { assertEquals, assertExists, assert } from "@std/assert";
import { createAgentRouter } from "../../src/routing/router.ts";
import { createFailoverChain } from "../../src/models/failover.ts";
import { createPatrolCheck } from "../../src/dive/patrol.ts";
import type { LlmProvider } from "../../src/agent/llm.ts";

// --- Agent routing ---

Deno.test("AgentRouter: routes channel to configured agent", () => {
  const router = createAgentRouter({
    routes: [
      { channel: "whatsapp", agentId: "personal" },
      { channel: "slack", agentId: "work" },
    ],
    defaultAgent: "personal",
  });
  assertEquals(router.route("whatsapp"), "personal");
  assertEquals(router.route("slack"), "work");
});

Deno.test("AgentRouter: unmatched channel uses default agent", () => {
  const router = createAgentRouter({
    routes: [],
    defaultAgent: "fallback",
  });
  assertEquals(router.route("unknown-channel"), "fallback");
});

// --- Model failover ---

function mockProvider(name: string, shouldFail: boolean): LlmProvider {
  return {
    name,
    supportsStreaming: false,
    async complete() {
      if (shouldFail) throw new Error("rate_limited");
      return { content: `response from ${name}`, toolCalls: [], usage: { inputTokens: 1, outputTokens: 1 } };
    },
  };
}

Deno.test("FailoverChain: uses primary when available", async () => {
  const chain = createFailoverChain([
    mockProvider("primary", false),
    mockProvider("backup", false),
  ]);
  const result = await chain.complete([{ role: "user", content: "hi" }], [], {});
  assertEquals(result.content, "response from primary");
});

Deno.test("FailoverChain: falls back on primary failure", async () => {
  const chain = createFailoverChain([
    mockProvider("primary", true),
    mockProvider("backup", false),
  ]);
  const result = await chain.complete([{ role: "user", content: "hi" }], [], {});
  assertEquals(result.content, "response from backup");
});

Deno.test("FailoverChain: fails when all providers fail", async () => {
  const chain = createFailoverChain([
    mockProvider("a", true),
    mockProvider("b", true),
  ]);
  try {
    await chain.complete([{ role: "user", content: "hi" }], [], {});
    assert(false, "Should have thrown");
  } catch (e) {
    assertExists(e);
  }
});

// --- Patrol health check ---

Deno.test("Patrol: returns health status object", async () => {
  const patrol = createPatrolCheck({
    gatewayRunning: true,
    llmConnected: true,
    channelsActive: 0,
    policyRulesLoaded: 3,
    skillsInstalled: 0,
  });
  const report = await patrol.run();
  assertExists(report.overall);
  assert(["HEALTHY", "WARNING", "CRITICAL"].includes(report.overall));
  assertExists(report.checks);
  assert(report.checks.length > 0);
});

Deno.test("Patrol: reports CRITICAL when LLM not connected", async () => {
  const patrol = createPatrolCheck({
    gatewayRunning: true,
    llmConnected: false,
    channelsActive: 0,
    policyRulesLoaded: 0,
    skillsInstalled: 0,
  });
  const report = await patrol.run();
  assertEquals(report.overall, "CRITICAL");
});
