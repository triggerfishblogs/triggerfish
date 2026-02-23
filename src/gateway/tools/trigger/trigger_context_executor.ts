/**
 * Trigger context executor — loads trigger output into conversation context.
 *
 * Handles the `trigger_add_to_context` tool which retrieves the most recent
 * trigger result from the store and injects it into the current session,
 * subject to the no-write-down classification rule.
 *
 * Classification enforcement:
 * - The trigger result's classification must be >= the current session taint.
 * - If the session taint is higher than the trigger classification, the
 *   request is blocked as a write-down violation.
 * - If the trigger classification is higher than the session taint, the
 *   session taint escalates to match.
 *
 * @module
 */

import type { ClassificationLevel } from "../../../core/types/classification.ts";
import { canFlowTo } from "../../../core/types/classification.ts";
import type {
  TriggerResult,
  TriggerStore,
} from "../../../scheduler/triggers/store.ts";
import { createLogger } from "../../../core/logger/logger.ts";

const log = createLogger("security");

/** Context required by trigger tool executors. */
export interface TriggerToolContext {
  /** Store holding the last result for each trigger source. */
  readonly triggerStore: TriggerStore;
  /** Current session taint level (injected, never from LLM). */
  readonly sessionTaint: ClassificationLevel;
  /**
   * Live taint getter — returns current session taint (reflects escalation).
   * Falls back to sessionTaint if not provided.
   */
  readonly getSessionTaint?: () => ClassificationLevel;
  /**
   * Callback to escalate session taint when a trigger of higher
   * classification is loaded into context.
   */
  readonly escalateTaint?: (level: ClassificationLevel) => void;
}

/** Default trigger source used when none is specified. */
const DEFAULT_SOURCE = "trigger";

/** Resolve the source parameter from the tool input. */
function resolveSourceParam(input: Record<string, unknown>): string {
  return typeof input.source === "string" && input.source.length > 0
    ? input.source
    : DEFAULT_SOURCE;
}

/** Retrieve the trigger result from the store, returning an error string on failure. */
async function fetchTriggerResult(
  store: TriggerStore,
  source: string,
): Promise<TriggerResult | string> {
  try {
    const result = await store.getLast(source);
    if (result === null) {
      return source === DEFAULT_SOURCE
        ? "No trigger result found. The periodic trigger has not fired yet or no output was produced."
        : `No trigger result found for source: ${source}`;
    }
    return result;
  } catch (err) {
    return `Error retrieving trigger result: ${
      err instanceof Error ? err.message : String(err)
    }`;
  }
}

/** Check write-down rule and return an error message if blocked, or null if allowed. */
function enforceWriteDownRule(
  currentTaint: ClassificationLevel,
  triggerClassification: ClassificationLevel,
  source: string,
): string | null {
  if (!canFlowTo(currentTaint, triggerClassification)) {
    log.warn("Trigger context write-down blocked", {
      source,
      sessionTaint: currentTaint,
      triggerClassification,
    });
    return (
      `Write-down blocked: your session taint is ${currentTaint}, but this trigger result is ` +
      `classified as ${triggerClassification}. ` +
      `Data cannot flow from ${currentTaint} to ${triggerClassification}.`
    );
  }
  return null;
}

/** Escalate session taint if the trigger classification is higher. */
function applyTaintEscalation(
  ctx: TriggerToolContext,
  currentTaint: ClassificationLevel,
  result: TriggerResult,
  source: string,
): void {
  if (!canFlowTo(result.classification, currentTaint)) {
    log.warn("Trigger context escalating session taint", {
      source,
      from: currentTaint,
      to: result.classification,
    });
    ctx.escalateTaint?.(result.classification);
  }
}

/** Format the trigger result for injection into conversation context. */
function formatTriggerOutput(result: TriggerResult): string {
  const firedAt = result.firedAt
    ? new Date(result.firedAt).toLocaleString()
    : "unknown time";

  return (
    `[Trigger output loaded into context]\n` +
    `Source: ${result.source}\n` +
    `Classification: ${result.classification}\n` +
    `Fired at: ${firedAt}\n\n` +
    result.message
  );
}

/**
 * Create a tool executor for trigger context tools.
 *
 * Returns null for unrecognised tool names (allowing chaining with other
 * executors). All classification checks use the injected context, never
 * LLM-supplied values.
 *
 * @param ctx - Trigger tool context
 * @returns An executor function: (name, input) => Promise<string | null>
 */
export function createTriggerToolExecutor(
  ctx: TriggerToolContext | undefined,
): (name: string, input: Record<string, unknown>) => Promise<string | null> {
  return async (
    name: string,
    input: Record<string, unknown>,
  ): Promise<string | null> => {
    if (name !== "trigger_add_to_context") return null;

    if (!ctx) {
      return "Trigger context tools are not available in this context.";
    }

    const source = resolveSourceParam(input);
    const fetchResult = await fetchTriggerResult(ctx.triggerStore, source);
    if (typeof fetchResult === "string") return fetchResult;

    const currentTaint = ctx.getSessionTaint?.() ?? ctx.sessionTaint;
    const writeDownError = enforceWriteDownRule(
      currentTaint,
      fetchResult.classification,
      source,
    );
    if (writeDownError) return writeDownError;

    applyTaintEscalation(ctx, currentTaint, fetchResult, source);
    return formatTriggerOutput(fetchResult);
  };
}
