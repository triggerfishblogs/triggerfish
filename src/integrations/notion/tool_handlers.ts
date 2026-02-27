/**
 * Notion tool handler implementations.
 *
 * Maps each notion.* tool call to the appropriate service method,
 * validating inputs and formatting results as JSON strings.
 *
 * @module
 */

import type { ClassificationLevel } from "../../core/types/classification.ts";
import { formatNotionError } from "./client.ts";
import { markdownToNotionBlocks, notionBlocksToMarkdown } from "./richtext.ts";
import type { NotionToolContext } from "./tool_context.ts";

/** Handle notion.search tool invocation. */
export async function executeSearch(
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
export async function executePagesRead(
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
export async function executePagesCreate(
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
export async function executePagesUpdate(
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
  const archived = typeof input.archived === "boolean" ? input.archived : undefined;
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
export async function executeDatabasesQuery(
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
  const pageSize = typeof input.page_size === "number" ? input.page_size : undefined;
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
export async function executeDatabasesCreate(
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
export async function executeBlocksRead(
  ctx: NotionToolContext,
  input: Record<string, unknown>,
): Promise<string> {
  const blockId = input.block_id;
  if (typeof blockId !== "string" || blockId.length === 0) {
    return "Error: notion.blocks.read requires a 'block_id' argument.";
  }
  const pageSize = typeof input.page_size === "number" ? input.page_size : undefined;
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
export async function executeBlocksAppend(
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

/** Resolve the effective classification from context, honouring floor. */
export function resolveClassification(ctx: NotionToolContext): ClassificationLevel {
  const taint = ctx.sessionTaint();
  if (!ctx.classificationFloor) return taint;
  const order: Record<string, number> = {
    RESTRICTED: 4,
    CONFIDENTIAL: 3,
    INTERNAL: 2,
    PUBLIC: 1,
  };
  return (order[ctx.classificationFloor] ?? 0) > (order[taint] ?? 0)
    ? ctx.classificationFloor
    : taint;
}

/** Format properties for JSON output (simplified for LLM readability). */
export function formatProperties(
  props: Readonly<Record<string, { readonly type: string; readonly value: unknown }>>,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, prop] of Object.entries(props)) {
    result[key] = prop.value;
  }
  return result;
}
