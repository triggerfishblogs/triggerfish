/**
 * Raw Notion API response shapes.
 *
 * These interfaces mirror the snake_case JSON returned by the Notion REST API.
 * They are consumed by the transform module which maps them to domain types.
 *
 * @module
 */

/** Raw rich text from the Notion API. */
export interface RawRichText {
  readonly type?: string;
  readonly text?: { readonly content?: string; readonly link?: { readonly url?: string } | null };
  readonly plain_text?: string;
  readonly annotations?: {
    readonly bold?: boolean;
    readonly italic?: boolean;
    readonly strikethrough?: boolean;
    readonly underline?: boolean;
    readonly code?: boolean;
  };
  readonly href?: string | null;
}

/** Raw property value from a page. */
export interface RawPropertyValue {
  readonly type: string;
  readonly title?: readonly { readonly plain_text: string }[];
  readonly rich_text?: readonly { readonly plain_text: string }[];
  readonly number?: number | null;
  readonly select?: { readonly name: string } | null;
  readonly multi_select?: readonly { readonly name: string }[];
  readonly date?: { readonly start: string; readonly end?: string | null } | null;
  readonly checkbox?: boolean;
  readonly url?: string | null;
  readonly email?: string | null;
  readonly phone_number?: string | null;
  readonly formula?: { readonly type: string; readonly string?: string; readonly number?: number };
  readonly relation?: readonly { readonly id: string }[];
  readonly status?: { readonly name: string } | null;
  readonly [key: string]: unknown;
}

/** Raw property schema from a database. */
export interface RawPropertySchema {
  readonly id: string;
  readonly type: string;
  readonly name: string;
}
