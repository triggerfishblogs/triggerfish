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

export { createHookRunner } from "./hooks/mod.ts";
export { createDefaultRules } from "./hooks/mod.ts";
export type {
  HookContext,
  HookResult,
  HookLogger,
  HookLogEntry,
  HookRunnerOptions,
  HookRunner,
} from "./hooks/mod.ts";

export { createAuditChain, verifyAuditChain } from "./audit/mod.ts";
export type {
  AuditEntry,
  ChainedAuditEntry,
  AuditChain,
} from "./audit/mod.ts";

export { effectiveClassification } from "./recipient.ts";
