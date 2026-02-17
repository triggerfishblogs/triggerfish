/**
 * End-to-end tool security tests.
 * Tests the full pipeline: tool call → hook evaluation → BLOCK/ALLOW.
 * Covers spec §10.1 (tool floors), §10.6 (owner vs non-owner).
 */
import { assertEquals } from "@std/assert";
import { createPolicyEngine } from "../../src/core/policy/engine.ts";
import { createHookRunner, createDefaultRules } from "../../src/core/policy/hooks.ts";
import { createSession, updateTaint } from "../../src/core/types/session.ts";
import type { UserId, ChannelId } from "../../src/core/types/session.ts";
import type { ClassificationLevel } from "../../src/core/types/classification.ts";

function makeSession(taint: ClassificationLevel = "PUBLIC") {
  let s = createSession({ userId: "u" as UserId, channelId: "c" as ChannelId });
  if (taint !== "PUBLIC") s = updateTaint(s, taint, "test setup");
  return s;
}

function makeHookRunner() {
  const engine = createPolicyEngine();
  for (const rule of createDefaultRules()) {
    engine.addRule(rule);
  }
  return createHookRunner(engine);
}

// --- Tool floor enforcement via hooks (spec §10.1) ---

Deno.test("e2e: tool floor blocks INTERNAL session from run_command", async () => {
  const runner = makeHookRunner();
  const session = makeSession("INTERNAL");

  const result = await runner.run("PRE_TOOL_CALL", {
    session,
    input: {
      tool_call: { name: "run_command", args: { command: "echo test" } },
      tool_floor: "CONFIDENTIAL" as ClassificationLevel,
    },
  });

  assertEquals(result.allowed, false);
  assertEquals(result.action, "BLOCK");
  assertEquals(result.ruleId, "tool-floor-enforcement");
});

Deno.test("e2e: tool floor allows CONFIDENTIAL session for run_command", async () => {
  const runner = makeHookRunner();
  const session = makeSession("CONFIDENTIAL");

  const result = await runner.run("PRE_TOOL_CALL", {
    session,
    input: {
      tool_call: { name: "run_command", args: { command: "echo test" } },
      tool_floor: "CONFIDENTIAL" as ClassificationLevel,
    },
  });

  assertEquals(result.allowed, true);
});

Deno.test("e2e: tool floor allows PUBLIC session to use browser_navigate (no floor)", async () => {
  const runner = makeHookRunner();
  const session = makeSession("PUBLIC");

  const result = await runner.run("PRE_TOOL_CALL", {
    session,
    input: {
      tool_call: { name: "browser_navigate", args: { url: "https://example.com" } },
      // No tool_floor set — browser_navigate no longer has a hardcoded floor
    },
  });

  assertEquals(result.allowed, true);
});

Deno.test("e2e: tool floor blocks PUBLIC session from browser_click (INTERNAL floor)", async () => {
  const runner = makeHookRunner();
  const session = makeSession("PUBLIC");

  const result = await runner.run("PRE_TOOL_CALL", {
    session,
    input: {
      tool_call: { name: "browser_click", args: { selector: "#submit" } },
      tool_floor: "INTERNAL" as ClassificationLevel,
    },
  });

  assertEquals(result.allowed, false);
  assertEquals(result.ruleId, "tool-floor-enforcement");
});

// --- Path write-down enforcement via hooks ---

Deno.test("e2e: path write-down blocks CONFIDENTIAL session writing to INTERNAL path", async () => {
  const runner = makeHookRunner();
  const session = makeSession("CONFIDENTIAL");

  const result = await runner.run("PRE_TOOL_CALL", {
    session,
    input: {
      tool_call: { name: "write_file", args: { path: "/tmp/workspace/internal/file.txt" } },
      resource_classification: "INTERNAL" as ClassificationLevel,
      operation_type: "write",
      is_owner: true,
    },
  });

  assertEquals(result.allowed, false);
  assertEquals(result.action, "BLOCK");
  assertEquals(result.ruleId, "resource-write-down");
});

Deno.test("e2e: path write allows CONFIDENTIAL session writing to CONFIDENTIAL path", async () => {
  const runner = makeHookRunner();
  const session = makeSession("CONFIDENTIAL");

  const result = await runner.run("PRE_TOOL_CALL", {
    session,
    input: {
      tool_call: { name: "write_file", args: { path: "/tmp/workspace/confidential/file.txt" } },
      resource_classification: "CONFIDENTIAL" as ClassificationLevel,
      operation_type: "write",
      is_owner: true,
    },
  });

  assertEquals(result.allowed, true);
});

Deno.test("e2e: path write allows INTERNAL session writing to CONFIDENTIAL path (write-up)", async () => {
  const runner = makeHookRunner();
  const session = makeSession("INTERNAL");

  const result = await runner.run("PRE_TOOL_CALL", {
    session,
    input: {
      tool_call: { name: "write_file", args: { path: "/tmp/workspace/confidential/file.txt" } },
      resource_classification: "CONFIDENTIAL" as ClassificationLevel,
      operation_type: "write",
      is_owner: true,
    },
  });

  assertEquals(result.allowed, true);
});

// --- Non-owner read ceiling enforcement via hooks (spec §10.6) ---

Deno.test("e2e: non-owner ceiling blocks read of CONFIDENTIAL file with INTERNAL ceiling", async () => {
  const runner = makeHookRunner();
  const session = makeSession("INTERNAL");

  const result = await runner.run("PRE_TOOL_CALL", {
    session,
    input: {
      tool_call: { name: "read_file", args: { path: "/tmp/finance/q4.xlsx" } },
      resource_classification: "CONFIDENTIAL" as ClassificationLevel,
      operation_type: "read",
      is_owner: false,
      non_owner_ceiling: "INTERNAL" as ClassificationLevel,
    },
  });

  assertEquals(result.allowed, false);
  assertEquals(result.action, "BLOCK");
  assertEquals(result.ruleId, "resource-read-ceiling");
});

Deno.test("e2e: non-owner ceiling allows read of CONFIDENTIAL file with CONFIDENTIAL ceiling", async () => {
  const runner = makeHookRunner();
  const session = makeSession("CONFIDENTIAL");

  const result = await runner.run("PRE_TOOL_CALL", {
    session,
    input: {
      tool_call: { name: "read_file", args: { path: "/tmp/finance/q4.xlsx" } },
      resource_classification: "CONFIDENTIAL" as ClassificationLevel,
      operation_type: "read",
      is_owner: false,
      non_owner_ceiling: "CONFIDENTIAL" as ClassificationLevel,
    },
  });

  assertEquals(result.allowed, true);
});

Deno.test("e2e: owner read is not blocked by ceiling (owner auto-escalation)", async () => {
  const runner = makeHookRunner();
  const session = makeSession("INTERNAL");

  const result = await runner.run("PRE_TOOL_CALL", {
    session,
    input: {
      tool_call: { name: "read_file", args: { path: "/tmp/finance/q4.xlsx" } },
      resource_classification: "CONFIDENTIAL" as ClassificationLevel,
      operation_type: "read",
      is_owner: true,
    },
  });

  // Owner is not blocked — auto-escalation happens at orchestrator level, not in hook
  assertEquals(result.allowed, true);
});

// --- Combined: tool floor + path classification ---

Deno.test("e2e: tool without floor and no path classification passes through", async () => {
  const runner = makeHookRunner();
  const session = makeSession("INTERNAL");

  const result = await runner.run("PRE_TOOL_CALL", {
    session,
    input: {
      tool_call: { name: "todo_read", args: {} },
      is_owner: true,
    },
  });

  assertEquals(result.allowed, true);
});

Deno.test("e2e: write-down prevention is universal — blocks owner too", async () => {
  const runner = makeHookRunner();
  const session = makeSession("RESTRICTED");

  const result = await runner.run("PRE_TOOL_CALL", {
    session,
    input: {
      tool_call: { name: "write_file", args: { path: "/tmp/workspace/internal/report.txt" } },
      resource_classification: "INTERNAL" as ClassificationLevel,
      operation_type: "write",
      is_owner: true,
    },
  });

  assertEquals(result.allowed, false);
  assertEquals(result.ruleId, "resource-write-down");
});
