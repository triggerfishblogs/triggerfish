/**
 * Domain types for the Notion integration.
 *
 * All types are readonly and carry a `classification` field
 * derived from session taint or configuration floor.
 *
 * @module
 */

import type { ClassificationLevel } from "../../core/types/classification.ts";

/** Error from a Notion API call. */
export interface NotionError {
  readonly status: number;
  readonly code: string;
  readonly message: string;
  /** Milliseconds to wait before retrying, from Retry-After header (429 only). */
  readonly retryAfterMs?: number;
}

/** A Notion rich text element. */
export interface NotionRichText {
  readonly type: "text" | "mention" | "equation";
  readonly text: string;
  readonly annotations: NotionAnnotations;
  readonly href: string | null;
}

/** Inline formatting annotations on rich text. */
export interface NotionAnnotations {
  readonly bold: boolean;
  readonly italic: boolean;
  readonly strikethrough: boolean;
  readonly underline: boolean;
  readonly code: boolean;
}

/** A Notion block object. */
export interface NotionBlock {
  readonly id: string;
  readonly type: string;
  readonly hasChildren: boolean;
  readonly content: NotionBlockContent;
  readonly children?: readonly NotionBlock[];
}

/** Union content type for blocks keyed by block type. */
export interface NotionBlockContent {
  readonly richText?: readonly NotionRichText[];
  readonly checked?: boolean;
  readonly language?: string;
  readonly url?: string;
  readonly caption?: readonly NotionRichText[];
}

/** A Notion page object. */
export interface NotionPage {
  readonly id: string;
  readonly title: string;
  readonly url: string;
  readonly parentType: "database_id" | "page_id" | "workspace";
  readonly parentId: string;
  readonly archived: boolean;
  readonly properties: Readonly<Record<string, NotionPropertyValue>>;
  readonly lastEditedTime: string;
  readonly classification: ClassificationLevel;
}

/** A Notion database object. */
export interface NotionDatabase {
  readonly id: string;
  readonly title: string;
  readonly url: string;
  readonly parentId: string;
  readonly properties: Readonly<Record<string, NotionPropertySchema>>;
  readonly classification: ClassificationLevel;
}

/** A Notion search result item. */
export interface NotionSearchResult {
  readonly type: "page" | "database";
  readonly id: string;
  readonly title: string;
  readonly url: string;
  readonly lastEditedTime: string;
}

/** Property value from a Notion page (simplified for LLM consumption). */
export interface NotionPropertyValue {
  readonly type: string;
  readonly value: unknown;
}

/** Property schema definition from a Notion database. */
export interface NotionPropertySchema {
  readonly id: string;
  readonly type: string;
  readonly name: string;
}

/** Options for creating a Notion page. */
export interface CreatePageOptions {
  readonly parentId: string;
  readonly parentType: "database_id" | "page_id";
  readonly title: string;
  readonly properties?: Readonly<Record<string, unknown>>;
  readonly children?: readonly NotionBlock[];
}

/** Options for updating a Notion page. */
export interface UpdatePageOptions {
  readonly properties?: Readonly<Record<string, unknown>>;
  readonly archived?: boolean;
}

/** Options for querying a Notion database. */
export interface QueryDatabaseOptions {
  readonly filter?: Readonly<Record<string, unknown>>;
  readonly sorts?: readonly Readonly<Record<string, unknown>>[];
  readonly pageSize?: number;
  readonly startCursor?: string;
}

/** Options for creating a Notion database. */
export interface CreateDatabaseOptions {
  readonly title: string;
  readonly properties: Readonly<
    Record<string, Readonly<Record<string, unknown>>>
  >;
}
