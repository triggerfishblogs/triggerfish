/**
 * Workflow version validation — config immutability enforcement for
 * self-healing version proposals.
 *
 * Ensures the lead agent cannot modify the self_healing config block
 * when proposing workflow changes.
 * @module
 */

import type { ClassificationLevel } from "../../core/types/classification.ts";
import { createLogger } from "../../core/logger/logger.ts";
import type { ParseResult } from "../parser.ts";
import { err, ok, parseWorkflowYaml } from "../parser.ts";
import type { WorkflowStore } from "../store.ts";

const log = createLogger("workflow-version-validation");

/** Validate that a self-healing proposal does not modify the config block. */
export async function validateConfigImmutability(
  workflowStore: WorkflowStore,
  workflowName: string,
  proposedDefinition: string,
  sessionTaint: ClassificationLevel,
): Promise<ParseResult<void>> {
  const canonical = await workflowStore.loadWorkflowDefinition(
    workflowName,
    sessionTaint,
  );
  if (!canonical) return ok(undefined);

  const canonicalConfig = extractSelfHealingBlock(canonical.yaml);
  const proposedConfig = extractSelfHealingBlock(proposedDefinition);

  if (JSON.stringify(canonicalConfig) !== JSON.stringify(proposedConfig)) {
    log.warn("Self-healing config mutation rejected in version proposal", {
      operation: "validateConfigImmutability",
      workflowName,
    });
    return err(
      `Workflow version rejected: self_healing config block must not be modified by lead agent`,
    );
  }

  return ok(undefined);
}

/** Extract the self_healing block from a workflow YAML string. */
export function extractSelfHealingBlock(yaml: string): unknown {
  const parsed = parseWorkflowYaml(yaml);
  if (!parsed.ok) return null;
  const meta = parsed.value.metadata;
  if (!meta) return null;
  const tf = meta["triggerfish"];
  if (typeof tf !== "object" || tf === null) return null;
  return (tf as Record<string, unknown>)["self_healing"] ?? null;
}
