/**
 * Explore module — structured codebase understanding via parallel sub-agents.
 *
 * @module
 */

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

export { buildAgentTasks } from "./prompts.ts";
export type { AgentTask } from "./prompts.ts";

export { extractKeyFiles, extractPatterns, truncateTree } from "./parsers.ts";

export { assembleResult, buildTemplateSummary } from "./assembly.ts";

export { createExploreToolExecutor } from "./executor.ts";
