/**
 * Explore tool — structured codebase understanding via parallel sub-agents.
 *
 * Spawns focused sub-agents to investigate different facets of a codebase
 * (tree structure, patterns, dependencies, focus areas), then assembles
 * their findings into a unified ExploreResult.
 *
 * Types, tool definitions, and system prompt live in `tools_defs.ts`.
 * Prompt builders live in `prompts.ts`.
 * Parsing/extraction logic lives in `parsers.ts`.
 * Result assembly lives in `assembly.ts`.
 * Executor factory lives in `executor.ts`.
 *
 * @module
 */

// ─── Re-exports from tools_defs.ts ─────────────────────────────────────────

export {
  EXPLORE_SYSTEM_PROMPT,
  getExploreToolDefinitions,
} from "./tools_defs.ts";
export type {
  ExploreDepth,
  ExploreResult,
  KeyFile,
  Pattern,
} from "./tools_defs.ts";

// ─── Re-exports from prompts.ts ────────────────────────────────────────────

export { buildAgentTasks } from "./prompts.ts";
export type { AgentTask } from "./prompts.ts";

// ─── Re-exports from parsers.ts ────────────────────────────────────────────

export { extractKeyFiles, extractPatterns, truncateTree } from "./parsers.ts";

// ─── Re-exports from assembly.ts ───────────────────────────────────────────

export { assembleResult, buildTemplateSummary } from "./assembly.ts";

// ─── Re-exports from executor.ts ───────────────────────────────────────────

export { createExploreToolExecutor } from "./executor.ts";
export type { ExploreExecutorOptions } from "./executor.ts";

// ─── Re-exports from budget.ts ────────────────────────────────────────────

export { computeExploreIterationBudget } from "./budget.ts";
