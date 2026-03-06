/**
 * Plan mode state machine and orchestrator integration tests.
 *
 * Tests PlanManager state transitions and verifies that the orchestrator
 * correctly injects plan mode context into the system prompt.
 */
import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import { createPlanManager } from "../../src/agent/plan/plan.ts";
import type { PlanManager } from "../../src/agent/plan/plan.ts";
import type { ImplementationPlan } from "../../src/agent/plan/types.ts";

const TEST_SESSION = "test-session-001";

function makePlan(overrides?: Partial<ImplementationPlan>): ImplementationPlan {
  return {
    summary: "Add feature X",
    approach: "Extend module Y",
    alternatives_considered: ["Rewrite Z"],
    steps: [
      {
        id: 1,
        description: "Create foo.ts",
        files: ["src/foo.ts"],
        depends_on: [],
        verification: "deno test",
      },
      {
        id: 2,
        description: "Update bar.ts",
        files: ["src/bar.ts"],
        depends_on: [1],
        verification: "deno test",
      },
    ],
    risks: ["Might break baz"],
    files_to_create: ["src/foo.ts"],
    files_to_modify: ["src/bar.ts"],
    tests_to_write: ["tests/foo_test.ts"],
    estimated_complexity: "medium",
    ...overrides,
  };
}

function createTestManager(): PlanManager {
  const tmpDir = Deno.makeTempDirSync();
  return createPlanManager({ plansDir: `${tmpDir}/plans` });
}

// --- State Machine Tests ---

Deno.test("PlanManager: initial state is normal", () => {
  const mgr = createTestManager();
  const state = mgr.getState(TEST_SESSION);
  assertEquals(state.mode, "normal");
  assertEquals(state.goal, undefined);
  assertEquals(state.activePlan, undefined);
});

Deno.test("PlanManager: enter transitions to plan mode", () => {
  const mgr = createTestManager();
  const result = JSON.parse(mgr.enter(TEST_SESSION, "Build feature X"));
  assertEquals(result.status, "entered");
  assertEquals(result.mode, "plan");
  assert(Array.isArray(result.blocked_tools));

  const state = mgr.getState(TEST_SESSION);
  assertEquals(state.mode, "plan");
  assertEquals(state.goal, "Build feature X");
});

Deno.test("PlanManager: enter with scope", () => {
  const mgr = createTestManager();
  mgr.enter(TEST_SESSION, "Refactor auth", "src/auth/");

  const state = mgr.getState(TEST_SESSION);
  assertEquals(state.mode, "plan");
  assertEquals(state.goal, "Refactor auth");
  assertEquals(state.scope, "src/auth/");
});

Deno.test("PlanManager: enter while already in plan mode returns error", () => {
  const mgr = createTestManager();
  mgr.enter(TEST_SESSION, "First goal");
  const result = JSON.parse(mgr.enter(TEST_SESSION, "Second goal"));
  assert(result.error);
  assertStringIncludes(result.error, "Already in plan mode");

  // State unchanged
  assertEquals(mgr.getState(TEST_SESSION).goal, "First goal");
});

Deno.test("PlanManager: enter while awaiting approval returns error", async () => {
  const mgr = createTestManager();
  mgr.enter(TEST_SESSION, "Goal");
  await mgr.exit(TEST_SESSION, makePlan());

  const result = JSON.parse(mgr.enter(TEST_SESSION, "New goal"));
  assert(result.error);
  assertStringIncludes(result.error, "awaiting approval");
});

Deno.test("PlanManager: exit transitions to awaiting_approval", async () => {
  const mgr = createTestManager();
  mgr.enter(TEST_SESSION, "Build X");
  const { planId, markdown } = await mgr.exit(TEST_SESSION, makePlan());

  assert(planId.startsWith("plan_"));
  assertStringIncludes(markdown, "Implementation Plan: Build X");

  const state = mgr.getState(TEST_SESSION);
  assertEquals(state.mode, "awaiting_approval");
});

Deno.test("PlanManager: approve transitions to normal with active plan", async () => {
  const mgr = createTestManager();
  mgr.enter(TEST_SESSION, "Build X");
  await mgr.exit(TEST_SESSION, makePlan());

  const planId = mgr.approve(TEST_SESSION);
  assert(planId !== null);

  const state = mgr.getState(TEST_SESSION);
  assertEquals(state.mode, "normal");
  assert(state.activePlan !== undefined);
  assertEquals(state.activePlan!.id, planId);
  assertEquals(state.activePlan!.completedSteps.length, 0);
  assertEquals(state.activePlan!.currentStep, 1);
});

Deno.test("PlanManager: approve with no pending plan returns null", () => {
  const mgr = createTestManager();
  assertEquals(mgr.approve(TEST_SESSION), null);
});

Deno.test("PlanManager: reject transitions to normal", async () => {
  const mgr = createTestManager();
  mgr.enter(TEST_SESSION, "Build X");
  await mgr.exit(TEST_SESSION, makePlan());

  const result = JSON.parse(mgr.reject(TEST_SESSION));
  assertEquals(result.status, "rejected");
  assertEquals(result.mode, "normal");

  const state = mgr.getState(TEST_SESSION);
  assertEquals(state.mode, "normal");
  assertEquals(state.activePlan, undefined);
});

// --- Tool Blocking Tests ---

Deno.test("PlanManager: isToolBlocked true for write_file in plan mode", () => {
  const mgr = createTestManager();
  mgr.enter(TEST_SESSION, "Goal");

  assert(mgr.isToolBlocked(TEST_SESSION, "write_file"));
  assert(mgr.isToolBlocked(TEST_SESSION, "cron", { action: "create" }));
  assert(mgr.isToolBlocked(TEST_SESSION, "cron", { action: "delete" }));
});

Deno.test("PlanManager: isToolBlocked false for read tools in plan mode", () => {
  const mgr = createTestManager();
  mgr.enter(TEST_SESSION, "Goal");

  assertEquals(mgr.isToolBlocked(TEST_SESSION, "read_file"), false);
  assertEquals(mgr.isToolBlocked(TEST_SESSION, "run_command"), false);
  assertEquals(mgr.isToolBlocked(TEST_SESSION, "list_directory"), false);
  assertEquals(mgr.isToolBlocked(TEST_SESSION, "search_files"), false);
});

Deno.test("PlanManager: isToolBlocked false in normal mode", () => {
  const mgr = createTestManager();
  assertEquals(mgr.isToolBlocked(TEST_SESSION, "write_file"), false);
  assertEquals(mgr.isToolBlocked(TEST_SESSION, "cron", { action: "create" }), false);
});

Deno.test("PlanManager: isToolBlocked false in awaiting_approval mode", async () => {
  const mgr = createTestManager();
  mgr.enter(TEST_SESSION, "Goal");
  await mgr.exit(TEST_SESSION, makePlan());

  assertEquals(mgr.isToolBlocked(TEST_SESSION, "write_file"), false);
});

// --- Step Tracking Tests ---

Deno.test("PlanManager: stepComplete tracks progress", async () => {
  const mgr = createTestManager();
  mgr.enter(TEST_SESSION, "Build X");
  await mgr.exit(TEST_SESSION, makePlan());
  mgr.approve(TEST_SESSION);

  const result = JSON.parse(mgr.stepComplete(TEST_SESSION, 1, "Tests pass"));
  assertEquals(result.status, "step_completed");
  assertEquals(result.step_id, 1);
  assertEquals(result.progress.completed_steps, 1);
  assertEquals(result.progress.next_step, 2);

  const state = mgr.getState(TEST_SESSION);
  assert(state.activePlan!.completedSteps.includes(1));
  assertEquals(state.activePlan!.currentStep, 2);
});

Deno.test("PlanManager: stepComplete rejects duplicate", async () => {
  const mgr = createTestManager();
  mgr.enter(TEST_SESSION, "Build X");
  await mgr.exit(TEST_SESSION, makePlan());
  mgr.approve(TEST_SESSION);
  mgr.stepComplete(TEST_SESSION, 1, "pass");

  const result = JSON.parse(mgr.stepComplete(TEST_SESSION, 1, "pass again"));
  assert(result.error);
  assertStringIncludes(result.error, "already completed");
});

Deno.test("PlanManager: stepComplete rejects non-existent step", async () => {
  const mgr = createTestManager();
  mgr.enter(TEST_SESSION, "Build X");
  await mgr.exit(TEST_SESSION, makePlan());
  mgr.approve(TEST_SESSION);

  const result = JSON.parse(mgr.stepComplete(TEST_SESSION, 99, "pass"));
  assert(result.error);
  assertStringIncludes(result.error, "not found");
});

Deno.test("PlanManager: stepComplete with no active plan returns error", () => {
  const mgr = createTestManager();
  const result = JSON.parse(mgr.stepComplete(TEST_SESSION, 1, "pass"));
  assert(result.error);
  assertStringIncludes(result.error, "No active plan");
});

Deno.test("PlanManager: complete resets to normal", async () => {
  const mgr = createTestManager();
  mgr.enter(TEST_SESSION, "Build X");
  await mgr.exit(TEST_SESSION, makePlan());
  mgr.approve(TEST_SESSION);

  const result = JSON.parse(
    mgr.complete(TEST_SESSION, "Done", ["Skipped step 2"]),
  );
  assertEquals(result.status, "plan_completed");
  assert(result.plan_id);
  assertEquals(result.deviations.length, 1);

  const state = mgr.getState(TEST_SESSION);
  assertEquals(state.mode, "normal");
  assertEquals(state.activePlan, undefined);
});

// --- Modify Tests ---

Deno.test("PlanManager: modify updates step description", async () => {
  const mgr = createTestManager();
  mgr.enter(TEST_SESSION, "Build X");
  await mgr.exit(TEST_SESSION, makePlan());
  mgr.approve(TEST_SESSION);

  const result = JSON.parse(
    mgr.modify(TEST_SESSION, 1, {
      reason: "Needs refactor",
      newDescription: "Create baz.ts instead",
    }),
  );
  assertEquals(result.status, "step_modified");
  assertEquals(result.step_id, 1);

  const state = mgr.getState(TEST_SESSION);
  const step = state.activePlan!.plan.steps.find((s) => s.id === 1);
  assertEquals(step!.description, "Create baz.ts instead");
});

Deno.test("PlanManager: modify updates files and verification", async () => {
  const mgr = createTestManager();
  mgr.enter(TEST_SESSION, "Build X");
  await mgr.exit(TEST_SESSION, makePlan());
  mgr.approve(TEST_SESSION);

  mgr.modify(TEST_SESSION, 1, {
    reason: "Changed approach",
    newDescription: "New description",
    newFiles: ["new_file.ts"],
    newVerification: "deno task check",
  });

  const state = mgr.getState(TEST_SESSION);
  const step = state.activePlan!.plan.steps.find((s) => s.id === 1);
  assertEquals(step!.files[0], "new_file.ts");
  assertEquals(step!.verification, "deno task check");
});

Deno.test("PlanManager: modify non-existent step returns error", async () => {
  const mgr = createTestManager();
  mgr.enter(TEST_SESSION, "Build X");
  await mgr.exit(TEST_SESSION, makePlan());
  mgr.approve(TEST_SESSION);

  const result = JSON.parse(
    mgr.modify(TEST_SESSION, 99, {
      reason: "reason",
      newDescription: "new desc",
    }),
  );
  assert(result.error);
  assertStringIncludes(result.error, "not found");
});

// --- Status Tests ---

Deno.test("PlanManager: status in normal mode", () => {
  const mgr = createTestManager();
  const result = JSON.parse(mgr.status(TEST_SESSION));
  assertEquals(result.mode, "normal");
  assertEquals(result.goal, undefined);
});

Deno.test("PlanManager: status in plan mode shows goal", () => {
  const mgr = createTestManager();
  mgr.enter(TEST_SESSION, "Build X");
  const result = JSON.parse(mgr.status(TEST_SESSION));
  assertEquals(result.mode, "plan");
  assertEquals(result.goal, "Build X");
});

Deno.test("PlanManager: status with active plan shows progress", async () => {
  const mgr = createTestManager();
  mgr.enter(TEST_SESSION, "Build X");
  await mgr.exit(TEST_SESSION, makePlan());
  mgr.approve(TEST_SESSION);
  mgr.stepComplete(TEST_SESSION, 1, "pass");

  const result = JSON.parse(mgr.status(TEST_SESSION));
  assertEquals(result.mode, "normal");
  assert(result.active_plan_id);
  assertEquals(result.active_plan_progress.total_steps, 2);
  assertEquals(result.active_plan_progress.completed_steps, 1);
  assertEquals(result.active_plan_progress.current_step, 2);
});

// --- Session Isolation ---

Deno.test("PlanManager: sessions are isolated", () => {
  const mgr = createTestManager();
  mgr.enter("session-a", "Goal A");

  assertEquals(mgr.getState("session-a").mode, "plan");
  assertEquals(mgr.getState("session-b").mode, "normal");
});

// --- Plan Persistence ---

Deno.test("PlanManager: exit writes plan to filesystem", async () => {
  const tmpDir = Deno.makeTempDirSync();
  const plansDir = `${tmpDir}/plans`;
  const mgr = createPlanManager({ plansDir });

  mgr.enter(TEST_SESSION, "Build X");
  const { planId } = await mgr.exit(TEST_SESSION, makePlan());

  const content = await Deno.readTextFile(`${plansDir}/${planId}.md`);
  assertStringIncludes(content, "Implementation Plan: Build X");
  assertStringIncludes(content, "Pending Approval");
  assertStringIncludes(content, "Create foo.ts");
});
