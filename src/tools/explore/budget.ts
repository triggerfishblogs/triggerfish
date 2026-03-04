/**
 * Explore iteration budget heuristic.
 *
 * Pure function that computes the iteration budget for an explore
 * subagent based on directory entry count and requested depth.
 * No LLM involvement — deterministic code decides the budget.
 *
 * @module
 */

import type { ExploreDepth } from "./tools_defs.ts";

/** Default budget when preflight is unavailable. */
const DEFAULT_BUDGET = 5;

/** Maximum budget cap for deep exploration. */
const MAX_BUDGET = 12;

/** Compute base iteration budget from directory entry count. */
function computeBaseBudget(entryCount: number): number {
  if (entryCount <= 5) return 3;
  if (entryCount <= 15) return 5;
  if (entryCount <= 30) return 7;
  return 10;
}

/**
 * Compute the iteration budget for an explore subagent.
 *
 * @param entryCount - Number of entries in the target directory, or null if preflight failed
 * @param depth - Requested exploration depth
 * @returns Iteration budget (minimum 3, maximum 12)
 */
export function computeExploreIterationBudget(
  entryCount: number | null,
  depth: ExploreDepth,
): number {
  if (entryCount === null) return DEFAULT_BUDGET;

  if (depth === "shallow") return 3;

  const base = computeBaseBudget(entryCount);

  if (depth === "deep") return Math.min(base + 3, MAX_BUDGET);

  return base;
}
