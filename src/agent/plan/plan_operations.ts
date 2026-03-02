/**
 * Plan step operations — status, step completion, step modification.
 *
 * Functions that query or mutate step-level state within an active plan.
 *
 * @module
 */

import type { ActivePlan, PlanModeState, PlanStep } from "./types.ts";

/** Build a status JSON snapshot for a plan mode state. */
export function buildPlanStatusSnapshot(current: PlanModeState): string {
  const result: Record<string, unknown> = { mode: current.mode };
  if (current.goal) result.goal = current.goal;
  if (current.activePlan) {
    result.active_plan_id = current.activePlan.id;
    result.active_plan_progress = buildProgressSnapshot(current.activePlan);
  }
  return JSON.stringify(result);
}

/** Build the progress sub-object for plan status. */
function buildProgressSnapshot(
  ap: ActivePlan,
): Record<string, unknown> {
  return {
    total_steps: ap.plan.steps.length,
    completed_steps: ap.completedSteps.length,
    current_step: ap.currentStep,
  };
}

/** Context for state-mutating step operations. */
export interface StepOperationContext {
  readonly states: Map<string, PlanModeState>;
  readonly sessionId: string;
  readonly current: PlanModeState;
}

/** Apply step completion to the state map, advancing to next step. */
function applyStepCompletion(
  ctx: StepOperationContext,
  newCompleted: readonly number[],
): number | null {
  const ap = ctx.current.activePlan!;
  const nextStep = ap.plan.steps.find((s) => !newCompleted.includes(s.id));
  ctx.states.set(ctx.sessionId, {
    ...ctx.current,
    activePlan: {
      ...ap,
      completedSteps: newCompleted,
      currentStep: nextStep?.id ?? ap.currentStep,
    },
  });
  return nextStep?.id ?? null;
}

/** Validate that a step can be completed, returning an error or null. */
function validateStepCompletion(ap: ActivePlan, stepId: number): string | null {
  if (ap.completedSteps.includes(stepId)) {
    return JSON.stringify({ error: `Step ${stepId} already completed` });
  }
  if (!ap.plan.steps.some((s) => s.id === stepId)) {
    return JSON.stringify({ error: `Step ${stepId} not found in plan` });
  }
  return null;
}

/** Options for building a completion response. */
interface CompletionResponseOptions {
  readonly ap: ActivePlan;
  readonly stepId: number;
  readonly verificationResult: string;
  readonly completedCount: number;
  readonly nextStepId: number | null;
}

/** Build the step completion response JSON. */
function buildCompletionResponse(opts: CompletionResponseOptions): string {
  return JSON.stringify({
    status: "step_completed",
    step_id: opts.stepId,
    verification_result: opts.verificationResult,
    progress: {
      total_steps: opts.ap.plan.steps.length,
      completed_steps: opts.completedCount,
      next_step: opts.nextStepId,
    },
  });
}

/** Options for recording a step completion. */
export interface RecordStepOptions {
  readonly ctx: StepOperationContext;
  readonly stepId: number;
  readonly verificationResult: string;
}

/** Record a step completion, advancing to the next uncompleted step. */
export function recordStepCompletion(options: RecordStepOptions): string {
  const { ctx, stepId, verificationResult } = options;
  const ap = ctx.current.activePlan!;
  const error = validateStepCompletion(ap, stepId);
  if (error) return error;
  const newCompleted = [...ap.completedSteps, stepId];
  const nextStepId = applyStepCompletion(ctx, newCompleted);
  return buildCompletionResponse({
    ap,
    stepId,
    verificationResult,
    completedCount: newCompleted.length,
    nextStepId,
  });
}

/** Options for modifying a plan step. */
export interface ModifyStepOptions {
  readonly ctx: StepOperationContext;
  readonly stepId: number;
  readonly reason: string;
  readonly newDescription: string;
  readonly newFiles?: readonly string[];
  readonly newVerification?: string;
}

/** Build a modified step from the original and the modification options. */
function buildModifiedStep(
  step: PlanStep,
  options: ModifyStepOptions,
): PlanStep {
  return {
    ...step,
    description: options.newDescription,
    ...(options.newFiles !== undefined ? { files: options.newFiles } : {}),
    ...(options.newVerification !== undefined
      ? { verification: options.newVerification }
      : {}),
  };
}

/** Modify a step in the active plan, replacing its description and optional fields. */
export function modifyPlanStep(options: ModifyStepOptions): string {
  const { ctx, stepId, reason, newDescription } = options;
  const ap = ctx.current.activePlan!;
  const step = ap.plan.steps.find((s) => s.id === stepId);
  if (!step) {
    return JSON.stringify({ error: `Step ${stepId} not found in plan` });
  }
  const modified = buildModifiedStep(step, options);
  const newSteps = ap.plan.steps.map((s) => s.id === stepId ? modified : s);
  ctx.states.set(ctx.sessionId, {
    ...ctx.current,
    activePlan: { ...ap, plan: { ...ap.plan, steps: newSteps } },
  });
  return JSON.stringify({
    status: "step_modified",
    step_id: stepId,
    reason,
    new_description: newDescription,
  });
}
