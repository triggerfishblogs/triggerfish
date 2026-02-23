/**
 * Plan mode subsystem: structured planning before code changes.
 *
 * @module
 */

export type {
  PlanManager,
  PlanManagerOptions,
} from "./plan_types.ts";

export {
  createPlanManager,
} from "./plan.ts";

export {
  createPlanToolExecutor,
} from "./executor.ts";

export type {
  AgentMode,
  PlanModeState,
  ActivePlan,
  ImplementationPlan,
  PlanStep,
  PlanComplexity,
  PlanStatus,
  PlanRecord,
} from "./types.ts";

export {
  DEFAULT_PLAN_STATE,
  PLAN_BLOCKED_TOOLS,
  PLAN_ALLOWED_TOOLS,
} from "./types.ts";

export {
  buildPlanModePrompt,
  buildAwaitingApprovalPrompt,
  buildPlanExecutionPrompt,
  formatPlanAsMarkdown,
} from "./prompt.ts";

export {
  getPlanToolDefinitions,
  PLAN_SYSTEM_PROMPT,
} from "./tools.ts";
