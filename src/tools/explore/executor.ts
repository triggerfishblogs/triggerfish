/**
 * Explore tool executor — single-agent codebase exploration.
 *
 * Spawns one subagent with a depth-aware prompt. Before spawning,
 * runs a deterministic pre-flight directory listing to compute an
 * adaptive iteration budget — no LLM involvement in the budget decision.
 *
 * @module
 */

import type { ExploreDepth } from "./tools_defs.ts";
import { buildExplorePrompt } from "./prompts.ts";
import { computeExploreIterationBudget } from "./budget.ts";
import { createLogger } from "../../core/logger/logger.ts";

const log = createLogger("explore-executor");

/** Options for creating an explore tool executor. */
export interface ExploreExecutorOptions {
  /** Function to spawn a sub-agent with a task prompt. */
  readonly spawnSubagent: (
    task: string,
    tools?: string,
    spawnOpts?: { readonly maxIterations?: number },
  ) => Promise<string>;
  /**
   * Pre-flight directory listing function.
   * Returns newline-separated entry names on success, null on failure.
   */
  readonly preflightListDirectory?: (path: string) => Promise<string | null>;
}

/** Count entries from a newline-separated directory listing string. */
function countDirectoryEntries(listing: string): number | null {
  if (listing === "(empty directory)") return 0;
  const lines = listing.split("\n").filter((l) => l.length > 0);
  return lines.length > 0 ? lines.length : null;
}

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
 * multiple parallel agents. Before spawning, runs a deterministic
 * pre-flight directory listing to compute an adaptive iteration budget.
 *
 * @param options - Explore executor configuration
 * @returns Tool executor that handles `explore` tool calls
 */
export function createExploreToolExecutor(
  options: ExploreExecutorOptions,
): (name: string, input: Record<string, unknown>) => Promise<string | null> {
  const { spawnSubagent, preflightListDirectory } = options;

  return async (
    name: string,
    input: Record<string, unknown>,
  ): Promise<string | null> => {
    if (name !== "explore") return null;

    const parsed = parseExploreInput(input);
    if (!parsed) {
      return "Error: explore requires a non-empty 'path' argument (string).";
    }

    const entryCount = await resolveEntryCount(
      parsed.path,
      preflightListDirectory,
    );
    const budget = computeExploreIterationBudget(entryCount, parsed.depth);

    log.info("Explore iteration budget computed", {
      operation: "createExploreToolExecutor",
      path: parsed.path,
      depth: parsed.depth,
      entryCount,
      budget,
    });

    const prompt = buildExplorePrompt(parsed.path, parsed.depth, parsed.focus);
    try {
      return await spawnSubagent(prompt, undefined, {
        maxIterations: budget,
      });
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

/** Run pre-flight listing and extract entry count, returning null on failure. */
async function resolveEntryCount(
  path: string,
  preflightListDirectory?: (path: string) => Promise<string | null>,
): Promise<number | null> {
  if (!preflightListDirectory) return null;
  try {
    const listing = await preflightListDirectory(path);
    if (listing === null) return null;
    return countDirectoryEntries(listing);
  } catch {
    return null;
  }
}
