/**
 * Explore module — single-agent codebase exploration.
 *
 * @module
 */

export {
  EXPLORE_SYSTEM_PROMPT,
  getExploreToolDefinitions,
} from "./tools_defs.ts";

export type { ExploreDepth } from "./tools_defs.ts";

export { buildExplorePrompt } from "./prompts.ts";

export { createExploreToolExecutor } from "./executor.ts";
