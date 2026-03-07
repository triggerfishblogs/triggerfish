/**
 * SECRET_ACCESS hook handler.
 *
 * Evaluates policy rules when a secret is accessed. Determines
 * whether access is allowed and what taint escalation is needed.
 *
 * @module
 */

import type { ClassificationLevel } from "../../types/classification.ts";
import { canFlowTo } from "../../types/classification.ts";
import type {
  SecretAccessHookInput,
  SecretAccessHookResult,
} from "../../secrets/classification/secret_access_gate.ts";

/** Policy rule for SECRET_ACCESS evaluation. */
export interface SecretAccessPolicyRule {
  readonly name: string;
  /** Condition expression evaluated against input context. */
  readonly condition: (input: SecretAccessHookInput & {
    readonly isBackground: boolean;
  }) => boolean;
  readonly action: "ALLOW" | "DENY";
  readonly reason?: string;
}

/**
 * Evaluate SECRET_ACCESS policy rules against the access request.
 *
 * Rules are evaluated in order. First matching rule wins.
 * If no rule matches, the default behavior applies:
 * - Allow access, escalate taint if secret classification > session taint.
 *
 * @param input - Secret access context
 * @param rules - Ordered list of policy rules
 * @param isBackground - Whether this is a background session
 */
export function evaluateSecretAccessPolicy(
  input: SecretAccessHookInput,
  rules: readonly SecretAccessPolicyRule[],
  isBackground: boolean,
): SecretAccessHookResult {
  const context = { ...input, isBackground };

  for (const rule of rules) {
    if (rule.condition(context)) {
      if (rule.action === "DENY") {
        return {
          action: "DENY",
          reason: rule.reason ?? `Denied by rule: ${rule.name}`,
        };
      }
      break;
    }
  }

  if (canFlowTo(input.classification, input.sessionTaint)) {
    return { action: "ALLOW" };
  }

  return {
    action: "ALLOW",
    escalateTo: input.classification,
  };
}

/**
 * Create default SECRET_ACCESS rules.
 *
 * Default rules:
 * 1. Deny RESTRICTED access from background sessions
 */
export function createDefaultSecretAccessRules(): SecretAccessPolicyRule[] {
  return [
    {
      name: "deny_restricted_in_background",
      condition: (ctx) =>
        ctx.classification === "RESTRICTED" && ctx.isBackground,
      action: "DENY",
      reason: "Background sessions cannot access RESTRICTED secrets",
    },
  ];
}
