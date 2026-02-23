/**
 * Tool access control and enforcement wrapper.
 *
 * Enforces trigger/non-owner tool ceilings, escalates taint from tool
 * prefixes and response classifications, resolves secret references,
 * and wraps the raw tool executor with the full enforcement pipeline.
 *
 * @module
 */

import type { ClassificationLevel } from "../../core/types/classification.ts";
import { canFlowTo } from "../../core/types/classification.ts";
import { resolveSecretRefs } from "../../core/secrets/resolver.ts";
import type { OrchestratorConfig, ToolExecutor } from "../orchestrator/orchestrator_types.ts";

// ─── Access control checks ──────────────────────────────────────────────────

/** Check trigger tool access ceiling. Returns error message or null. */
export function enforceTriggerToolCeiling(
  name: string,
  ceiling: ClassificationLevel | null,
  toolClassifications:
    | ReadonlyMap<string, ClassificationLevel>
    | undefined,
): string | null {
  if (ceiling === null || !toolClassifications) return null;
  for (const [prefix, level] of toolClassifications) {
    if (name.startsWith(prefix)) {
      if (!canFlowTo(level, ceiling)) {
        return `Error: ${name} (classified ${level}) exceeds trigger ceiling ${ceiling}. Access denied.`;
      }
      break;
    }
  }
  return null;
}

/** Check non-owner tool access ceiling. Returns error message or null. */
export function enforceNonOwnerToolCeiling(
  name: string,
  ceiling: ClassificationLevel | null,
  toolClassifications:
    | ReadonlyMap<string, ClassificationLevel>
    | undefined,
): string | null {
  if (ceiling === null) {
    return `Error: Tool calls are not available in this session.`;
  }
  if (!toolClassifications) return null;
  let matched = false;
  for (const [prefix, level] of toolClassifications) {
    if (name.startsWith(prefix)) {
      matched = true;
      if (!canFlowTo(level, ceiling)) {
        return `Error: ${name} (classified ${level}) exceeds session ceiling ${ceiling}. Access denied.`;
      }
      break;
    }
  }
  if (!matched) {
    return `Error: Tool calls are not available in this session.`;
  }
  return null;
}

/** Escalate session taint when calling a classified tool prefix. */
export function escalateToolPrefixTaint(
  name: string,
  toolClassifications:
    | ReadonlyMap<string, ClassificationLevel>
    | undefined,
  escalateTaint:
    | ((level: ClassificationLevel, reason: string) => void)
    | undefined,
): void {
  if (!toolClassifications || !escalateTaint) return;
  for (const [prefix, level] of toolClassifications) {
    if (name.startsWith(prefix)) {
      escalateTaint(level, `Tool call: ${name}`);
      break;
    }
  }
}

/** Escalate taint from _classification field in tool response JSON. */
export function escalateResponseClassification(
  result: string,
  escalateTaint:
    | ((level: ClassificationLevel, reason: string) => void)
    | undefined,
  toolName: string,
): void {
  if (!escalateTaint) return;
  try {
    const parsed = JSON.parse(result);
    const cls = parsed._classification;
    if (typeof cls === "string") {
      escalateTaint(cls as ClassificationLevel, `Tool response: ${toolName}`);
    }
  } catch {
    /* Not JSON or no _classification — expected for most tools */
  }
}

// ─── Tool executor wrapper ───────────────────────────────────────────────────

/** Enforce access control for trigger and non-owner sessions. */
function enforceAccessControl(
  name: string,
  config: OrchestratorConfig,
): string | null {
  const isActiveTrigger = config.isTriggerSession?.() ?? false;
  if (isActiveTrigger) {
    return enforceTriggerToolCeiling(
      name,
      config.getNonOwnerCeiling?.() ?? null,
      config.toolClassifications,
    );
  }
  if (config.isOwnerSession && !config.isOwnerSession()) {
    return enforceNonOwnerToolCeiling(
      name,
      config.getNonOwnerCeiling?.() ?? null,
      config.toolClassifications,
    );
  }
  return null;
}

/** Resolve secret references in tool input, returning error or resolved input. */
async function resolveToolSecrets(
  input: Record<string, unknown>,
  config: OrchestratorConfig,
): Promise<{ resolved: Record<string, unknown>; error: string | null }> {
  if (!config.secretStore) return { resolved: input, error: null };
  const resolution = await resolveSecretRefs(input, config.secretStore);
  if (!resolution.ok) return { resolved: input, error: null };
  if (resolution.value.missing.length > 0) {
    return {
      resolved: input,
      error:
        `Error: The following secrets were referenced but not found in the secret store: ${
          resolution.value.missing.map((n) => `'${n}'`).join(", ")
        }. Use secret_save to store them first.`,
    };
  }
  return { resolved: resolution.value.resolved, error: null };
}

/** Create the classification-enforcing tool executor wrapper. */
export function wrapToolExecutorWithEnforcement(
  rawToolExecutor: ToolExecutor,
  config: OrchestratorConfig,
): ToolExecutor {
  return async (
    name: string,
    input: Record<string, unknown>,
  ): Promise<string> => {
    const accessErr = enforceAccessControl(name, config);
    if (accessErr) return accessErr;

    escalateToolPrefixTaint(
      name,
      config.toolClassifications,
      config.escalateTaint,
    );

    const { resolved, error } = await resolveToolSecrets(input, config);
    if (error) return error;

    const result = await rawToolExecutor(name, resolved);
    escalateResponseClassification(result, config.escalateTaint, name);
    return result;
  };
}
