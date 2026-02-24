/**
 * Notion Databases API — query and create.
 *
 * Wraps the Notion API database endpoints with typed methods.
 * Filter objects are expected as structured JSON from the LLM,
 * not free-text natural language.
 *
 * @module
 */

import type { ClassificationLevel, Result } from "../../core/types/classification.ts";
import type { NotionClient } from "./client.ts";
import type {
  NotionDatabase,
  NotionError,
  NotionPage,
  CreateDatabaseOptions,
  QueryDatabaseOptions,
} from "./types.ts";
import { transformRawDatabase, transformRawPage } from "./transform.ts";

/** Databases service interface. */
export interface NotionDatabasesService {
  readonly query: (
    databaseId: string,
    opts: QueryDatabaseOptions | undefined,
    classification: ClassificationLevel,
  ) => Promise<Result<{ results: readonly NotionPage[]; nextCursor: string | null }, NotionError>>;
  readonly create: (
    parentPageId: string,
    opts: CreateDatabaseOptions,
    classification: ClassificationLevel,
  ) => Promise<Result<NotionDatabase, NotionError>>;
}

// ─── Raw API response types ──────────────────────────────────────────────────

interface RawQueryResponse {
  readonly results: readonly RawPageResult[];
  readonly next_cursor: string | null;
  readonly has_more: boolean;
}

interface RawPageResult {
  readonly id: string;
  readonly url: string;
  readonly parent: { readonly type: string; readonly database_id?: string; readonly page_id?: string };
  readonly archived: boolean;
  readonly properties: Readonly<Record<string, RawPropertyValue>>;
  readonly last_edited_time: string;
}

interface RawPropertyValue {
  readonly type: string;
  readonly title?: readonly { readonly plain_text: string }[];
  readonly [key: string]: unknown;
}

interface RawDatabaseResponse {
  readonly id: string;
  readonly title: readonly { readonly plain_text: string }[];
  readonly url: string;
  readonly parent: { readonly page_id?: string };
  readonly properties: Readonly<Record<string, { readonly id: string; readonly type: string; readonly name: string }>>;
}

/** Create a NotionDatabasesService backed by a NotionClient. */
export function createNotionDatabasesService(client: NotionClient): NotionDatabasesService {
  return {
    query: (databaseId, opts, classification) =>
      queryDatabase(client, databaseId, opts, classification),
    create: (parentPageId, opts, classification) =>
      createDatabase(client, parentPageId, opts, classification),
  };
}

/** Query a database with optional filters, sorts, and pagination. */
async function queryDatabase(
  client: NotionClient,
  databaseId: string,
  opts: QueryDatabaseOptions | undefined,
  classification: ClassificationLevel,
): Promise<Result<{ results: readonly NotionPage[]; nextCursor: string | null }, NotionError>> {
  const body: Record<string, unknown> = {};
  if (opts?.filter) body.filter = opts.filter;
  if (opts?.sorts) body.sorts = opts.sorts;
  if (opts?.pageSize) body.page_size = opts.pageSize;
  if (opts?.startCursor) body.start_cursor = opts.startCursor;

  const result = await client.request<RawQueryResponse>(
    "POST",
    `/databases/${databaseId}/query`,
    body,
  );
  if (!result.ok) return result;

  return {
    ok: true,
    value: {
      results: result.value.results.map((r) => transformRawPage(r, classification)),
      nextCursor: result.value.next_cursor,
    },
  };
}

/** Create an inline database in a page. */
async function createDatabase(
  client: NotionClient,
  parentPageId: string,
  opts: CreateDatabaseOptions,
  classification: ClassificationLevel,
): Promise<Result<NotionDatabase, NotionError>> {
  const body = {
    parent: { page_id: parentPageId },
    title: [{ text: { content: opts.title } }],
    properties: opts.properties,
  };

  const result = await client.request<RawDatabaseResponse>(
    "POST",
    "/databases",
    body,
  );
  if (!result.ok) return result;

  return { ok: true, value: transformRawDatabase(result.value, classification) };
}
