/**
 * Trigger context tools for the agent orchestrator.
 *
 * Provides the `trigger_add_to_context` tool that allows the agent to
 * load the most recent trigger output into the current conversation
 * context, subject to the no-write-down rule.
 *
 * Classification enforcement:
 * - The trigger result's classification must be >= the current session taint.
 * - If the session taint is higher than the trigger classification, adding
 *   the trigger to context would be a write-down violation and is blocked.
 * - If the trigger classification is higher than the session taint, the
 *   session taint escalates to match the trigger classification.
 *
 * @module
 */

import type { ToolDefinition } from "../agent/orchestrator.ts";
import type { ClassificationLevel } from "../core/types/classification.ts";
import { canFlowTo } from "../core/types/classification.ts";
import type { TriggerResult, TriggerStore } from "../scheduler/trigger_store.ts";

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

/** Get the tool definitions for trigger context tools. */
export function getTriggerToolDefinitions(): readonly ToolDefinition[] {
  return [
    {
      name: "trigger_add_to_context",
      description:
        "Add the output of the last trigger run to the current conversation context. " +
        "Blocked if your session taint is higher than the trigger's classification (write-down). " +
        "If the trigger's classification is higher than your session taint, your session taint will escalate.",
      parameters: {
        source: {
          type: "string",
          description:
            "Trigger source identifier. Defaults to 'trigger' (the periodic trigger). " +
            "Use 'cron:<job-id>' for cron jobs or 'webhook:<source-id>' for webhooks.",
          required: false,
        },
      },
    },
  ];
}

/** System prompt section explaining trigger tools to the LLM. */
export const TRIGGER_TOOLS_SYSTEM_PROMPT =
  `## Trigger Context

You can retrieve recent trigger outputs and inject them into the conversation.

- Use \`trigger_add_to_context\` to load the last periodic trigger result into context.
  - The \`source\` parameter defaults to "trigger" (the periodic trigger loop).
  - For cron jobs, use \`source="cron:<job-id>"\`. For webhooks, use \`source="webhook:<source-id>"\`.
- Write-down enforcement applies: if your session taint is higher than the trigger's
  classification, adding it to context is blocked.
- When a trigger is successfully added, its content and classification are visible in context.
- If the trigger's classification exceeds your current session taint, your session taint
  will automatically escalate to match it.`;

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

    const source =
      typeof input.source === "string" && input.source.length > 0
        ? input.source
        : DEFAULT_SOURCE;

    // Retrieve the last result for the requested source
    let result: TriggerResult | null;
    try {
      result = await ctx.triggerStore.getLast(source);
    } catch (err) {
      return `Error retrieving trigger result: ${err instanceof Error ? err.message : String(err)}`;
    }

    if (result === null) {
      return source === DEFAULT_SOURCE
        ? "No trigger result found. The periodic trigger has not fired yet or no output was produced."
        : `No trigger result found for source: ${source}`;
    }

    // Write-down check: session taint must be able to flow to the trigger's classification.
    // canFlowTo(session.taint, trigger.classification) must be true.
    // If session.taint > trigger.classification → write-down → block.
    const currentTaint = ctx.getSessionTaint?.() ?? ctx.sessionTaint;
    if (!canFlowTo(currentTaint, result.classification)) {
      return (
        `Write-down blocked: your session taint is ${currentTaint}, but this trigger result is ` +
        `classified as ${result.classification}. ` +
        `Data cannot flow from ${currentTaint} to ${result.classification}.`
      );
    }

    // Escalate session taint if trigger classification is higher
    if (!canFlowTo(result.classification, currentTaint)) {
      // trigger.classification > currentTaint → escalate
      ctx.escalateTaint?.(result.classification);
    }

    // Format the trigger result for injection into context
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
  };
}
