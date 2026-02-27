/**
 * Notion Pages API — search, read, create, update.
 *
 * Wraps the Notion API page endpoints with typed methods that
 * return Result<T, NotionError>. Block content is fetched recursively
 * up to a configurable depth limit.
 *
 * @module
 */

import type { ClassificationLevel, Result } from "../../core/types/classification.ts";
import { createLogger } from "../../core/logger/mod.ts";
import type { NotionClient } from "./client.ts";
import type {
  NotionBlock,
  NotionError,
  NotionPage,
  NotionSearchResult,
  CreatePageOptions,
  UpdatePageOptions,
} from "./types.ts";
import {
  blockToRawBlock,
  transformRawBlock,
  transformRawPage,
  transformRawSearchResult,
} from "./transform.ts";

const log = createLogger("notion:pages");

/** Maximum recursion depth for fetching nested blocks. */
const MAX_BLOCK_DEPTH = 3;

/** Pages service interface. */
export interface NotionPagesService {
  readonly search: (
    query: string,
    opts?: { readonly type?: "page" | "database"; readonly pageSize?: number; readonly startCursor?: string },
  ) => Promise<Result<{ results: readonly NotionSearchResult[]; nextCursor: string | null }, NotionError>>;
  readonly read: (
    pageId: string,
    classification: ClassificationLevel,
  ) => Promise<Result<{ page: NotionPage; content: readonly NotionBlock[] }, NotionError>>;
  readonly create: (
    opts: CreatePageOptions,
    classification: ClassificationLevel,
  ) => Promise<Result<NotionPage, NotionError>>;
  readonly update: (
    pageId: string,
    opts: UpdatePageOptions,
    classification: ClassificationLevel,
  ) => Promise<Result<NotionPage, NotionError>>;
}

// ─── Raw API response types ──────────────────────────────────────────────────

interface RawSearchResponse {
  readonly results: readonly RawSearchItem[];
  readonly next_cursor: string | null;
  readonly has_more: boolean;
}

interface RawSearchItem {
  readonly id: string;
  readonly object: string;
  readonly url: string;
  readonly last_edited_time: string;
  readonly properties?: Readonly<Record<string, RawProperty>>;
  readonly title?: readonly { readonly plain_text: string }[];
}

interface RawProperty {
  readonly type: string;
  readonly title?: readonly { readonly plain_text: string }[];
  readonly [key: string]: unknown;
}

interface RawPageResponse {
  readonly id: string;
  readonly url: string;
  readonly parent: { readonly type: string; readonly database_id?: string; readonly page_id?: string };
  readonly archived: boolean;
  readonly properties: Readonly<Record<string, RawProperty>>;
  readonly last_edited_time: string;
}

interface RawBlocksResponse {
  readonly results: readonly RawBlockItem[];
  readonly next_cursor: string | null;
  readonly has_more: boolean;
}

interface RawBlockItem {
  readonly id: string;
  readonly type: string;
  readonly has_children: boolean;
  readonly [key: string]: unknown;
}

/** Create a NotionPagesService backed by a NotionClient. */
export function createNotionPagesService(client: NotionClient): NotionPagesService {
  return {
    search: (query, opts) => searchPages(client, query, opts),
    read: (pageId, classification) => readPage(client, pageId, classification),
    create: (opts, classification) => createPage(client, opts, classification),
    update: (pageId, opts, classification) => updatePage(client, pageId, opts, classification),
  };
}

/** Search pages and databases by title. */
async function searchPages(
  client: NotionClient,
  query: string,
  opts?: { readonly type?: "page" | "database"; readonly pageSize?: number; readonly startCursor?: string },
): Promise<Result<{ results: readonly NotionSearchResult[]; nextCursor: string | null }, NotionError>> {
  const body: Record<string, unknown> = { query };
  if (opts?.type) {
    body.filter = { value: opts.type, property: "object" };
  }
  if (opts?.pageSize) body.page_size = opts.pageSize;
  if (opts?.startCursor) body.start_cursor = opts.startCursor;

  const result = await client.request<RawSearchResponse>("POST", "/search", body);
  if (!result.ok) {
    log.warn("Notion search pages failed", { operation: "searchPages", error: result.error });
    return result;
  }

  return {
    ok: true,
    value: {
      results: result.value.results.map(transformRawSearchResult),
      nextCursor: result.value.next_cursor,
    },
  };
}

/** Read a page and its block content. */
async function readPage(
  client: NotionClient,
  pageId: string,
  classification: ClassificationLevel,
): Promise<Result<{ page: NotionPage; content: readonly NotionBlock[] }, NotionError>> {
  const pageResult = await client.request<RawPageResponse>("GET", `/pages/${pageId}`);
  if (!pageResult.ok) {
    log.warn("Notion read page failed", { operation: "readPage", pageId, error: pageResult.error });
    return pageResult;
  }

  const blocksResult = await fetchBlockChildren(client, pageId, 0);
  if (!blocksResult.ok) {
    log.warn("Notion fetch page blocks failed", {
      operation: "readPage",
      pageId,
      error: blocksResult.error,
    });
    return blocksResult;
  }

  return {
    ok: true,
    value: {
      page: transformRawPage(pageResult.value, classification),
      content: blocksResult.value,
    },
  };
}

/** Recursively fetch block children up to MAX_BLOCK_DEPTH. */
async function fetchBlockChildren(
  client: NotionClient,
  blockId: string,
  depth: number,
): Promise<Result<readonly NotionBlock[], NotionError>> {
  const result = await client.request<RawBlocksResponse>(
    "GET",
    `/blocks/${blockId}/children?page_size=100`,
  );
  if (!result.ok) return result;

  const blocks: NotionBlock[] = [];
  for (const raw of result.value.results) {
    let children: readonly NotionBlock[] | undefined;
    if (raw.has_children && depth < MAX_BLOCK_DEPTH) {
      const childResult = await fetchBlockChildren(client, raw.id, depth + 1);
      if (childResult.ok) {
        children = childResult.value;
      }
    }
    blocks.push(transformRawBlock(raw, children));
  }

  return { ok: true, value: blocks };
}

/** Create a new page. */
async function createPage(
  client: NotionClient,
  opts: CreatePageOptions,
  classification: ClassificationLevel,
): Promise<Result<NotionPage, NotionError>> {
  const body: Record<string, unknown> = {
    parent: { [opts.parentType]: opts.parentId },
    properties: {
      title: { title: [{ text: { content: opts.title } }] },
      ...opts.properties,
    },
  };
  if (opts.children) {
    body.children = opts.children.map(blockToRawBlock);
  }

  const result = await client.request<RawPageResponse>("POST", "/pages", body);
  if (!result.ok) {
    log.warn("Notion create page failed", { operation: "createPage", error: result.error });
    return result;
  }

  return { ok: true, value: transformRawPage(result.value, classification) };
}

/** Update an existing page. */
async function updatePage(
  client: NotionClient,
  pageId: string,
  opts: UpdatePageOptions,
  classification: ClassificationLevel,
): Promise<Result<NotionPage, NotionError>> {
  const body: Record<string, unknown> = {};
  if (opts.properties) body.properties = opts.properties;
  if (opts.archived !== undefined) body.archived = opts.archived;

  const result = await client.request<RawPageResponse>("PATCH", `/pages/${pageId}`, body);
  if (!result.ok) {
    log.warn("Notion update page failed", { operation: "updatePage", pageId, error: result.error });
    return result;
  }

  return { ok: true, value: transformRawPage(result.value, classification) };
}

