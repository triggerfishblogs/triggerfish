/**
 * Policy engine module — deterministic rule evaluation for enforcement hooks.
 *
 * @module
 */

export type {
  ConditionOperator,
  HookType,
  PolicyAction,
  PolicyCondition,
  PolicyRule,
} from "./rules.ts";

export { createPolicyEngine } from "./engine.ts";
export type { EvaluationResult, PolicyEngine } from "./engine.ts";

export { createHookRunner, createDefaultRules } from "./hooks.ts";
export type {
  HookContext,
  HookResult,
  HookLogger,
  HookLogEntry,
  HookRunnerOptions,
  HookRunner,
} from "./hooks.ts";
