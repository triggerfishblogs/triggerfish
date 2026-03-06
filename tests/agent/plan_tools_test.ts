/**
 * Plan tool executor tests.
 *
 * Tests individual plan tool calls via createPlanToolExecutor,
 * including validation of untrusted LLM input.
 */
import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import {
  createPlanManager,
  createPlanToolExecutor,
} from "../../src/agent/plan/plan.ts";
import type { PlanManager } from "../../src/agent/plan/plan.ts";

const SESSION = "test-session";

function createTestSetup(): {
  manager: PlanManager;
  exec: (
    name: string,
    input: Record<string, unknown>,
  ) => Promise<string | null>;
} {
  const tmpDir = Deno.makeTempDirSync();
  const manager = createPlanManager({ plansDir: `${tmpDir}/plans` });
  const exec = createPlanToolExecutor(manager, SESSION);
  return { manager, exec };
}

const VALID_PLAN = {
  summary: "Add auth",
  approach: "JWT tokens",
  alternatives_considered: ["OAuth"],
  steps: [
    {
      id: 1,
      description: "Create auth module",
      files: ["src/auth.ts"],
      depends_on: [],
      verification: "deno test",
    },
  ],
  risks: ["Security"],
  files_to_create: ["src/auth.ts"],
  files_to_modify: [],
  tests_to_write: ["tests/auth_test.ts"],
  estimated_complexity: "small",
};

// --- plan_manage(action: "enter") ---

Deno.test("plan_manage enter: returns status and blocked tools", async () => {
  const { exec } = createTestSetup();
  const result = await exec("plan_manage", {
    action: "enter",
    goal: "Build auth",
  });
  assert(result !== null);
  const parsed = JSON.parse(result!);
  assertEquals(parsed.status, "entered");
  assertEquals(parsed.mode, "plan");
  assert(Array.isArray(parsed.blocked_tools));
});

Deno.test("plan_manage enter: with scope", async () => {
  const { exec, manager } = createTestSetup();
  await exec("plan_manage", {
    action: "enter",
    goal: "Refactor",
    scope: "src/core/",
  });
  assertEquals(manager.getState(SESSION).scope, "src/core/");
});

Deno.test("plan_manage enter: rejects missing goal", async () => {
  const { exec } = createTestSetup();
  const result = await exec("plan_manage", { action: "enter" });
  assert(result !== null);
  assertStringIncludes(result!, "Error");
});

Deno.test("plan_manage enter: rejects when already in plan mode", async () => {
  const { exec } = createTestSetup();
  await exec("plan_manage", { action: "enter", goal: "First" });
  const result = await exec("plan_manage", { action: "enter", goal: "Second" });
  assert(result !== null);
  assertStringIncludes(result!, "Already in plan mode");
});

// --- plan_manage(action: "exit") ---

Deno.test("plan_manage exit: creates plan and returns markdown", async () => {
  const { exec } = createTestSetup();
  await exec("plan_manage", { action: "enter", goal: "Build auth" });
  const result = await exec("plan_manage", {
    action: "exit",
    plan: VALID_PLAN,
  });
  assert(result !== null);
  assertStringIncludes(result!, "plan_presented");
  assertStringIncludes(result!, "Implementation Plan");
  assertStringIncludes(result!, "Add auth");
});

Deno.test("plan_manage exit: rejects missing plan object", async () => {
  const { exec } = createTestSetup();
  await exec("plan_manage", { action: "enter", goal: "Build auth" });
  const result = await exec("plan_manage", { action: "exit" });
  assert(result !== null);
  assertStringIncludes(result!, "Error");
});

Deno.test("plan_manage exit: validates required plan fields", async () => {
  const { exec } = createTestSetup();
  await exec("plan_manage", { action: "enter", goal: "Build auth" });

  // Missing summary
  const result = await exec("plan_manage", {
    action: "exit",
    plan: { approach: "x", steps: [{ id: 1, description: "x" }] },
  });
  assert(result !== null);
  assertStringIncludes(result!, "summary");
});

Deno.test("plan_manage exit: validates steps are non-empty", async () => {
  const { exec } = createTestSetup();
  await exec("plan_manage", { action: "enter", goal: "Build auth" });
  const result = await exec("plan_manage", {
    action: "exit",
    plan: { summary: "x", approach: "y", steps: [] },
  });
  assert(result !== null);
  assertStringIncludes(result!, "steps");
});

Deno.test("plan_manage exit: rejects when not in plan mode", async () => {
  const { exec } = createTestSetup();
  const result = await exec("plan_manage", {
    action: "exit",
    plan: VALID_PLAN,
  });
  assert(result !== null);
  assertStringIncludes(result!, "Error");
  assertStringIncludes(result!, "Not in plan mode");
});

Deno.test("plan_manage exit: defaults missing optional fields", async () => {
  const { exec, manager } = createTestSetup();
  await exec("plan_manage", { action: "enter", goal: "Build" });
  await exec("plan_manage", {
    action: "exit",
    plan: {
      summary: "Minimal plan",
      approach: "Direct",
      steps: [{ id: 1, description: "Do thing" }],
    },
  });

  // Approve to inspect the stored plan
  manager.approve(SESSION);
  const state = manager.getState(SESSION);
  const plan = state.activePlan!.plan;
  assertEquals(plan.alternatives_considered.length, 0);
  assertEquals(plan.risks.length, 0);
  assertEquals(plan.files_to_create.length, 0);
  assertEquals(plan.estimated_complexity, "medium"); // default
});

// --- plan_status ---

Deno.test("plan_status: shows mode and goal", async () => {
  const { exec } = createTestSetup();
  await exec("plan_manage", { action: "enter", goal: "Build auth" });
  const result = await exec("plan_status", {});
  assert(result !== null);
  const parsed = JSON.parse(result!);
  assertEquals(parsed.mode, "plan");
  assertEquals(parsed.goal, "Build auth");
});

// --- plan_manage(action: "approve") ---

Deno.test("plan_manage approve: transitions to normal with active plan", async () => {
  const { exec, manager } = createTestSetup();
  await exec("plan_manage", { action: "enter", goal: "Build" });
  await exec("plan_manage", { action: "exit", plan: VALID_PLAN });

  const result = await exec("plan_manage", { action: "approve" });
  assert(result !== null);
  const parsed = JSON.parse(result!);
  assertEquals(parsed.status, "approved");
  assert(parsed.plan_id);

  assertEquals(manager.getState(SESSION).mode, "normal");
  assert(manager.getState(SESSION).activePlan !== undefined);
});

Deno.test("plan_manage approve: with no pending plan returns error", async () => {
  const { exec } = createTestSetup();
  const result = await exec("plan_manage", { action: "approve" });
  assert(result !== null);
  assertStringIncludes(result!, "No plan awaiting approval");
});

// --- plan_manage(action: "reject") ---

Deno.test("plan_manage reject: transitions to normal", async () => {
  const { exec, manager } = createTestSetup();
  await exec("plan_manage", { action: "enter", goal: "Build" });
  await exec("plan_manage", { action: "exit", plan: VALID_PLAN });
  const result = await exec("plan_manage", { action: "reject" });
  assert(result !== null);
  const parsed = JSON.parse(result!);
  assertEquals(parsed.status, "rejected");
  assertEquals(manager.getState(SESSION).mode, "normal");
});

// --- plan_step_complete ---

Deno.test("plan_step_complete: marks step and advances", async () => {
  const { exec } = createTestSetup();
  await exec("plan_manage", { action: "enter", goal: "Build" });
  await exec("plan_manage", { action: "exit", plan: VALID_PLAN });
  await exec("plan_manage", { action: "approve" });

  const result = await exec("plan_step_complete", {
    step_id: 1,
    verification_result: "All tests pass",
  });
  assert(result !== null);
  const parsed = JSON.parse(result!);
  assertEquals(parsed.status, "step_completed");
  assertEquals(parsed.progress.completed_steps, 1);
});

Deno.test("plan_step_complete: rejects missing args", async () => {
  const { exec } = createTestSetup();
  await exec("plan_manage", { action: "enter", goal: "Build" });
  await exec("plan_manage", { action: "exit", plan: VALID_PLAN });
  await exec("plan_manage", { action: "approve" });

  const result = await exec("plan_step_complete", {
    step_id: "not a number",
  });
  assert(result !== null);
  assertStringIncludes(result!, "Error");
});

// --- plan_manage(action: "complete") ---

Deno.test("plan_manage complete: marks plan done", async () => {
  const { exec, manager } = createTestSetup();
  await exec("plan_manage", { action: "enter", goal: "Build" });
  await exec("plan_manage", { action: "exit", plan: VALID_PLAN });
  await exec("plan_manage", { action: "approve" });

  const result = await exec("plan_manage", {
    action: "complete",
    summary: "Auth module complete",
  });
  assert(result !== null);
  const parsed = JSON.parse(result!);
  assertEquals(parsed.status, "plan_completed");

  assertEquals(manager.getState(SESSION).mode, "normal");
  assertEquals(manager.getState(SESSION).activePlan, undefined);
});

Deno.test("plan_manage complete: rejects missing summary", async () => {
  const { exec } = createTestSetup();
  const result = await exec("plan_manage", { action: "complete" });
  assert(result !== null);
  assertStringIncludes(result!, "Error");
});

// --- plan_manage(action: "modify") ---

Deno.test("plan_manage modify: updates step", async () => {
  const { exec, manager } = createTestSetup();
  await exec("plan_manage", { action: "enter", goal: "Build" });
  await exec("plan_manage", { action: "exit", plan: VALID_PLAN });
  await exec("plan_manage", { action: "approve" });

  const result = await exec("plan_manage", {
    action: "modify",
    step_id: 1,
    reason: "Better approach",
    new_description: "Create auth_v2 module",
  });
  assert(result !== null);
  const parsed = JSON.parse(result!);
  assertEquals(parsed.status, "step_modified");

  const step = manager.getState(SESSION).activePlan!.plan.steps.find(
    (s) => s.id === 1,
  );
  assertEquals(step!.description, "Create auth_v2 module");
});

Deno.test("plan_manage modify: rejects missing required args", async () => {
  const { exec } = createTestSetup();
  const result = await exec("plan_manage", {
    action: "modify",
    step_id: 1,
  });
  assert(result !== null);
  assertStringIncludes(result!, "Error");
});

// --- plan_manage: action validation ---

Deno.test("plan_manage: rejects missing action", async () => {
  const { exec } = createTestSetup();
  const result = await exec("plan_manage", {});
  assert(result !== null);
  assertStringIncludes(result!, "Error");
  assertStringIncludes(result!, "action");
});

Deno.test("plan_manage: rejects unknown action", async () => {
  const { exec } = createTestSetup();
  const result = await exec("plan_manage", { action: "frobnicate" });
  assert(result !== null);
  assertStringIncludes(result!, "Error");
  assertStringIncludes(result!, "frobnicate");
});

// --- Non-plan tool fallthrough ---

Deno.test("Non-plan tool: returns null for fallthrough", async () => {
  const { exec } = createTestSetup();
  const result = await exec("read_file", { path: "/tmp/foo" });
  assertEquals(result, null);
});

Deno.test("Non-plan tool: returns null for unknown tool", async () => {
  const { exec } = createTestSetup();
  const result = await exec("unknown_tool", {});
  assertEquals(result, null);
});
