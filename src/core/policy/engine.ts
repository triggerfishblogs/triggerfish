/**
 * Policy engine core — evaluates rules against context at enforcement hooks.
 *
 * The engine is deterministic: same input always produces the same decision.
 * No randomness, no LLM calls, no side effects.
 *
 * @module
 */

import { parse as parseYaml } from "@std/yaml";
import type {
  ConditionOperator,
  HookType,
  PolicyAction,
  PolicyCondition,
  PolicyRule,
} from "./rules.ts";
import { createLogger } from "../logger/logger.ts";

const log = createLogger("policy");

/** Result of evaluating policy rules against a context. */
export interface EvaluationResult {
  readonly action: PolicyAction;
  readonly ruleId?: string;
  readonly message?: string;
}

/** Policy engine interface for rule management and evaluation. */
export interface PolicyEngine {
  /** Add a rule to the engine. */
  addRule(rule: PolicyRule): void;
  /** Remove a rule by ID. */
  removeRule(id: string): void;
  /** Get all rules for a specific hook type, sorted by priority descending. */
  getRules(hook: HookType): PolicyRule[];
  /** Evaluate rules against a context. First matching rule wins. Default: ALLOW. */
  evaluate(hook: HookType, context: Record<string, unknown>): EvaluationResult;
  /** Load rules from a YAML string. */
  loadYaml(yamlString: string): void;
}

/**
 * Evaluate a single condition against a context value.
 *
 * @returns true if the condition is satisfied
 */
function evaluateCondition(
  condition: PolicyCondition,
  contextValue: unknown,
): boolean {
  const { operator, value } = condition;

  // If the field is not present in context, condition fails
  if (contextValue === undefined) return false;

  return compareValues(operator, contextValue, value);
}

/**
 * Compare a context value against a condition value using the given operator.
 */
function compareValues(
  operator: ConditionOperator,
  contextValue: unknown,
  conditionValue: string | number,
): boolean {
  switch (operator) {
    case "equals":
      return String(contextValue) === String(conditionValue);
    case "not_equals":
      return String(contextValue) !== String(conditionValue);
    case "gt":
      return Number(contextValue) > Number(conditionValue);
    case "lt":
      return Number(contextValue) < Number(conditionValue);
    case "gte":
      return Number(contextValue) >= Number(conditionValue);
    case "lte":
      return Number(contextValue) <= Number(conditionValue);
    case "contains":
      return String(contextValue).includes(String(conditionValue));
    case "matches": {
      const regex = new RegExp(String(conditionValue));
      return regex.test(String(contextValue));
    }
  }
}

/** YAML policy file structure for parsing. */
interface YamlPolicy {
  readonly rules: readonly YamlRule[];
}

/** A rule as represented in YAML before normalization. */
interface YamlRule {
  readonly id: string;
  readonly priority: number;
  readonly hook: string;
  readonly conditions: readonly YamlCondition[];
  readonly action: string;
  readonly message?: string;
  readonly redaction_pattern?: string;
  readonly notify?: boolean;
}

/** A condition as represented in YAML. */
interface YamlCondition {
  readonly field: string;
  readonly operator: string;
  readonly value: string | number;
}

/**
 * Create a new policy engine instance.
 *
 * The engine stores rules and evaluates them deterministically against
 * context objects at specified enforcement hooks.
 */
export function createPolicyEngine(): PolicyEngine {
  const rules: PolicyRule[] = [];

  function addRule(rule: PolicyRule): void {
    rules.push(rule);
  }

  function removeRule(id: string): void {
    const index = rules.findIndex((r) => r.id === id);
    if (index !== -1) {
      rules.splice(index, 1);
    }
  }

  function getRules(hook: HookType): PolicyRule[] {
    return rules
      .filter((r) => r.hook === hook)
      .sort((a, b) => b.priority - a.priority);
  }

  function evaluate(
    hook: HookType,
    context: Record<string, unknown>,
  ): EvaluationResult {
    const hookRules = getRules(hook);

    for (const rule of hookRules) {
      const allConditionsMet = rule.conditions.every((condition) =>
        evaluateCondition(condition, context[condition.field])
      );

      if (allConditionsMet) {
        if (rule.action === "BLOCK") {
          log.warn("Policy rule blocked action", {
            hook,
            ruleId: rule.id,
            message: rule.message,
          });
        }
        return {
          action: rule.action,
          ruleId: rule.id,
          message: rule.message,
        };
      }
    }

    return { action: "ALLOW" };
  }

  function loadYaml(yamlString: string): void {
    const parsed = parseYaml(yamlString) as YamlPolicy;
    if (!parsed || !parsed.rules) return;

    for (const yamlRule of parsed.rules) {
      const rule: PolicyRule = {
        id: yamlRule.id,
        priority: yamlRule.priority,
        hook: yamlRule.hook as HookType,
        conditions: (yamlRule.conditions ?? []).map((c) => ({
          field: c.field,
          operator: c.operator as ConditionOperator,
          value: c.value,
        })),
        action: yamlRule.action as PolicyAction,
        message: yamlRule.message,
        redaction_pattern: yamlRule.redaction_pattern,
        notify: yamlRule.notify,
      };
      addRule(rule);
    }
  }

  return { addRule, removeRule, getRules, evaluate, loadYaml };
}
