/**
 * Notion tool definitions, system prompt, and executor.
 *
 * Defines 8 tools under the `notion.` namespace, provides a system
 * prompt explaining Notion access, and creates a chain-compatible
 * executor that routes tool calls to the appropriate handler.
 *
 * @module
 */

import type { ToolDefinition } from "../../core/types/tool.ts";
import type { ClassificationLevel } from "../../core/types/classification.ts";
import type { SessionId } from "../../core/types/session.ts";
import type { NotionPagesService } from "./pages.ts";
import type { NotionDatabasesService } from "./databases.ts";
import type { NotionBlocksService } from "./blocks.ts";
import { formatNotionError } from "./client.ts";
import { markdownToNotionBlocks, notionBlocksToMarkdown } from "./richtext.ts";

// ─── Context ────────────────────────────────────────────────────────────────

/** Context required by the Notion tool executor. */
export interface NotionToolContext {
  readonly pages: NotionPagesService;
  readonly databases: NotionDatabasesService;
  readonly blocks: NotionBlocksService;
  readonly sessionTaint: () => ClassificationLevel;
  readonly sourceSessionId: SessionId;
  readonly classificationFloor?: ClassificationLevel;
}

// ─── Tool Definitions ───────────────────────────────────────────────────────

/** Get all 8 Notion tool definitions. */
export function getNotionToolDefinitions(): readonly ToolDefinition[] {
  return [
    buildSearchDef(),
    buildPagesReadDef(),
    buildPagesCreateDef(),
    buildPagesUpdateDef(),
    buildDatabasesQueryDef(),
    buildDatabasesCreateDef(),
    buildBlocksReadDef(),
    buildBlocksAppendDef(),
  ];
}

/** Build the notion.search tool definition. */
function buildSearchDef(): ToolDefinition {
  return {
    name: "notion.search",
    description:
      "Search Notion pages and databases by title. Returns matching items with their IDs and URLs.",
    parameters: {
      query: {
        type: "string",
        description: "Search query to match against page/database titles",
        required: true,
      },
      type: {
        type: "string",
        description: 'Filter by object type: "page" or "database"',
        enum: ["page", "database"],
      },
      page_size: {
        type: "number",
        description: "Number of results to return (default: 10, max: 100)",
      },
    },
  };
}

/** Build the notion.pages.read tool definition. */
function buildPagesReadDef(): ToolDefinition {
  return {
    name: "notion.pages.read",
    description:
      "Read a Notion page's properties and content as markdown. Returns clean readable text, not raw Notion JSON.",
    parameters: {
      page_id: {
        type: "string",
        description: "The Notion page ID (UUID format, with or without dashes)",
        required: true,
      },
    },
  };
}

/** Build the notion.pages.create tool definition. */
function buildPagesCreateDef(): ToolDefinition {
  return {
    name: "notion.pages.create",
    description:
      "Create a new Notion page in a database or as a sub-page. Content provided as markdown is converted to Notion blocks.",
    parameters: {
      parent_id: {
        type: "string",
        description: "ID of the parent database or page",
        required: true,
      },
      parent_type: {
        type: "string",
        description: 'Parent type: "database_id" or "page_id"',
        required: true,
        enum: ["database_id", "page_id"],
      },
      title: {
        type: "string",
        description: "Page title",
        required: true,
      },
      properties: {
        type: "object",
        description: "Additional page properties (for database pages). Use Notion API property format.",
      },
      content: {
        type: "string",
        description: "Page body content as markdown. Will be converted to Notion blocks.",
      },
    },
  };
}

/** Build the notion.pages.update tool definition. */
function buildPagesUpdateDef(): ToolDefinition {
  return {
    name: "notion.pages.update",
    description:
      "Update a Notion page's properties or archive/unarchive it.",
    parameters: {
      page_id: {
        type: "string",
        description: "The Notion page ID to update",
        required: true,
      },
      properties: {
        type: "object",
        description: "Properties to update. Use Notion API property format.",
      },
      archived: {
        type: "boolean",
        description: "Set to true to archive, false to unarchive",
      },
    },
  };
}

/** Build the notion.databases.query tool definition. */
function buildDatabasesQueryDef(): ToolDefinition {
  return {
    name: "notion.databases.query",
    description:
      'Query a Notion database with filters and sorts. Filters use Notion API format: { "property": "Status", "select": { "equals": "Done" } }. Sorts use: [{ "property": "Created", "direction": "descending" }].',
    parameters: {
      database_id: {
        type: "string",
        description: "The database ID to query",
        required: true,
      },
      filter: {
        type: "object",
        description: "Notion API filter object. Example: { \"property\": \"Status\", \"select\": { \"equals\": \"Done\" } }",
      },
      sorts: {
        type: "array",
        description: "Array of sort objects. Example: [{ \"property\": \"Date\", \"direction\": \"descending\" }]",
      },
      page_size: {
        type: "number",
        description: "Number of results per page (default: 50, max: 100)",
      },
      start_cursor: {
        type: "string",
        description: "Cursor for pagination (from previous query's next_cursor)",
      },
    },
  };
}

/** Build the notion.databases.create tool definition. */
function buildDatabasesCreateDef(): ToolDefinition {
  return {
    name: "notion.databases.create",
    description:
      "Create an inline database inside a Notion page. Define the schema with property types.",
    parameters: {
      parent_page_id: {
        type: "string",
        description: "ID of the parent page to create the database in",
        required: true,
      },
      title: {
        type: "string",
        description: "Database title",
        required: true,
      },
      properties: {
        type: "object",
        description:
          'Database schema. Map of property name to type definition. Example: { "Name": { "title": {} }, "Status": { "select": { "options": [{ "name": "Todo" }, { "name": "Done" }] } } }',
        required: true,
      },
    },
  };
}

/** Build the notion.blocks.read tool definition. */
function buildBlocksReadDef(): ToolDefinition {
  return {
    name: "notion.blocks.read",
    description:
      "Read child blocks of a page or block. Useful for reading truncated content or specific sections.",
    parameters: {
      block_id: {
        type: "string",
        description: "The block or page ID to read children from",
        required: true,
      },
      page_size: {
        type: "number",
        description: "Number of blocks to return (default: 100, max: 100)",
      },
      start_cursor: {
        type: "string",
        description: "Cursor for pagination",
      },
    },
  };
}

/** Build the notion.blocks.append tool definition. */
function buildBlocksAppendDef(): ToolDefinition {
  return {
    name: "notion.blocks.append",
    description:
      "Append markdown content to a Notion page or block. Markdown is converted to Notion blocks.",
    parameters: {
      block_id: {
        type: "string",
        description: "The page or block ID to append content to",
        required: true,
      },
      content: {
        type: "string",
        description: "Markdown content to append. Will be converted to Notion blocks.",
        required: true,
      },
    },
  };
}

// ─── System Prompt ──────────────────────────────────────────────────────────

/** System prompt section explaining Notion tools to the LLM. */
export const NOTION_TOOLS_SYSTEM_PROMPT = `## Notion Access

You have access to Notion via 8 notion.* tools: search, pages, databases, and blocks.

- Page and database IDs are UUIDs (32 hex chars, with or without dashes).
- \`notion.pages.read\` returns page content as clean markdown — use it to read pages.
- \`notion.pages.create\` accepts markdown in the \`content\` parameter — it's converted to Notion blocks automatically.
- \`notion.blocks.append\` also accepts markdown in \`content\`.
- \`notion.databases.query\` uses Notion API filter format: \`{ "property": "Status", "select": { "equals": "Done" } }\`.
- All Notion data inherits the session's classification level. Accessing Notion data may escalate session taint.
- Pages must be explicitly shared with the Notion integration to be accessible.
- Never narrate your intent to use Notion tools — just call them directly.`;

// ─── Executor ───────────────────────────────────────────────────────────────

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
    if (!name.startsWith("notion.")) {
      return null;
    }

    if (!ctx) {
      return "Notion is not configured. Run: triggerfish connect notion";
    }

    const handler = TOOL_HANDLERS[name];
    if (!handler) {
      return null;
    }

    return handler(ctx, input);
  };
}

// ─── Tool Handlers ──────────────────────────────────────────────────────────

/** Handle notion.search tool invocation. */
async function executeSearch(
  ctx: NotionToolContext,
  input: Record<string, unknown>,
): Promise<string> {
  const query = input.query;
  if (typeof query !== "string" || query.length === 0) {
    return "Error: notion.search requires a non-empty 'query' argument.";
  }

  const type = typeof input.type === "string"
    ? input.type as "page" | "database"
    : undefined;
  const pageSize = typeof input.page_size === "number"
    ? input.page_size
    : undefined;

  const result = await ctx.pages.search(query, { type, pageSize });
  if (!result.ok) return formatNotionError(result.error);

  const classification = resolveClassification(ctx);
  return JSON.stringify({
    results: result.value.results.map((r) => ({
      type: r.type,
      id: r.id,
      title: r.title,
      url: r.url,
      last_edited: r.lastEditedTime,
    })),
    next_cursor: result.value.nextCursor,
    _classification: classification,
  });
}

/** Handle notion.pages.read tool invocation. */
async function executePagesRead(
  ctx: NotionToolContext,
  input: Record<string, unknown>,
): Promise<string> {
  const pageId = input.page_id;
  if (typeof pageId !== "string" || pageId.length === 0) {
    return "Error: notion.pages.read requires a 'page_id' argument.";
  }

  const classification = resolveClassification(ctx);
  const result = await ctx.pages.read(pageId, classification);
  if (!result.ok) return formatNotionError(result.error);

  const markdown = notionBlocksToMarkdown(result.value.content);
  const properties = formatProperties(result.value.page.properties);

  return JSON.stringify({
    title: result.value.page.title,
    url: result.value.page.url,
    properties,
    content: markdown,
    _classification: classification,
  });
}

/** Handle notion.pages.create tool invocation. */
async function executePagesCreate(
  ctx: NotionToolContext,
  input: Record<string, unknown>,
): Promise<string> {
  const parentId = input.parent_id;
  if (typeof parentId !== "string" || parentId.length === 0) {
    return "Error: notion.pages.create requires a 'parent_id' argument.";
  }
  const parentType = input.parent_type;
  if (parentType !== "database_id" && parentType !== "page_id") {
    return 'Error: notion.pages.create requires parent_type of "database_id" or "page_id".';
  }
  const title = input.title;
  if (typeof title !== "string" || title.length === 0) {
    return "Error: notion.pages.create requires a 'title' argument.";
  }

  const children = typeof input.content === "string"
    ? markdownToNotionBlocks(input.content)
    : undefined;
  const properties = typeof input.properties === "object" && input.properties !== null
    ? input.properties as Readonly<Record<string, unknown>>
    : undefined;

  const classification = resolveClassification(ctx);
  const result = await ctx.pages.create(
    { parentId, parentType, title, properties, children },
    classification,
  );
  if (!result.ok) return formatNotionError(result.error);

  return JSON.stringify({
    id: result.value.id,
    title: result.value.title,
    url: result.value.url,
    _classification: classification,
  });
}

/** Handle notion.pages.update tool invocation. */
async function executePagesUpdate(
  ctx: NotionToolContext,
  input: Record<string, unknown>,
): Promise<string> {
  const pageId = input.page_id;
  if (typeof pageId !== "string" || pageId.length === 0) {
    return "Error: notion.pages.update requires a 'page_id' argument.";
  }

  const properties = typeof input.properties === "object" && input.properties !== null
    ? input.properties as Readonly<Record<string, unknown>>
    : undefined;
  const archived = typeof input.archived === "boolean"
    ? input.archived
    : undefined;

  if (!properties && archived === undefined) {
    return "Error: notion.pages.update requires at least one of 'properties' or 'archived'.";
  }

  const classification = resolveClassification(ctx);
  const result = await ctx.pages.update(pageId, { properties, archived }, classification);
  if (!result.ok) return formatNotionError(result.error);

  return JSON.stringify({
    id: result.value.id,
    title: result.value.title,
    url: result.value.url,
    archived: result.value.archived,
    _classification: classification,
  });
}

/** Handle notion.databases.query tool invocation. */
async function executeDatabasesQuery(
  ctx: NotionToolContext,
  input: Record<string, unknown>,
): Promise<string> {
  const databaseId = input.database_id;
  if (typeof databaseId !== "string" || databaseId.length === 0) {
    return "Error: notion.databases.query requires a 'database_id' argument.";
  }

  const filter = typeof input.filter === "object" && input.filter !== null
    ? input.filter as Readonly<Record<string, unknown>>
    : undefined;
  const sorts = Array.isArray(input.sorts)
    ? input.sorts as readonly Readonly<Record<string, unknown>>[]
    : undefined;
  const pageSize = typeof input.page_size === "number"
    ? input.page_size
    : undefined;
  const startCursor = typeof input.start_cursor === "string"
    ? input.start_cursor
    : undefined;

  const classification = resolveClassification(ctx);
  const result = await ctx.databases.query(
    databaseId,
    { filter, sorts, pageSize, startCursor },
    classification,
  );
  if (!result.ok) return formatNotionError(result.error);

  return JSON.stringify({
    results: result.value.results.map((page) => ({
      id: page.id,
      title: page.title,
      url: page.url,
      properties: formatProperties(page.properties),
    })),
    next_cursor: result.value.nextCursor,
    _classification: classification,
  });
}

/** Handle notion.databases.create tool invocation. */
async function executeDatabasesCreate(
  ctx: NotionToolContext,
  input: Record<string, unknown>,
): Promise<string> {
  const parentPageId = input.parent_page_id;
  if (typeof parentPageId !== "string" || parentPageId.length === 0) {
    return "Error: notion.databases.create requires a 'parent_page_id' argument.";
  }
  const title = input.title;
  if (typeof title !== "string" || title.length === 0) {
    return "Error: notion.databases.create requires a 'title' argument.";
  }
  const properties = input.properties;
  if (typeof properties !== "object" || properties === null) {
    return "Error: notion.databases.create requires a 'properties' argument with database schema.";
  }

  const classification = resolveClassification(ctx);
  const result = await ctx.databases.create(
    parentPageId,
    {
      title,
      properties: properties as Readonly<Record<string, Readonly<Record<string, unknown>>>>,
    },
    classification,
  );
  if (!result.ok) return formatNotionError(result.error);

  return JSON.stringify({
    id: result.value.id,
    title: result.value.title,
    url: result.value.url,
    _classification: classification,
  });
}

/** Handle notion.blocks.read tool invocation. */
async function executeBlocksRead(
  ctx: NotionToolContext,
  input: Record<string, unknown>,
): Promise<string> {
  const blockId = input.block_id;
  if (typeof blockId !== "string" || blockId.length === 0) {
    return "Error: notion.blocks.read requires a 'block_id' argument.";
  }

  const pageSize = typeof input.page_size === "number"
    ? input.page_size
    : undefined;
  const startCursor = typeof input.start_cursor === "string"
    ? input.start_cursor
    : undefined;

  const result = await ctx.blocks.readChildren(blockId, { pageSize, startCursor });
  if (!result.ok) return formatNotionError(result.error);

  const classification = resolveClassification(ctx);
  const markdown = notionBlocksToMarkdown(result.value.results);

  return JSON.stringify({
    content: markdown,
    block_count: result.value.results.length,
    next_cursor: result.value.nextCursor,
    _classification: classification,
  });
}

/** Handle notion.blocks.append tool invocation. */
async function executeBlocksAppend(
  ctx: NotionToolContext,
  input: Record<string, unknown>,
): Promise<string> {
  const blockId = input.block_id;
  if (typeof blockId !== "string" || blockId.length === 0) {
    return "Error: notion.blocks.append requires a 'block_id' argument.";
  }
  const content = input.content;
  if (typeof content !== "string" || content.length === 0) {
    return "Error: notion.blocks.append requires a non-empty 'content' argument.";
  }

  const notionBlocks = markdownToNotionBlocks(content);
  const result = await ctx.blocks.append(blockId, notionBlocks);
  if (!result.ok) return formatNotionError(result.error);

  const classification = resolveClassification(ctx);
  return JSON.stringify({
    appended_blocks: result.value.length,
    _classification: classification,
  });
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Resolve the effective classification from context. */
function resolveClassification(ctx: NotionToolContext): ClassificationLevel {
  const taint = ctx.sessionTaint();
  if (ctx.classificationFloor) {
    // Use the higher of floor and taint
    const floorOrder: Record<string, number> = {
      RESTRICTED: 4,
      CONFIDENTIAL: 3,
      INTERNAL: 2,
      PUBLIC: 1,
    };
    return (floorOrder[ctx.classificationFloor] ?? 0) >
        (floorOrder[taint] ?? 0)
      ? ctx.classificationFloor
      : taint;
  }
  return taint;
}

/** Format properties for JSON output (simplified for LLM readability). */
function formatProperties(
  props: Readonly<Record<string, { readonly type: string; readonly value: unknown }>>,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, prop] of Object.entries(props)) {
    result[key] = prop.value;
  }
  return result;
}
