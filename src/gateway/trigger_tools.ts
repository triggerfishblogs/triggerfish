/**
 * Trigger context tools for the agent orchestrator.
 *
 * Provides:
 * - `trigger_add_to_context` — loads the most recent trigger output into the
 *   current conversation context, subject to the no-write-down rule.
 * - `get_tool_classification` — returns the classification level of one or more
 *   tools so that trigger sessions can order their work from lowest to highest
 *   classification, avoiding write-down violations mid-session.
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

/** Classification level ordering for sorting (lower number = lower classification). */
const CLASSIFICATION_ORDER: Readonly<Record<string, number>> = {
  PUBLIC: 0,
  INTERNAL: 1,
  CONFIDENTIAL: 2,
  RESTRICTED: 3,
};

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
    {
      name: "get_tool_classification",
      description:
        "Look up the classification level of one or more tools. " +
        "In trigger sessions, call this before executing your planned tool calls to determine " +
        "the correct order (lowest to highest classification). " +
        "Built-in tools (exec, memory, web, etc.) are PUBLIC. " +
        "Integration tools (gmail_, calendar_, github_, etc.) have their configured classification.",
      parameters: {
        tools: {
          type: "array",
          items: { type: "string" },
          description:
            "List of tool names to classify. Returns classifications and recommended call order.",
          required: true,
        },
      },
    },
  ];
}

/** Get trigger tool definitions for the main (user) session — only trigger_add_to_context. */
export function getTriggerContextToolDefinitions(): readonly ToolDefinition[] {
  return getTriggerToolDefinitions().filter((t) => t.name === "trigger_add_to_context");
}

/** System prompt section explaining trigger_add_to_context to the user-session LLM. */
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
 * System prompt section for trigger sessions — explains classification-ordered execution.
 *
 * Injected into the orchestrator system prompt when isTriggerSession is true.
 * Instructs the agent to call get_tool_classification first and order its work
 * from lowest to highest classification to avoid write-down violations mid-session.
 */
export const TRIGGER_SESSION_SYSTEM_PROMPT =
  `## Trigger Session — Classification-Ordered Execution

You are running in a trigger session. Your session taint starts at PUBLIC and escalates as you call classified tools. Calling a lower-classified tool AFTER a higher-classified one is blocked as a write-down violation.

**Required protocol before calling any integration tools (gmail_, calendar_, drive_, github_, etc.):**

1. **Identify all tools** you plan to call in this session.
2. **Call \`get_tool_classification\`** with your full list of planned tools to get their classification levels.
3. **Order your work from lowest to highest classification** — PUBLIC first, then INTERNAL, then CONFIDENTIAL, then RESTRICTED.
4. **Execute in order** — your session taint escalates naturally. Your final session taint reflects the highest classification you accessed.

Your output is stored in the trigger store and stamped with your final session taint. The owner can then optionally pull it into their session via \`trigger_add_to_context\`, at which point their session taint may escalate to match yours.

If you skip classification ordering and call a higher-classified tool before a lower one, subsequent lower-classified calls will be blocked by write-down enforcement. Always call \`get_tool_classification\` first.

**Notification policy — CRITICAL:**

You are a background process. The owner does NOT want to hear from you unless you found something worth reporting. After checking the items in your instructions:

- If there is **nothing actionable or noteworthy**, respond with exactly \`NO_ACTION\` and nothing else. Do NOT say "nothing to report", "all clear", or any variation — just \`NO_ACTION\`.
- If there **is** something worth reporting (urgent email, upcoming meeting, important message, etc.), respond with a concise summary of ONLY the relevant findings.
- Never pad your response with filler like "I checked your email and calendar and found nothing." That is noise, not signal.`;

/**
 * Create a tool executor for the `get_tool_classification` tool.
 *
 * Accepts a tool-prefix → classification map (the same map used by the
 * orchestrator for enforcement). Given a list of tool names, returns their
 * classification levels and a recommended call order (lowest → highest).
 * Built-in tools not in the map are returned as PUBLIC.
 *
 * This executor is intended for trigger sessions so the agent can plan its
 * work order before calling any tools, avoiding mid-session write-down blocks.
 *
 * Returns null for unrecognised tool names (allowing chaining with other executors).
 *
 * @param toolClassifications - Map of tool prefix → classification level.
 * @returns An executor function: (name, input) => Promise<string | null>
 */
export function createTriggerClassificationToolExecutor(
  toolClassifications: ReadonlyMap<string, ClassificationLevel>,
): (name: string, input: Record<string, unknown>) => Promise<string | null> {
  return async (
    name: string,
    input: Record<string, unknown>,
  ): Promise<string | null> => {
    if (name !== "get_tool_classification") return null;

    const rawTools = input.tools;
    const toolNames: string[] = Array.isArray(rawTools)
      ? rawTools.filter((t): t is string => typeof t === "string")
      : typeof rawTools === "string"
      ? [rawTools]
      : [];

    if (toolNames.length === 0) {
      return "Error: 'tools' parameter must be a non-empty array of tool names.";
    }

    const classifications: Array<{ tool: string; classification: ClassificationLevel }> = [];

    for (const toolName of toolNames) {
      let found = false;
      for (const [prefix, level] of toolClassifications) {
        if (toolName.startsWith(prefix)) {
          classifications.push({ tool: toolName, classification: level });
          found = true;
          break;
        }
      }
      if (!found) {
        // Built-in tools not in the classification map are ungated (PUBLIC).
        classifications.push({ tool: toolName, classification: "PUBLIC" as ClassificationLevel });
      }
    }

    // Sort by classification level: lowest first so the recommended order is
    // safe to execute top-to-bottom without write-down violations.
    const sorted = [...classifications].sort(
      (a, b) =>
        (CLASSIFICATION_ORDER[a.classification] ?? 0) -
        (CLASSIFICATION_ORDER[b.classification] ?? 0),
    );

    const result = {
      classifications,
      recommended_order: sorted.map((c) => ({ tool: c.tool, classification: c.classification })),
      instruction:
        "Execute tools in the recommended_order sequence (lowest classification first). " +
        "Your session taint escalates as you call higher-classified tools. " +
        "Calling a lower-classified tool after a higher-classified one will be blocked.",
    };

    return JSON.stringify(result, null, 2);
  };
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
