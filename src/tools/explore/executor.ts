/**
 * Explore tool executor — single-agent codebase exploration.
 *
 * Spawns one subagent with a depth-aware prompt. The agent
 * explores using read-only tools and returns findings directly.
 *
 * @module
 */

import type { ExploreDepth } from "./tools_defs.ts";
import { buildExplorePrompt } from "./prompts.ts";
import { createLogger } from "../../core/logger/logger.ts";

const log = createLogger("explore-executor");

/** Parse and validate explore tool input parameters. */
function parseExploreInput(input: Record<string, unknown>): {
  readonly path: string;
  readonly depth: ExploreDepth;
  readonly focus?: string;
} | null {
  const path = input.path;
  if (typeof path !== "string" || path.length === 0) return null;
  const focus = typeof input.focus === "string" && input.focus.length > 0
    ? input.focus
    : undefined;
  const rawDepth = typeof input.depth === "string" ? input.depth : "standard";
  const depth: ExploreDepth = rawDepth === "shallow" || rawDepth === "deep"
    ? rawDepth
    : "standard";
  return { path, depth, focus };
}

/**
 * Create an explore tool executor.
 *
 * Spawns a single subagent with a comprehensive prompt instead of
 * multiple parallel agents. The subagent uses read-only tools to
 * explore the directory and returns its findings as text.
 *
 * @param spawnSubagent - Function to spawn a sub-agent with a task prompt
 * @returns Tool executor that handles `explore` tool calls
 */
export function createExploreToolExecutor(
  spawnSubagent: (task: string) => Promise<string>,
): (name: string, input: Record<string, unknown>) => Promise<string | null> {
  return async (
    name: string,
    input: Record<string, unknown>,
  ): Promise<string | null> => {
    if (name !== "explore") return null;

    const parsed = parseExploreInput(input);
    if (!parsed) {
      return "Error: explore requires a non-empty 'path' argument (string).";
    }

    const prompt = buildExplorePrompt(parsed.path, parsed.depth, parsed.focus);
    try {
      return await spawnSubagent(prompt);
    } catch (err) {
      log.warn("Explore subagent failed", {
        operation: "createExploreToolExecutor",
        path: parsed.path,
        depth: parsed.depth,
        err,
      });
      return `Explore agent error: ${
        err instanceof Error ? err.message : String(err)
      }`;
    }
  };
}
