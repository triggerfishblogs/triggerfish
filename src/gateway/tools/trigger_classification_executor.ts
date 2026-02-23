/**
 * Classification lookup executor for trigger sessions.
 *
 * Given a tool-prefix to classification map, resolves classification levels
 * for a list of tool names and returns a recommended execution order
 * (lowest classification first) to avoid mid-session write-down violations.
 *
 * Built-in tools not in the classification map default to PUBLIC.
 *
 * @module
 */

import type { ClassificationLevel } from "../../core/types/classification.ts";

/** Classification level ordering for sorting (lower number = lower classification). */
const CLASSIFICATION_ORDER: Readonly<Record<string, number>> = {
  PUBLIC: 0,
  INTERNAL: 1,
  CONFIDENTIAL: 2,
  RESTRICTED: 3,
};

/** Classify a single tool name against the prefix map. */
function classifyToolName(
  toolName: string,
  toolClassifications: ReadonlyMap<string, ClassificationLevel>,
): ClassificationLevel {
  for (const [prefix, level] of toolClassifications) {
    if (toolName.startsWith(prefix)) {
      return level;
    }
  }
  // Built-in tools not in the classification map are ungated (PUBLIC).
  return "PUBLIC" as ClassificationLevel;
}

/** Parse and validate the raw `tools` input parameter. */
function parseToolNames(rawTools: unknown): string[] {
  if (Array.isArray(rawTools)) {
    return rawTools.filter((t): t is string => typeof t === "string");
  }
  if (typeof rawTools === "string") {
    return [rawTools];
  }
  return [];
}

/** Sort classifications from lowest to highest for safe execution order. */
function sortByClassificationLevel(
  items: ReadonlyArray<{ tool: string; classification: ClassificationLevel }>,
): Array<{ tool: string; classification: ClassificationLevel }> {
  return [...items].sort(
    (a, b) =>
      (CLASSIFICATION_ORDER[a.classification] ?? 0) -
      (CLASSIFICATION_ORDER[b.classification] ?? 0),
  );
}

/** Format the classification result as a JSON response string. */
function formatClassificationResponse(
  classifications: Array<{ tool: string; classification: ClassificationLevel }>,
): string {
  const sorted = sortByClassificationLevel(classifications);
  const result = {
    classifications,
    recommended_order: sorted.map((c) => ({
      tool: c.tool,
      classification: c.classification,
    })),
    instruction:
      "Execute tools in the recommended_order sequence (lowest classification first). " +
      "Your session taint escalates as you call higher-classified tools. " +
      "Calling a lower-classified tool after a higher-classified one will be blocked.",
  };
  return JSON.stringify(result, null, 2);
}

/**
 * Create a tool executor for the `get_tool_classification` tool.
 *
 * Returns null for unrecognised tool names (allowing chaining with other executors).
 *
 * @param toolClassifications - Map of tool prefix to classification level.
 * @returns An executor function: (name, input) => Promise<string | null>
 */
export function createTriggerClassificationToolExecutor(
  toolClassifications: ReadonlyMap<string, ClassificationLevel>,
): (name: string, input: Record<string, unknown>) => Promise<string | null> {
  // deno-lint-ignore require-await
  return async (
    name: string,
    input: Record<string, unknown>,
  ): Promise<string | null> => {
    if (name !== "get_tool_classification") return null;

    const toolNames = parseToolNames(input.tools);
    if (toolNames.length === 0) {
      return "Error: 'tools' parameter must be a non-empty array of tool names.";
    }

    const classifications = toolNames.map((toolName) => ({
      tool: toolName,
      classification: classifyToolName(toolName, toolClassifications),
    }));

    return formatClassificationResponse(classifications);
  };
}
