/**
 * Plan manager and tool executor.
 *
 * Tracks plan mode state per-session, persists plans as markdown files,
 * and provides a tool executor that handles plan.* tool calls.
 *
 * The PlanManager lives inside the orchestrator closure, keyed by session ID,
 * following the same pattern as conversation history tracking.
 *
 * @module
 */

import type {
  ActivePlan,
  ImplementationPlan,
  PlanComplexity,
  PlanModeState,
  PlanStep,
} from "./plan_types.ts";
import {
  DEFAULT_PLAN_STATE,
  PLAN_BLOCKED_TOOLS,
} from "./plan_types.ts";
import { formatPlanAsMarkdown } from "./plan_prompt.ts";

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
export function createPlanManager(options: PlanManagerOptions): PlanManager {
  const states = new Map<string, PlanModeState>();
  const pendingPlans = new Map<string, PendingPlan>();

  function getState(sessionId: string): PlanModeState {
    return states.get(sessionId) ?? DEFAULT_PLAN_STATE;
  }

  function enter(sessionId: string, goal: string, scope?: string): string {
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
  }

  async function exit(
    sessionId: string,
    plan: ImplementationPlan,
  ): Promise<{ readonly planId: string; readonly markdown: string }> {
    const current = getState(sessionId);
    if (current.mode !== "plan") {
      throw new Error("Not in plan mode. Call plan.enter first.");
    }

    const goal = current.goal ?? "Unknown goal";
    const planId = `plan_${new Date().toISOString().slice(0, 10)}_${crypto.randomUUID().slice(0, 6)}`;
    const markdown = formatPlanAsMarkdown(planId, goal, plan);

    // Persist plan to filesystem (non-fatal on failure)
    try {
      await Deno.mkdir(options.plansDir, { recursive: true });
      await Deno.writeTextFile(`${options.plansDir}/${planId}.md`, markdown);
    } catch {
      // Persistence failure is non-fatal — plan is still returned
    }

    // Transition to awaiting_approval
    states.set(sessionId, { mode: "awaiting_approval", goal });
    pendingPlans.set(sessionId, { goal, plan, planId });

    return { planId, markdown };
  }

  function status(sessionId: string): string {
    const current = getState(sessionId);
    const result: Record<string, unknown> = { mode: current.mode };

    if (current.goal) {
      result.goal = current.goal;
    }
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

  function approve(sessionId: string): string | null {
    const pending = pendingPlans.get(sessionId);
    if (!pending) return null;

    const firstStepId = pending.plan.steps[0]?.id ?? 1;

    states.set(sessionId, {
      mode: "normal",
      goal: pending.goal,
      activePlan: {
        id: pending.planId,
        plan: pending.plan,
        completedSteps: [],
        currentStep: firstStepId,
      },
    });

    pendingPlans.delete(sessionId);
    return pending.planId;
  }

  function reject(sessionId: string): string {
    pendingPlans.delete(sessionId);
    states.set(sessionId, DEFAULT_PLAN_STATE);
    return JSON.stringify({ status: "rejected", mode: "normal" });
  }

  function stepComplete(
    sessionId: string,
    stepId: number,
    verificationResult: string,
  ): string {
    const current = getState(sessionId);
    if (!current.activePlan) {
      return JSON.stringify({ error: "No active plan" });
    }

    const ap = current.activePlan;
    if (ap.completedSteps.includes(stepId)) {
      return JSON.stringify({ error: `Step ${stepId} already completed` });
    }

    const stepExists = ap.plan.steps.some((s) => s.id === stepId);
    if (!stepExists) {
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

  function complete(
    sessionId: string,
    summary: string,
    deviations?: readonly string[],
  ): string {
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
  }

  function modify(
    sessionId: string,
    stepId: number,
    reason: string,
    newDescription: string,
    newFiles?: readonly string[],
    newVerification?: string,
  ): string {
    const current = getState(sessionId);
    if (!current.activePlan) {
      return JSON.stringify({ error: "No active plan" });
    }

    const step = current.activePlan.plan.steps.find((s) => s.id === stepId);
    if (!step) {
      return JSON.stringify({ error: `Step ${stepId} not found in plan` });
    }

    const modified: PlanStep = {
      ...step,
      description: newDescription,
      ...(newFiles !== undefined ? { files: newFiles } : {}),
      ...(newVerification !== undefined
        ? { verification: newVerification }
        : {}),
    };

    const newSteps = current.activePlan.plan.steps.map((s) =>
      s.id === stepId ? modified : s
    );

    states.set(sessionId, {
      ...current,
      activePlan: {
        ...current.activePlan,
        plan: { ...current.activePlan.plan, steps: newSteps },
      },
    });

    return JSON.stringify({
      status: "step_modified",
      step_id: stepId,
      reason,
      new_description: newDescription,
    });
  }

  function isToolBlocked(sessionId: string, toolName: string): boolean {
    const current = getState(sessionId);
    if (current.mode !== "plan") return false;
    return PLAN_BLOCKED_TOOLS.includes(toolName);
  }

  return {
    getState,
    enter,
    exit,
    status,
    approve,
    reject,
    stepComplete,
    complete,
    modify,
    isToolBlocked,
  };
}

/**
 * Create a tool executor for plan operations.
 *
 * Returns a handler that accepts tool name + args and returns a result string,
 * or `null` if the tool name is not a plan tool (so callers can fall through).
 * This follows the same pattern as `createTodoToolExecutor`.
 *
 * @param manager - The PlanManager instance
 * @param sessionId - The session to operate on
 * @returns A tool executor function
 */
export function createPlanToolExecutor(
  manager: PlanManager,
  sessionId: string,
): (name: string, input: Record<string, unknown>) => Promise<string | null> {
  return async (
    name: string,
    input: Record<string, unknown>,
  ): Promise<string | null> => {
    switch (name) {
      case "plan.enter": {
        const goal = input.goal;
        if (typeof goal !== "string" || goal.length === 0) {
          return "Error: plan.enter requires a 'goal' argument (string).";
        }
        const scope = typeof input.scope === "string"
          ? input.scope
          : undefined;
        return manager.enter(sessionId, goal, scope);
      }

      case "plan.exit": {
        const planObj = input.plan;
        if (!planObj || typeof planObj !== "object") {
          return "Error: plan.exit requires a 'plan' argument (object).";
        }
        const validated = validateImplementationPlan(
          planObj as Record<string, unknown>,
        );
        if (typeof validated === "string") return validated;

        try {
          const result = await manager.exit(sessionId, validated);
          return (
            JSON.stringify({
              status: "plan_presented",
              mode: "awaiting_approval",
              plan_id: result.planId,
              awaiting_approval: true,
            }) +
            "\n\n---\n\n" +
            result.markdown
          );
        } catch (err) {
          return `Error: ${err instanceof Error ? err.message : String(err)}`;
        }
      }

      case "plan.status":
        return manager.status(sessionId);

      case "plan.approve": {
        const planId = manager.approve(sessionId);
        if (!planId) {
          return JSON.stringify({
            error: "No plan awaiting approval",
          });
        }
        return JSON.stringify({
          status: "approved",
          plan_id: planId,
          mode: "normal",
        });
      }

      case "plan.reject":
        return manager.reject(sessionId);

      case "plan.step_complete": {
        const stepId = input.step_id;
        const verificationResult = input.verification_result;
        if (typeof stepId !== "number") {
          return "Error: plan.step_complete requires a 'step_id' argument (number).";
        }
        if (typeof verificationResult !== "string") {
          return "Error: plan.step_complete requires a 'verification_result' argument (string).";
        }
        return manager.stepComplete(sessionId, stepId, verificationResult);
      }

      case "plan.complete": {
        const summary = input.summary;
        if (typeof summary !== "string" || summary.length === 0) {
          return "Error: plan.complete requires a 'summary' argument (string).";
        }
        const deviations = Array.isArray(input.deviations)
          ? (input.deviations as string[])
          : undefined;
        return manager.complete(sessionId, summary, deviations);
      }

      case "plan.modify": {
        const stepId = input.step_id;
        const reason = input.reason;
        const newDescription = input.new_description;
        if (typeof stepId !== "number") {
          return "Error: plan.modify requires 'step_id' (number).";
        }
        if (typeof reason !== "string") {
          return "Error: plan.modify requires 'reason' (string).";
        }
        if (typeof newDescription !== "string") {
          return "Error: plan.modify requires 'new_description' (string).";
        }
        const newFiles = Array.isArray(input.new_files)
          ? (input.new_files as string[])
          : undefined;
        const newVerification = typeof input.new_verification === "string"
          ? input.new_verification
          : undefined;
        return manager.modify(
          sessionId,
          stepId,
          reason,
          newDescription,
          newFiles,
          newVerification,
        );
      }

      default:
        return null;
    }
  };
}

/**
 * Validate an ImplementationPlan from untrusted LLM input.
 *
 * Returns a validated ImplementationPlan or an error message string.
 */
function validateImplementationPlan(
  raw: Record<string, unknown>,
): ImplementationPlan | string {
  if (typeof raw.summary !== "string") {
    return "Error: plan.summary is required (string).";
  }
  if (typeof raw.approach !== "string") {
    return "Error: plan.approach is required (string).";
  }
  if (!Array.isArray(raw.steps) || raw.steps.length === 0) {
    return "Error: plan.steps is required (non-empty array).";
  }

  const validComplexities = ["small", "medium", "large"];
  const complexity =
    typeof raw.estimated_complexity === "string" &&
    validComplexities.includes(raw.estimated_complexity)
      ? (raw.estimated_complexity as PlanComplexity)
      : "medium";

  const steps: PlanStep[] = [];
  for (const rawStep of raw.steps) {
    if (typeof rawStep !== "object" || rawStep === null) {
      return "Error: Each step must be an object.";
    }
    const s = rawStep as Record<string, unknown>;
    if (typeof s.id !== "number") {
      return "Error: Each step requires 'id' (number).";
    }
    if (typeof s.description !== "string") {
      return "Error: Each step requires 'description' (string).";
    }
    steps.push({
      id: s.id as number,
      description: s.description as string,
      files: Array.isArray(s.files) ? (s.files as string[]) : [],
      depends_on: Array.isArray(s.depends_on)
        ? (s.depends_on as number[])
        : [],
      verification: typeof s.verification === "string"
        ? (s.verification as string)
        : "",
    });
  }

  return {
    summary: raw.summary as string,
    approach: raw.approach as string,
    alternatives_considered: Array.isArray(raw.alternatives_considered)
      ? (raw.alternatives_considered as string[])
      : [],
    steps,
    risks: Array.isArray(raw.risks) ? (raw.risks as string[]) : [],
    files_to_create: Array.isArray(raw.files_to_create)
      ? (raw.files_to_create as string[])
      : [],
    files_to_modify: Array.isArray(raw.files_to_modify)
      ? (raw.files_to_modify as string[])
      : [],
    tests_to_write: Array.isArray(raw.tests_to_write)
      ? (raw.tests_to_write as string[])
      : [],
    estimated_complexity: complexity,
  };
}
