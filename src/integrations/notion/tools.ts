/**
 * Notion tool executor.
 *
 * Creates a chain-compatible executor that routes notion.* tool calls
 * to the appropriate handler. Returns null for unknown tools to allow
 * chaining with other executors.
 *
 * @module
 */

export type { NotionToolContext } from "./tool_context.ts";
export { getNotionToolDefinitions, NOTION_TOOLS_SYSTEM_PROMPT } from "./tool_defs.ts";

import type { NotionToolContext } from "./tool_context.ts";
import {
  executeSearch,
  executePagesRead,
  executePagesCreate,
  executePagesUpdate,
  executeDatabasesQuery,
  executeDatabasesCreate,
  executeBlocksRead,
  executeBlocksAppend,
} from "./tool_handlers.ts";

/** Tool handler function type. */
type ToolHandler = (
  ctx: NotionToolContext,
  input: Record<string, unknown>,
) => Promise<string>;

/** Registry mapping each notion.* tool name to its handler. */
const TOOL_HANDLERS: Readonly<Record<string, ToolHandler>> = {
  "notion.search": executeSearch,
  "notion.pages.read": executePagesRead,
  "notion.pages.create": executePagesCreate,
  "notion.pages.update": executePagesUpdate,
  "notion.databases.query": executeDatabasesQuery,
  "notion.databases.create": executeDatabasesCreate,
  "notion.blocks.read": executeBlocksRead,
  "notion.blocks.append": executeBlocksAppend,
};

/**
 * Create a tool executor for Notion tools.
 *
 * Returns null for unknown tool names (allowing chaining with other executors).
 * Returns a graceful error message if ctx is undefined (Notion not configured).
 */
export function createNotionToolExecutor(
  ctx: NotionToolContext | undefined,
): (name: string, input: Record<string, unknown>) => Promise<string | null> {
  // deno-lint-ignore require-await
  return async (
    name: string,
    input: Record<string, unknown>,
  ): Promise<string | null> => {
    if (!name.startsWith("notion.")) return null;
    if (!ctx) return "Notion is not configured. Run: triggerfish connect notion";
    const handler = TOOL_HANDLERS[name];
    if (!handler) return null;
    return handler(ctx, input);
  };
}
