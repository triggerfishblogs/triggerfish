/**
 * Secret access gate — classification enforcement for secret access.
 *
 * Classifies the secret path, dispatches to the SECRET_ACCESS hook,
 * and returns the hook decision. Does NOT escalate taint directly —
 * taint escalation is handled by the orchestrator's POST_TOOL_RESPONSE
 * machinery based on the `escalateTo` field in the hook result.
 *
 * @module
 */

import type {
  ClassificationLevel,
  Result,
} from "../../types/classification.ts";
import { canFlowTo } from "../../types/classification.ts";
import { createLogger } from "../../logger/logger.ts";
import type { SecretClassifier } from "./secret_classifier.ts";

const log = createLogger("secrets:access-gate");

/** Input for the SECRET_ACCESS hook. */
export interface SecretAccessHookInput {
  readonly secretName: string;
  readonly provider: string;
  readonly classification: ClassificationLevel;
  readonly sessionTaint: ClassificationLevel;
}

/** Result from the SECRET_ACCESS hook. */
export interface SecretAccessHookResult {
  readonly action: "ALLOW" | "DENY";
  readonly reason?: string;
  readonly escalateTo?: ClassificationLevel;
}

/** Hook dispatcher function type. */
export type SecretAccessHookDispatcher = (
  input: SecretAccessHookInput,
) => Promise<SecretAccessHookResult>;

/** Options for creating a secret access gate. */
export interface SecretAccessGateOptions {
  readonly classifier: SecretClassifier;
  readonly hookDispatcher?: SecretAccessHookDispatcher;
}

/** Access gate interface. */
export interface SecretAccessGate {
  /** Check if secret access is allowed and what taint escalation is needed. */
  readonly checkAccess: (
    secretPath: string,
    provider: string,
    sessionTaint: ClassificationLevel,
  ) => Promise<Result<SecretAccessHookResult, string>>;
}

/**
 * Default hook dispatcher when no custom hook is configured.
 *
 * Allows access if the secret classification can flow to the session taint
 * (meaning the session is already at or above the secret's level).
 * When the secret is above the session taint, allows with escalation.
 */
function defaultHookDispatcher(
  input: SecretAccessHookInput,
): Promise<SecretAccessHookResult> {
  const { classification, sessionTaint } = input;

  if (canFlowTo(classification, sessionTaint)) {
    log.info("Secret access gate: allowed within taint", {
      operation: "defaultHookDispatcher",
      classification,
      sessionTaint,
    });
    return Promise.resolve({ action: "ALLOW" as const });
  }

  log.warn("Secret access gate: escalation required", {
    operation: "defaultHookDispatcher",
    classification,
    sessionTaint,
    escalateTo: classification,
  });
  return Promise.resolve({
    action: "ALLOW" as const,
    escalateTo: classification,
  });
}

/**
 * Create a secret access gate.
 *
 * Classifies the secret path, then dispatches to the SECRET_ACCESS hook
 * (or the default dispatcher) for policy evaluation.
 */
export function createSecretAccessGate(
  options: SecretAccessGateOptions,
): SecretAccessGate {
  const { classifier, hookDispatcher } = options;
  const dispatch = hookDispatcher ?? defaultHookDispatcher;

  return {
    checkAccess: async (secretPath, provider, sessionTaint) => {
      const classification = classifier.classifyPath(secretPath);

      const input: SecretAccessHookInput = {
        secretName: secretPath,
        provider,
        classification,
        sessionTaint,
      };

      const result = await dispatch(input);
      return { ok: true, value: result };
    },
  };
}
