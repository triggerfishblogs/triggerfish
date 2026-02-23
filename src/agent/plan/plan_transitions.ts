/**
 * Plan lifecycle transitions — enter, exit, approve, complete.
 *
 * Pure state-machine functions that move a session between plan modes.
 * Each function takes the current state maps and returns the transition result.
 *
 * @module
 */

import type { ImplementationPlan, PlanModeState } from "./types.ts";
import { DEFAULT_PLAN_STATE, PLAN_BLOCKED_TOOLS } from "./types.ts";
import type { PendingPlan } from "./plan_types.ts";
import { formatPlanAsMarkdown } from "./prompt.ts";
import { persistPlanFile } from "./plan_persistence.ts";

/** Shared context for transition functions that mutate state. */
export interface TransitionContext {
  readonly states: Map<string, PlanModeState>;
  readonly pendingPlans: Map<string, PendingPlan>;
  readonly sessionId: string;
}

/** Return an error if the session cannot enter plan mode. */
function rejectEnterIfInvalid(current: PlanModeState): string | null {
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
  return null;
}

/** Options for entering plan mode. */
export interface EnterPlanOptions {
  readonly ctx: TransitionContext;
  readonly current: PlanModeState;
  readonly goal: string;
  readonly scope?: string;
}

/** Transition session into plan mode. */
export function enterPlanMode(options: EnterPlanOptions): string {
  const { ctx, current, goal, scope } = options;
  const rejection = rejectEnterIfInvalid(current);
  if (rejection) return rejection;
  ctx.states.set(ctx.sessionId, { mode: "plan", goal, scope });
  return JSON.stringify({
    status: "entered",
    mode: "plan",
    blocked_tools: PLAN_BLOCKED_TOOLS,
  });
}

/** Generate a unique plan ID based on date and random suffix. */
function generatePlanId(): string {
  const datePrefix = new Date().toISOString().slice(0, 10);
  const randomSuffix = crypto.randomUUID().slice(0, 6);
  return `plan_${datePrefix}_${randomSuffix}`;
}

/** Options for exiting plan mode. */
export interface ExitPlanOptions {
  readonly ctx: TransitionContext;
  readonly plansDir: string;
  readonly current: PlanModeState;
  readonly plan: ImplementationPlan;
}

/** Finalize plan mode by persisting the plan and transitioning to awaiting_approval. */
export async function exitPlanMode(
  options: ExitPlanOptions,
): Promise<{ readonly planId: string; readonly markdown: string }> {
  const { ctx, plansDir, current, plan } = options;
  if (current.mode !== "plan") {
    throw new Error("Not in plan mode. Call plan_enter first.");
  }
  const goal = current.goal ?? "Unknown goal";
  const planId = generatePlanId();
  const markdown = formatPlanAsMarkdown(planId, goal, plan);
  await persistPlanFile({ plansDir, planId, markdown });
  ctx.states.set(ctx.sessionId, { mode: "awaiting_approval", goal });
  ctx.pendingPlans.set(ctx.sessionId, { goal, plan, planId });
  return { planId, markdown };
}

/** Build an active plan from a pending plan. */
function buildActivePlan(pending: PendingPlan): PlanModeState {
  return {
    mode: "normal",
    goal: pending.goal,
    activePlan: {
      id: pending.planId,
      plan: pending.plan,
      completedSteps: [],
      currentStep: pending.plan.steps[0]?.id ?? 1,
    },
  };
}

/** Approve a pending plan, activating it for step-by-step execution. */
export function approvePendingPlan(ctx: TransitionContext): string | null {
  const pending = ctx.pendingPlans.get(ctx.sessionId);
  if (!pending) return null;
  ctx.states.set(ctx.sessionId, buildActivePlan(pending));
  ctx.pendingPlans.delete(ctx.sessionId);
  return pending.planId;
}

/** Reject the pending plan, resetting to default state. */
export function rejectPendingPlan(ctx: TransitionContext): string {
  ctx.pendingPlans.delete(ctx.sessionId);
  ctx.states.set(ctx.sessionId, DEFAULT_PLAN_STATE);
  return JSON.stringify({ status: "rejected", mode: "normal" });
}

/** Options for completing plan execution. */
interface CompletePlanOptions {
  readonly ctx: TransitionContext;
  readonly current: PlanModeState;
  readonly summary: string;
  readonly deviations?: readonly string[];
}

/** Mark the entire plan as complete, resetting the session to default state. */
export function completePlanExecution(options: CompletePlanOptions): string {
  const { ctx, current, summary, deviations } = options;
  if (!current.activePlan) {
    return JSON.stringify({ error: "No active plan" });
  }
  const planId = current.activePlan.id;
  ctx.states.set(ctx.sessionId, DEFAULT_PLAN_STATE);
  return JSON.stringify({
    status: "plan_completed",
    plan_id: planId,
    summary,
    deviations: deviations ?? [],
  });
}
