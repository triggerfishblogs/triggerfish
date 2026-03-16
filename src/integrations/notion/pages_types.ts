/**
 * Notion Pages API — types and raw API response shapes.
 *
 * @module
 */

import type {
  ClassificationLevel,
  Result,
} from "../../core/types/classification.ts";
import type {
  CreatePageOptions,
  NotionBlock,
  NotionError,
  NotionPage,
  NotionSearchResult,
  UpdatePageOptions,
} from "./types.ts";

/** Pages service interface. */
export interface NotionPagesService {
  readonly search: (
    query: string,
    opts?: {
      readonly type?: "page" | "database";
      readonly pageSize?: number;
      readonly startCursor?: string;
    },
  ) => Promise<
    Result<
      { results: readonly NotionSearchResult[]; nextCursor: string | null },
      NotionError
    >
  >;
  readonly read: (
    pageId: string,
    classification: ClassificationLevel,
  ) => Promise<
    Result<{ page: NotionPage; content: readonly NotionBlock[] }, NotionError>
  >;
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

export interface RawSearchResponse {
  readonly results: readonly RawSearchItem[];
  readonly next_cursor: string | null;
  readonly has_more: boolean;
}

export interface RawSearchItem {
  readonly id: string;
  readonly object: string;
  readonly url: string;
  readonly last_edited_time: string;
  readonly properties?: Readonly<Record<string, RawProperty>>;
  readonly title?: readonly { readonly plain_text: string }[];
}

export interface RawProperty {
  readonly type: string;
  readonly title?: readonly { readonly plain_text: string }[];
  readonly [key: string]: unknown;
}

export interface RawPageResponse {
  readonly id: string;
  readonly url: string;
  readonly parent: {
    readonly type: string;
    readonly database_id?: string;
    readonly page_id?: string;
  };
  readonly archived: boolean;
  readonly properties: Readonly<Record<string, RawProperty>>;
  readonly last_edited_time: string;
}

export interface RawBlocksResponse {
  readonly results: readonly RawBlockItem[];
  readonly next_cursor: string | null;
  readonly has_more: boolean;
}

export interface RawBlockItem {
  readonly id: string;
  readonly type: string;
  readonly has_children: boolean;
  readonly [key: string]: unknown;
}
