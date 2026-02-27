/**
 * Notion integration — REST API access with classification-gated taint propagation.
 *
 * Provides tools for searching, reading, creating, and updating Notion
 * pages, databases, and blocks. All data classified at session taint
 * level or configured classification floor.
 *
 * @module
 */

export type {
  NotionError,
  NotionRichText,
  NotionAnnotations,
  NotionBlock,
  NotionBlockContent,
  NotionPage,
  NotionDatabase,
  NotionSearchResult,
  NotionPropertyValue,
  NotionPropertySchema,
  CreatePageOptions,
  UpdatePageOptions,
  QueryDatabaseOptions,
  CreateDatabaseOptions,
} from "./types.ts";

export type { NotionClientConfig, NotionClient } from "./client.ts";

export { createNotionClient, formatNotionError } from "./client.ts";

export type { ResolveNotionTokenOptions } from "./auth.ts";

export { resolveNotionToken, isValidNotionTokenFormat } from "./auth.ts";

export type { NotionPagesService } from "./pages.ts";

export { createNotionPagesService } from "./pages.ts";

export type { NotionDatabasesService } from "./databases.ts";

export { createNotionDatabasesService } from "./databases.ts";

export type { NotionBlocksService } from "./blocks.ts";

export { createNotionBlocksService } from "./blocks.ts";

export {
  markdownToNotionBlocks,
  notionBlocksToMarkdown,
  parseInlineMarkdown,
} from "./richtext.ts";

export type { NotionToolContext } from "./tool_context.ts";

export { getNotionToolDefinitions, NOTION_TOOLS_SYSTEM_PROMPT } from "./tool_defs.ts";

export { createNotionToolExecutor } from "./tools.ts";
