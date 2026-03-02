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
  HookLogEntry,
  HookLogger,
  HookResult,
  HookRunner,
  HookRunnerOptions,
} from "./hooks/mod.ts";

export { createAuditChain, verifyAuditChain } from "./audit/mod.ts";
export type { AuditChain, AuditEntry, ChainedAuditEntry } from "./audit/mod.ts";

export { effectiveClassification } from "./recipient.ts";
