/**
 * Obsidian tool definitions, executor, and read/write handlers.
 *
 * @module
 */

export type { ObsidianToolContext } from "./tools_defs.ts";
export {
  getObsidianToolDefinitions,
  OBSIDIAN_SYSTEM_PROMPT,
} from "./tools_defs.ts";

export { createObsidianToolExecutor } from "./tools.ts";

export {
  executeObsidianRead,
  executeObsidianWrite,
  recordLineage,
  resolveNotePath,
} from "./tools_read_write.ts";
