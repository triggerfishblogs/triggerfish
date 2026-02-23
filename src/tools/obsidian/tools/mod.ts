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
  resolveNotePath,
  recordLineage,
  executeObsidianRead,
  executeObsidianWrite,
} from "./tools_read_write.ts";
