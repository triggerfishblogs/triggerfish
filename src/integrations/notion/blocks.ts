/**
 * Notion Blocks API — read children and append.
 *
 * Wraps the Notion API block endpoints for reading child blocks
 * (with pagination) and appending new blocks to a page or block.
 *
 * @module
 */

import type { Result } from "../../core/types/classification.ts";
import type { NotionClient } from "./client.ts";
import type { NotionBlock, NotionError } from "./types.ts";
import { transformRawBlock } from "./transform.ts";

/** Blocks service interface. */
export interface NotionBlocksService {
  readonly readChildren: (
    blockId: string,
    opts?: { readonly startCursor?: string; readonly pageSize?: number },
  ) => Promise<Result<{ results: readonly NotionBlock[]; nextCursor: string | null }, NotionError>>;
  readonly append: (
    blockId: string,
    children: readonly NotionBlock[],
  ) => Promise<Result<readonly NotionBlock[], NotionError>>;
}

// ─── Raw API response types ──────────────────────────────────────────────────

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

interface RawAppendResponse {
  readonly results: readonly RawBlockItem[];
}

/** Create a NotionBlocksService backed by a NotionClient. */
export function createNotionBlocksService(client: NotionClient): NotionBlocksService {
  return {
    readChildren: (blockId, opts) => readBlockChildren(client, blockId, opts),
    append: (blockId, children) => appendBlocks(client, blockId, children),
  };
}

/** Read child blocks of a block or page. */
async function readBlockChildren(
  client: NotionClient,
  blockId: string,
  opts?: { readonly startCursor?: string; readonly pageSize?: number },
): Promise<Result<{ results: readonly NotionBlock[]; nextCursor: string | null }, NotionError>> {
  const params: string[] = [];
  if (opts?.pageSize) params.push(`page_size=${opts.pageSize}`);
  if (opts?.startCursor) params.push(`start_cursor=${opts.startCursor}`);
  const query = params.length > 0 ? `?${params.join("&")}` : "";

  const result = await client.request<RawBlocksResponse>(
    "GET",
    `/blocks/${blockId}/children${query}`,
  );
  if (!result.ok) return result;

  return {
    ok: true,
    value: {
      results: result.value.results.map((r) => transformRawBlock(r)),
      nextCursor: result.value.next_cursor,
    },
  };
}

/** Append blocks as children of a block or page. */
async function appendBlocks(
  client: NotionClient,
  blockId: string,
  children: readonly NotionBlock[],
): Promise<Result<readonly NotionBlock[], NotionError>> {
  const body = {
    children: children.map(blockToRawBlock),
  };

  const result = await client.request<RawAppendResponse>(
    "PATCH",
    `/blocks/${blockId}/children`,
    body,
  );
  if (!result.ok) return result;

  return {
    ok: true,
    value: result.value.results.map((r) => transformRawBlock(r)),
  };
}

/** Convert a NotionBlock to Notion API raw block format. */
function blockToRawBlock(block: NotionBlock): Record<string, unknown> {
  const raw: Record<string, unknown> = { type: block.type };
  const content: Record<string, unknown> = {};

  if (block.content.richText) {
    content.rich_text = block.content.richText.map((rt) => ({
      type: "text",
      text: { content: rt.text, link: rt.href ? { url: rt.href } : null },
      annotations: rt.annotations,
    }));
  }
  if (block.content.checked !== undefined) {
    content.checked = block.content.checked;
  }
  if (block.content.language) {
    content.language = block.content.language;
  }

  raw[block.type] = content;
  return raw;
}
