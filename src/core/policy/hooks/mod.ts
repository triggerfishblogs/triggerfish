/**
 * Enforcement hooks — type definitions, violation detectors, runner, and default rules.
 *
 * @module
 */

export type {
  HookContext,
  HookLogger,
  HookLogEntry,
  HookResult,
  HookRunner,
  HookRunnerOptions,
} from "./hook_types.ts";

export {
  detectWriteDownViolation,
  detectToolFloorViolation,
  detectResourceWriteDownViolation,
  detectResourceReadCeilingViolation,
  buildEvaluationContext,
} from "./hook_violations.ts";

export { createHookRunner } from "./hook_runner.ts";
export { createDefaultRules } from "./default_rules.ts";
