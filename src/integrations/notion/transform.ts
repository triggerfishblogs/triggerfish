/**
 * Raw Notion API response transformers.
 *
 * Maps snake_case API responses to the domain types used throughout
 * the integration. Pure functions — no side effects.
 *
 * @module
 */

import type { ClassificationLevel } from "../../core/types/classification.ts";
import type {
  NotionAnnotations,
  NotionBlock,
  NotionBlockContent,
  NotionDatabase,
  NotionPage,
  NotionPropertySchema,
  NotionPropertyValue,
  NotionRichText,
  NotionSearchResult,
} from "./types.ts";
import type { RawPropertySchema, RawPropertyValue, RawRichText } from "./raw_types.ts";

// ─── Transformers ───────────────────────────────────────────────────────────

/** Transform a raw rich text element to our domain type. */
export function transformRawRichText(raw: RawRichText): NotionRichText {
  return {
    type: (raw.type ?? "text") as NotionRichText["type"],
    text: raw.plain_text ?? raw.text?.content ?? "",
    annotations: transformAnnotations(raw.annotations),
    href: raw.href ?? raw.text?.link?.url ?? null,
  };
}

/** Transform raw annotations to our domain type. */
function transformAnnotations(
  raw?: RawRichText["annotations"],
): NotionAnnotations {
  return {
    bold: raw?.bold ?? false,
    italic: raw?.italic ?? false,
    strikethrough: raw?.strikethrough ?? false,
    underline: raw?.underline ?? false,
    code: raw?.code ?? false,
  };
}

/** Transform a raw block item from the API. */
export function transformRawBlock(
  raw: { readonly id: string; readonly type: string; readonly has_children: boolean; readonly [key: string]: unknown },
  children?: readonly NotionBlock[],
): NotionBlock {
  const typeData = raw[raw.type] as Record<string, unknown> | undefined;
  const content = extractBlockContent(raw.type, typeData);

  return {
    id: raw.id,
    type: raw.type,
    hasChildren: raw.has_children,
    content,
    children,
  };
}

/** Extract content from a block's type-specific data. */
function extractBlockContent(
  type: string,
  data?: Record<string, unknown>,
): NotionBlockContent {
  if (!data) return {};

  const richText = data.rich_text
    ? (data.rich_text as readonly RawRichText[]).map(transformRawRichText)
    : undefined;

  switch (type) {
    case "code":
      return {
        richText,
        language: data.language as string | undefined,
      };
    case "to_do":
      return {
        richText,
        checked: data.checked as boolean | undefined,
      };
    case "image":
      return {
        richText,
        url: extractImageUrl(data),
        caption: data.caption
          ? (data.caption as readonly RawRichText[]).map(transformRawRichText)
          : undefined,
      };
    default:
      return { richText };
  }
}

/** Extract URL from an image block's data. */
function extractImageUrl(data: Record<string, unknown>): string | undefined {
  if (data.type === "external") {
    return (data.external as { url?: string })?.url;
  }
  if (data.type === "file") {
    return (data.file as { url?: string })?.url;
  }
  return undefined;
}

/** Transform a raw page response to our domain type. */
export function transformRawPage(
  raw: {
    readonly id: string;
    readonly url: string;
    readonly parent: { readonly type: string; readonly database_id?: string; readonly page_id?: string };
    readonly archived: boolean;
    readonly properties: Readonly<Record<string, RawPropertyValue>>;
    readonly last_edited_time: string;
  },
  classification: ClassificationLevel,
): NotionPage {
  return {
    id: raw.id,
    title: extractPageTitle(raw.properties),
    url: raw.url,
    parentType: raw.parent.type as NotionPage["parentType"],
    parentId: raw.parent.database_id ?? raw.parent.page_id ?? "workspace",
    archived: raw.archived,
    properties: transformProperties(raw.properties),
    lastEditedTime: raw.last_edited_time,
    classification,
  };
}

/** Extract the page title from properties. */
function extractPageTitle(
  properties: Readonly<Record<string, RawPropertyValue>>,
): string {
  for (const prop of Object.values(properties)) {
    if (prop.type === "title" && prop.title) {
      return prop.title.map((t) => t.plain_text).join("");
    }
  }
  return "Untitled";
}

/** Transform all property values to simplified domain types. */
function transformProperties(
  raw: Readonly<Record<string, RawPropertyValue>>,
): Readonly<Record<string, NotionPropertyValue>> {
  const result: Record<string, NotionPropertyValue> = {};
  for (const [key, prop] of Object.entries(raw)) {
    result[key] = transformPropertyValue(prop);
  }
  return result;
}

/** Transform a single property value to our simplified type. */
function transformPropertyValue(raw: RawPropertyValue): NotionPropertyValue {
  switch (raw.type) {
    case "title":
      return { type: "title", value: raw.title?.map((t) => t.plain_text).join("") ?? "" };
    case "rich_text":
      return { type: "rich_text", value: raw.rich_text?.map((t) => t.plain_text).join("") ?? "" };
    case "number":
      return { type: "number", value: raw.number };
    case "select":
      return { type: "select", value: raw.select?.name ?? null };
    case "multi_select":
      return { type: "multi_select", value: raw.multi_select?.map((s) => s.name) ?? [] };
    case "date":
      return { type: "date", value: raw.date };
    case "checkbox":
      return { type: "checkbox", value: raw.checkbox };
    case "url":
      return { type: "url", value: raw.url };
    case "email":
      return { type: "email", value: raw.email };
    case "phone_number":
      return { type: "phone_number", value: raw.phone_number };
    case "status":
      return { type: "status", value: raw.status?.name ?? null };
    case "relation":
      return { type: "relation", value: raw.relation?.map((r) => r.id) ?? [] };
    default:
      return { type: raw.type, value: null };
  }
}

/** Transform a raw search result item. */
export function transformRawSearchResult(
  raw: {
    readonly id: string;
    readonly object: string;
    readonly url: string;
    readonly last_edited_time: string;
    readonly properties?: Readonly<Record<string, RawPropertyValue>>;
    readonly title?: readonly { readonly plain_text: string }[];
  },
): NotionSearchResult {
  let title = "Untitled";
  if (raw.title) {
    title = raw.title.map((t) => t.plain_text).join("");
  } else if (raw.properties) {
    title = extractPageTitle(raw.properties);
  }

  return {
    type: raw.object === "database" ? "database" : "page",
    id: raw.id,
    title,
    url: raw.url,
    lastEditedTime: raw.last_edited_time,
  };
}

/** Transform a raw database response. */
export function transformRawDatabase(
  raw: {
    readonly id: string;
    readonly title: readonly { readonly plain_text: string }[];
    readonly url: string;
    readonly parent: { readonly page_id?: string };
    readonly properties: Readonly<Record<string, RawPropertySchema>>;
  },
  classification: ClassificationLevel,
): NotionDatabase {
  return {
    id: raw.id,
    title: raw.title.map((t) => t.plain_text).join(""),
    url: raw.url,
    parentId: raw.parent.page_id ?? "workspace",
    properties: transformPropertySchemas(raw.properties),
    classification,
  };
}

/** Transform property schemas from a database. */
function transformPropertySchemas(
  raw: Readonly<Record<string, RawPropertySchema>>,
): Readonly<Record<string, NotionPropertySchema>> {
  const result: Record<string, NotionPropertySchema> = {};
  for (const [key, prop] of Object.entries(raw)) {
    result[key] = { id: prop.id, type: prop.type, name: prop.name ?? key };
  }
  return result;
}

/** Convert a NotionBlock to Notion API raw block format for write operations. */
export function blockToRawBlock(block: NotionBlock): Record<string, unknown> {
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
