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

export { createHookRunner } from "./hook_runner.ts";
export { createDefaultRules } from "./default_rules.ts";
export type {
  HookContext,
  HookResult,
  HookLogger,
  HookLogEntry,
  HookRunnerOptions,
  HookRunner,
} from "./hook_types.ts";

export { createAuditChain, verifyAuditChain } from "./audit.ts";
export type {
  AuditEntry,
  ChainedAuditEntry,
  AuditChain,
} from "./audit.ts";

export { effectiveClassification } from "./recipient.ts";
