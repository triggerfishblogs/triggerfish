/**
 * Plan manager — tracks plan mode state per session and persists plans.
 *
 * The PlanManager lives inside the orchestrator closure, keyed by session ID,
 * following the same pattern as conversation history tracking.
 *
 * Sub-modules:
 * - plan_executor.ts: Tool executor that routes plan_* calls to PlanManager
 *
 * @module
 */

import { createLogger } from "../../core/logger/logger.ts";

const log = createLogger("plan");

import type { ImplementationPlan, PlanModeState, PlanStep } from "./types.ts";
import { DEFAULT_PLAN_STATE, PLAN_BLOCKED_TOOLS } from "./types.ts";
import { formatPlanAsMarkdown } from "./prompt.ts";

// Re-export tool executor for backward compatibility
export { createPlanToolExecutor } from "./executor.ts";

/** Options for creating a PlanManager. */
export interface PlanManagerOptions {
  /** Base path for plan file persistence (e.g., workspace/plans). */
  readonly plansDir: string;
}

/** Manager for plan mode state and persistence. */
export interface PlanManager {
  /** Get the current plan mode state for a session. */
  getState(sessionId: string): PlanModeState;

  /** Enter plan mode. Returns JSON result string. */
  enter(sessionId: string, goal: string, scope?: string): string;

  /** Exit plan mode with a plan. Returns plan ID and markdown. */
  exit(
    sessionId: string,
    plan: ImplementationPlan,
  ): Promise<{ readonly planId: string; readonly markdown: string }>;

  /** Get status for a session. Returns JSON string. */
  status(sessionId: string): string;

  /** Approve pending plan. Returns plan ID or null if no pending plan. */
  approve(sessionId: string): string | null;

  /** Reject pending plan. Returns JSON result string. */
  reject(sessionId: string): string;

  /** Mark a step as complete. Returns JSON result string. */
  stepComplete(
    sessionId: string,
    stepId: number,
    verificationResult: string,
  ): string;

  /** Mark the entire plan as complete. Returns JSON result string. */
  complete(
    sessionId: string,
    summary: string,
    deviations?: readonly string[],
  ): string;

  /** Modify a step in the active plan. Returns JSON result string. */
  modify(
    sessionId: string,
    stepId: number,
    reason: string,
    newDescription: string,
    newFiles?: readonly string[],
    newVerification?: string,
  ): string;

  /** Check if a tool is blocked for a session in plan mode. */
  isToolBlocked(sessionId: string, toolName: string): boolean;
}

/** Pending plan awaiting user approval. */
interface PendingPlan {
  readonly goal: string;
  readonly plan: ImplementationPlan;
  readonly planId: string;
}

/**
 * Create a PlanManager that tracks plan mode state per session.
 *
 * @param options - Configuration including the plans directory path
 * @returns A PlanManager instance
 */
/** Persist a plan markdown file to disk (non-fatal on failure). */
async function persistPlanFile(
  plansDir: string,
  planId: string,
  markdown: string,
): Promise<void> {
  try {
    await Deno.mkdir(plansDir, { recursive: true });
    await Deno.writeTextFile(`${plansDir}/${planId}.md`, markdown);
  } catch (err: unknown) {
    log.warn("Plan persistence failed", {
      planId,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

/** Build a status JSON snapshot for a plan mode state. */
function buildPlanStatusSnapshot(current: PlanModeState): string {
  const result: Record<string, unknown> = { mode: current.mode };
  if (current.goal) result.goal = current.goal;
  if (current.activePlan) {
    result.active_plan_id = current.activePlan.id;
    result.active_plan_progress = {
      total_steps: current.activePlan.plan.steps.length,
      completed_steps: current.activePlan.completedSteps.length,
      current_step: current.activePlan.currentStep,
    };
  }
  return JSON.stringify(result);
}

/** Record a step completion, advancing to the next uncompleted step. */
function recordStepCompletion(
  states: Map<string, PlanModeState>,
  sessionId: string,
  current: PlanModeState,
  stepId: number,
  verificationResult: string,
): string {
  const ap = current.activePlan!;
  if (ap.completedSteps.includes(stepId)) {
    return JSON.stringify({ error: `Step ${stepId} already completed` });
  }
  if (!ap.plan.steps.some((s) => s.id === stepId)) {
    return JSON.stringify({ error: `Step ${stepId} not found in plan` });
  }
  const newCompleted = [...ap.completedSteps, stepId];
  const nextStep = ap.plan.steps.find((s) => !newCompleted.includes(s.id));
  states.set(sessionId, {
    ...current,
    activePlan: {
      ...ap,
      completedSteps: newCompleted,
      currentStep: nextStep?.id ?? stepId,
    },
  });
  return JSON.stringify({
    status: "step_completed",
    step_id: stepId,
    verification_result: verificationResult,
    progress: {
      total_steps: ap.plan.steps.length,
      completed_steps: newCompleted.length,
      next_step: nextStep?.id ?? null,
    },
  });
}

/** Modify a step in the active plan, replacing its description and optional fields. */
function modifyPlanStep(
  states: Map<string, PlanModeState>,
  sessionId: string,
  current: PlanModeState,
  stepId: number,
  reason: string,
  newDescription: string,
  newFiles?: readonly string[],
  newVerification?: string,
): string {
  const step = current.activePlan!.plan.steps.find((s) => s.id === stepId);
  if (!step) {
    return JSON.stringify({ error: `Step ${stepId} not found in plan` });
  }
  const modified: PlanStep = {
    ...step,
    description: newDescription,
    ...(newFiles !== undefined ? { files: newFiles } : {}),
    ...(newVerification !== undefined ? { verification: newVerification } : {}),
  };
  const newSteps = current.activePlan!.plan.steps.map((s) =>
    s.id === stepId ? modified : s
  );
  states.set(sessionId, {
    ...current,
    activePlan: {
      ...current.activePlan!,
      plan: { ...current.activePlan!.plan, steps: newSteps },
    },
  });
  return JSON.stringify({
    status: "step_modified",
    step_id: stepId,
    reason,
    new_description: newDescription,
  });
}

export function createPlanManager(options: PlanManagerOptions): PlanManager {
  const states = new Map<string, PlanModeState>();
  const pendingPlans = new Map<string, PendingPlan>();

  function getState(sessionId: string): PlanModeState {
    return states.get(sessionId) ?? DEFAULT_PLAN_STATE;
  }

  return {
    getState,

    enter(sessionId: string, goal: string, scope?: string): string {
      const current = getState(sessionId);
      if (current.mode === "plan") {
        return JSON.stringify({
          error: "Already in plan mode",
          current_goal: current.goal,
        });
      }
      if (current.mode === "awaiting_approval") {
        return JSON.stringify({
          error:
            "A plan is awaiting approval. Approve or reject it before entering plan mode again.",
        });
      }
      states.set(sessionId, { mode: "plan", goal, scope });
      return JSON.stringify({
        status: "entered",
        mode: "plan",
        blocked_tools: PLAN_BLOCKED_TOOLS,
      });
    },

    async exit(
      sessionId: string,
      plan: ImplementationPlan,
    ): Promise<{ readonly planId: string; readonly markdown: string }> {
      const current = getState(sessionId);
      if (current.mode !== "plan") {
        throw new Error("Not in plan mode. Call plan_enter first.");
      }
      const goal = current.goal ?? "Unknown goal";
      const planId = `plan_${new Date().toISOString().slice(0, 10)}_${
        crypto.randomUUID().slice(0, 6)
      }`;
      const markdown = formatPlanAsMarkdown(planId, goal, plan);
      await persistPlanFile(options.plansDir, planId, markdown);
      states.set(sessionId, { mode: "awaiting_approval", goal });
      pendingPlans.set(sessionId, { goal, plan, planId });
      return { planId, markdown };
    },

    status: (sessionId) => buildPlanStatusSnapshot(getState(sessionId)),

    approve(sessionId: string): string | null {
      const pending = pendingPlans.get(sessionId);
      if (!pending) return null;
      states.set(sessionId, {
        mode: "normal",
        goal: pending.goal,
        activePlan: {
          id: pending.planId,
          plan: pending.plan,
          completedSteps: [],
          currentStep: pending.plan.steps[0]?.id ?? 1,
        },
      });
      pendingPlans.delete(sessionId);
      return pending.planId;
    },

    reject(sessionId: string): string {
      pendingPlans.delete(sessionId);
      states.set(sessionId, DEFAULT_PLAN_STATE);
      return JSON.stringify({ status: "rejected", mode: "normal" });
    },

    stepComplete(sessionId, stepId, verificationResult): string {
      const current = getState(sessionId);
      if (!current.activePlan) {
        return JSON.stringify({ error: "No active plan" });
      }
      return recordStepCompletion(
        states,
        sessionId,
        current,
        stepId,
        verificationResult,
      );
    },

    complete(sessionId, summary, deviations): string {
      const current = getState(sessionId);
      if (!current.activePlan) {
        return JSON.stringify({ error: "No active plan" });
      }
      const planId = current.activePlan.id;
      states.set(sessionId, DEFAULT_PLAN_STATE);
      return JSON.stringify({
        status: "plan_completed",
        plan_id: planId,
        summary,
        deviations: deviations ?? [],
      });
    },

    modify(
      sessionId,
      stepId,
      reason,
      newDescription,
      newFiles?,
      newVerification?,
    ): string {
      const current = getState(sessionId);
      if (!current.activePlan) {
        return JSON.stringify({ error: "No active plan" });
      }
      return modifyPlanStep(
        states,
        sessionId,
        current,
        stepId,
        reason,
        newDescription,
        newFiles,
        newVerification,
      );
    },

    isToolBlocked(sessionId: string, toolName: string): boolean {
      return getState(sessionId).mode === "plan" &&
        PLAN_BLOCKED_TOOLS.includes(toolName);
    },
  };
}
