/**
 * Notion blocks → markdown renderer.
 *
 * Converts Notion API block objects to clean, human-readable markdown
 * for LLM consumption.
 *
 * @module
 */

import type { NotionBlock, NotionRichText } from "./types.ts";

/**
 * Render Notion blocks to clean readable markdown text.
 *
 * Produces human-readable output for LLM consumption — NOT raw JSON.
 * Unsupported block types render as `[unsupported: {type}]`.
 */
export function notionBlocksToMarkdown(
  blocks: readonly NotionBlock[],
  indent: number = 0,
): string {
  const lines: string[] = [];
  const prefix = "  ".repeat(indent);

  for (const block of blocks) {
    const line = renderBlock(block, prefix);
    if (line !== null) {
      lines.push(line);
    }

    if (block.children && block.children.length > 0) {
      lines.push(notionBlocksToMarkdown(block.children, indent + 1));
    }
  }

  return lines.join("\n");
}

/** Render a single block to its markdown representation. */
function renderBlock(block: NotionBlock, prefix: string): string | null {
  const text = renderRichTextArray(block.content.richText ?? []);

  switch (block.type) {
    case "heading_1":
      return `${prefix}# ${text}`;
    case "heading_2":
      return `${prefix}## ${text}`;
    case "heading_3":
      return `${prefix}### ${text}`;
    case "paragraph":
      return `${prefix}${text}`;
    case "bulleted_list_item":
      return `${prefix}- ${text}`;
    case "numbered_list_item":
      return `${prefix}1. ${text}`;
    case "to_do":
      return block.content.checked
        ? `${prefix}- [x] ${text}`
        : `${prefix}- [ ] ${text}`;
    case "code":
      return `${prefix}\`\`\`${block.content.language ?? ""}\n${text}\n${prefix}\`\`\``;
    case "quote":
      return `${prefix}> ${text}`;
    case "divider":
      return `${prefix}---`;
    case "image":
      return block.content.url
        ? `${prefix}![${text}](${block.content.url})`
        : `${prefix}[image]`;
    default:
      return `${prefix}[unsupported: ${block.type}]`;
  }
}

/** Render an array of rich text elements to a markdown string. */
function renderRichTextArray(richText: readonly NotionRichText[]): string {
  return richText.map(renderRichTextElement).join("");
}

/** Render a single rich text element with annotations applied. */
function renderRichTextElement(rt: NotionRichText): string {
  let text = rt.text;

  if (rt.annotations.code) {
    text = `\`${text}\``;
  }
  if (rt.annotations.bold) {
    text = `**${text}**`;
  }
  if (rt.annotations.italic) {
    text = `*${text}*`;
  }
  if (rt.annotations.strikethrough) {
    text = `~~${text}~~`;
  }
  if (rt.href) {
    text = `[${text}](${rt.href})`;
  }

  return text;
}
