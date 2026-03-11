/**
 * Notion tool handler implementations.
 *
 * Facade re-exporting from tool_handlers_pages.ts, tool_handlers_data.ts,
 * and tool_handlers_shared.ts.
 *
 * @module
 */

export {
  executePagesCreate,
  executePagesRead,
  executePagesUpdate,
  executeSearch,
} from "./tool_handlers_pages.ts";

export {
  executeBlocksAppend,
  executeBlocksRead,
  executeDatabasesCreate,
  executeDatabasesQuery,
} from "./tool_handlers_data.ts";

export {
  formatProperties,
  resolveNotionClassification,
} from "./tool_handlers_shared.ts";
