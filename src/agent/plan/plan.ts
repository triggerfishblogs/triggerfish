/**
 * Plan manager factory — assembles PlanManager from sub-modules.
 *
 * Wires together plan transitions, operations, and persistence into
 * a single PlanManager instance keyed by session ID.
 *
 * Sub-modules:
 * - plan_types.ts: PlanManager interface and options
 * - plan_transitions.ts: Enter, exit, approve, complete lifecycle
 * - plan_operations.ts: Status, step completion, step modification
 * - plan_persistence.ts: File I/O for plan markdown
 * - executor.ts: Tool executor that routes plan_* calls to PlanManager
 *
 * @module
 */

import type { PlanModeState } from "./types.ts";
import { DEFAULT_PLAN_STATE, PLAN_BLOCKED_TOOLS } from "./types.ts";
import type {
  PendingPlan,
  PlanManager,
  PlanManagerOptions,
} from "./plan_types.ts";
import type { TransitionContext } from "./plan_transitions.ts";
import {
  approvePendingPlan,
  completePlanExecution,
  enterPlanMode,
  exitPlanMode,
  rejectPendingPlan,
} from "./plan_transitions.ts";
import type {
  RecordStepOptions,
  StepOperationContext,
} from "./plan_operations.ts";
import {
  buildPlanStatusSnapshot,
  modifyPlanStep,
  recordStepCompletion,
} from "./plan_operations.ts";

// Re-export public types and executor for backward compatibility
export type { PlanManager, PlanManagerOptions } from "./plan_types.ts";
export { createPlanToolExecutor } from "./executor.ts";

/** Dispatch a step completion, guarding against missing active plan. */
function dispatchStepComplete(options: RecordStepOptions): string {
  if (!options.ctx.current.activePlan) {
    return JSON.stringify({ error: "No active plan" });
  }
  return recordStepCompletion(options);
}

/** Options for dispatching a step modification. */
interface DispatchModifyOptions {
  readonly ctx: StepOperationContext;
  readonly stepId: number;
  readonly reason: string;
  readonly newDescription: string;
  readonly newFiles?: readonly string[];
  readonly newVerification?: string;
}

/** Dispatch a step modification, guarding against missing active plan. */
function dispatchModifyStep(options: DispatchModifyOptions): string {
  if (!options.ctx.current.activePlan) {
    return JSON.stringify({ error: "No active plan" });
  }
  return modifyPlanStep(options);
}

/**
 * Create a PlanManager that tracks plan mode state per session.
 *
 * @param options - Configuration including the plans directory path
 * @returns A PlanManager instance
 */
export function createPlanManager(options: PlanManagerOptions): PlanManager {
  const states = new Map<string, PlanModeState>();
  const pending = new Map<string, PendingPlan>();

  return assembleManagerMethods({
    states,
    pending,
    plansDir: options.plansDir,
  });
}

/** Internal config for the manager assembly. */
interface ManagerConfig {
  readonly states: Map<string, PlanModeState>;
  readonly pending: Map<string, PendingPlan>;
  readonly plansDir: string;
}

/** Resolve session state, falling back to default. */
function resolveState(
  states: Map<string, PlanModeState>,
  sid: string,
): PlanModeState {
  return states.get(sid) ?? DEFAULT_PLAN_STATE;
}

/** Build a TransitionContext for a session. */
function buildTxCtx(cfg: ManagerConfig, sid: string): TransitionContext {
  return { states: cfg.states, pendingPlans: cfg.pending, sessionId: sid };
}

/** Build a StepOperationContext for a session. */
function buildStepCtx(cfg: ManagerConfig, sid: string): StepOperationContext {
  return {
    states: cfg.states,
    sessionId: sid,
    current: resolveState(cfg.states, sid),
  };
}

/** Assemble PlanManager method implementations. */
function assembleManagerMethods(cfg: ManagerConfig): PlanManager {
  const gs = (sid: string) => resolveState(cfg.states, sid);
  return {
    getState: gs,
    enter: (sid, goal, scope) =>
      enterPlanMode({
        ctx: buildTxCtx(cfg, sid),
        current: gs(sid),
        goal,
        scope,
      }),
    exit: (sid, plan) =>
      exitPlanMode({
        ctx: buildTxCtx(cfg, sid),
        plansDir: cfg.plansDir,
        current: gs(sid),
        plan,
      }),
    status: (sid) => buildPlanStatusSnapshot(gs(sid)),
    approve: (sid) => approvePendingPlan(buildTxCtx(cfg, sid)),
    reject: (sid) => rejectPendingPlan(buildTxCtx(cfg, sid)),
    stepComplete: (sid, stepId, vr) =>
      dispatchStepComplete({
        ctx: buildStepCtx(cfg, sid),
        stepId,
        verificationResult: vr,
      }),
    complete: (sid, summary, devs) =>
      completePlanExecution({
        ctx: buildTxCtx(cfg, sid),
        current: gs(sid),
        summary,
        deviations: devs,
      }),
    modify: (sid, stepId, reason, desc, files?, verif?) =>
      dispatchModifyStep({
        ctx: buildStepCtx(cfg, sid),
        stepId,
        reason,
        newDescription: desc,
        newFiles: files,
        newVerification: verif,
      }),
    isToolBlocked: (sid, toolName) =>
      gs(sid).mode === "plan" && PLAN_BLOCKED_TOOLS.includes(toolName),
  };
}
