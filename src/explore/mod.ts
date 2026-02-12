/**
 * Explore module — structured codebase understanding via parallel sub-agents.
 *
 * @module
 */

export {
  getExploreToolDefinitions,
  createExploreToolExecutor,
  buildAgentTasks,
  assembleResult,
  EXPLORE_SYSTEM_PROMPT,
} from "./tools.ts";

export type {
  ExploreResult,
  ExploreDepth,
  KeyFile,
  Pattern,
} from "./tools.ts";
