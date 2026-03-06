/**
 * Plan tool executor — routes plan_* tool calls to PlanManager.
 *
 * Validates untrusted LLM input for implementation plans and dispatches
 * plan_manage (with action parameter), plan_step_complete, and plan_status
 * to the PlanManager.
 *
 * @module
 */

import type { ImplementationPlan, PlanComplexity, PlanStep } from "./types.ts";
import type { PlanManager } from "./plan_types.ts";
import { createLogger } from "../../core/logger/mod.ts";

const log = createLogger("plan-executor");

// ─── Action Handlers for plan_manage ─────────────────────────────────────────

function executeActionEnter(
  manager: PlanManager,
  sessionId: string,
  input: Record<string, unknown>,
): string {
  const goal = input.goal;
  if (typeof goal !== "string" || goal.length === 0) {
    return "Error: plan_manage(action: 'enter') requires a 'goal' argument (string).";
  }
  const scope = typeof input.scope === "string" ? input.scope : undefined;
  return manager.enter(sessionId, goal, scope);
}

async function executeActionExit(
  manager: PlanManager,
  sessionId: string,
  input: Record<string, unknown>,
): Promise<string> {
  const planObj = input.plan;
  if (!planObj || typeof planObj !== "object") {
    return "Error: plan_manage(action: 'exit') requires a 'plan' argument (object).";
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
    log.error("Plan exit failed during persistence", {
      operation: "executeActionExit",
      sessionId,
      err,
    });
    return `Error: ${err instanceof Error ? err.message : String(err)}`;
  }
}

function executeActionApprove(
  manager: PlanManager,
  sessionId: string,
): string {
  const planId = manager.approve(sessionId);
  if (!planId) {
    return JSON.stringify({ error: "No plan awaiting approval" });
  }
  return JSON.stringify({
    status: "approved",
    plan_id: planId,
    mode: "normal",
  });
}

function executeActionComplete(
  manager: PlanManager,
  sessionId: string,
  input: Record<string, unknown>,
): string {
  const summary = input.summary;
  if (typeof summary !== "string" || summary.length === 0) {
    return "Error: plan_manage(action: 'complete') requires a 'summary' argument (string).";
  }
  const deviations = Array.isArray(input.deviations)
    ? (input.deviations as string[])
    : undefined;
  return manager.complete(sessionId, summary, deviations);
}

function executeActionModify(
  manager: PlanManager,
  sessionId: string,
  input: Record<string, unknown>,
): string {
  const stepId = input.step_id;
  const reason = input.reason;
  const newDescription = input.new_description;
  if (typeof stepId !== "number") {
    return "Error: plan_manage(action: 'modify') requires 'step_id' (number).";
  }
  if (typeof reason !== "string") {
    return "Error: plan_manage(action: 'modify') requires 'reason' (string).";
  }
  if (typeof newDescription !== "string") {
    return "Error: plan_manage(action: 'modify') requires 'new_description' (string).";
  }
  const newFiles = Array.isArray(input.new_files)
    ? (input.new_files as string[])
    : undefined;
  const newVerification = typeof input.new_verification === "string"
    ? input.new_verification
    : undefined;
  return manager.modify(sessionId, stepId, {
    reason: reason as string,
    newDescription: newDescription as string,
    newFiles,
    newVerification,
  });
}

// ─── plan_manage dispatcher ──────────────────────────────────────────────────

async function dispatchPlanManage(
  manager: PlanManager,
  sessionId: string,
  input: Record<string, unknown>,
): Promise<string> {
  const action = input.action;
  if (typeof action !== "string" || action.length === 0) {
    return "Error: plan_manage requires an 'action' parameter (string).";
  }

  switch (action) {
    case "enter":
      return executeActionEnter(manager, sessionId, input);
    case "exit":
      return await executeActionExit(manager, sessionId, input);
    case "approve":
      return executeActionApprove(manager, sessionId);
    case "reject":
      return manager.reject(sessionId);
    case "complete":
      return executeActionComplete(manager, sessionId, input);
    case "modify":
      return executeActionModify(manager, sessionId, input);
    default:
      return `Error: unknown action "${action}" for plan_manage. Valid actions: enter, exit, approve, reject, complete, modify`;
  }
}

// ─── plan_step_complete handler ──────────────────────────────────────────────

function executePlanStepComplete(
  manager: PlanManager,
  sessionId: string,
  input: Record<string, unknown>,
): string {
  const stepId = input.step_id;
  const verificationResult = input.verification_result;
  if (typeof stepId !== "number") {
    return "Error: plan_step_complete requires a 'step_id' argument (number).";
  }
  if (typeof verificationResult !== "string") {
    return "Error: plan_step_complete requires a 'verification_result' argument (string).";
  }
  return manager.stepComplete(sessionId, stepId, verificationResult);
}

// ─── Public Executor ─────────────────────────────────────────────────────────

/**
 * Create a tool executor for plan operations.
 *
 * Returns a handler that accepts tool name + args and returns a result string,
 * or `null` if the tool name is not a plan tool (so callers can fall through).
 *
 * @param manager - The PlanManager instance
 * @param sessionId - The session to operate on
 * @returns A tool executor function
 */
export function createPlanToolExecutor(
  manager: PlanManager,
  sessionId: string,
): (name: string, input: Record<string, unknown>) => Promise<string | null> {
  // deno-lint-ignore require-await
  return async (
    name: string,
    input: Record<string, unknown>,
  ): Promise<string | null> => {
    switch (name) {
      case "plan_manage":
        return dispatchPlanManage(manager, sessionId, input);
      case "plan_step_complete":
        return executePlanStepComplete(manager, sessionId, input);
      case "plan_status":
        return manager.status(sessionId);
      default:
        return null;
    }
  };
}

// ─── Validation ──────────────────────────────────────────────────────────────

function parseComplexity(raw: unknown): PlanComplexity {
  const validComplexities = ["small", "medium", "large"];
  return typeof raw === "string" && validComplexities.includes(raw)
    ? (raw as PlanComplexity)
    : "medium";
}

function validatePlanStep(
  rawStep: unknown,
): PlanStep | string {
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
  return {
    id: s.id as number,
    description: s.description as string,
    files: Array.isArray(s.files) ? (s.files as string[]) : [],
    depends_on: Array.isArray(s.depends_on) ? (s.depends_on as number[]) : [],
    verification: typeof s.verification === "string"
      ? (s.verification as string)
      : "",
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

  const steps: PlanStep[] = [];
  for (const rawStep of raw.steps) {
    const result = validatePlanStep(rawStep);
    if (typeof result === "string") return result;
    steps.push(result);
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
    estimated_complexity: parseComplexity(raw.estimated_complexity),
  };
}
