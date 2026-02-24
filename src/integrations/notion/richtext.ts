/**
 * Bidirectional markdown ↔ Notion block conversion.
 *
 * Two pure functions with no external dependencies:
 * - markdownToNotionBlocks: Parse markdown into Notion API block objects
 * - notionBlocksToMarkdown: Render Notion blocks to clean readable text
 *
 * @module
 */

import type {
  NotionAnnotations,
  NotionBlock,
  NotionBlockContent,
  NotionRichText,
} from "./types.ts";

// ─── Constants ────────────────────────────────────────────────────────────────

const DEFAULT_ANNOTATIONS: NotionAnnotations = {
  bold: false,
  italic: false,
  strikethrough: false,
  underline: false,
  code: false,
};

// ─── Markdown → Notion Blocks ────────────────────────────────────────────────

/**
 * Parse inline markdown formatting into Notion rich text elements.
 *
 * Handles bold, italic, strikethrough, code, and links.
 */
export function parseInlineMarkdown(text: string): readonly NotionRichText[] {
  const result: NotionRichText[] = [];
  let remaining = text;

  while (remaining.length > 0) {
    const match = findNextInlineMatch(remaining);
    if (!match) {
      if (remaining.length > 0) {
        result.push(createPlainText(remaining));
      }
      break;
    }

    if (match.index > 0) {
      result.push(createPlainText(remaining.slice(0, match.index)));
    }

    result.push(match.richText);
    remaining = remaining.slice(match.index + match.length);
  }

  return result.length > 0 ? result : [createPlainText("")];
}

/** Result of finding an inline markdown pattern. */
interface InlineMatch {
  readonly index: number;
  readonly length: number;
  readonly richText: NotionRichText;
}

/** Find the next inline markdown pattern in text. */
function findNextInlineMatch(text: string): InlineMatch | null {
  const patterns: {
    readonly regex: RegExp;
    readonly toRichText: (m: RegExpMatchArray) => NotionRichText;
    readonly getLength: (m: RegExpMatchArray) => number;
  }[] = [
    {
      regex: /\[([^\]]+)\]\(([^)]+)\)/,
      toRichText: (m) => ({
        type: "text",
        text: m[1],
        annotations: DEFAULT_ANNOTATIONS,
        href: m[2],
      }),
      getLength: (m) => m[0].length,
    },
    {
      regex: /`([^`]+)`/,
      toRichText: (m) => ({
        type: "text",
        text: m[1],
        annotations: { ...DEFAULT_ANNOTATIONS, code: true },
        href: null,
      }),
      getLength: (m) => m[0].length,
    },
    {
      regex: /\*\*([^*]+)\*\*/,
      toRichText: (m) => ({
        type: "text",
        text: m[1],
        annotations: { ...DEFAULT_ANNOTATIONS, bold: true },
        href: null,
      }),
      getLength: (m) => m[0].length,
    },
    {
      regex: /~~([^~]+)~~/,
      toRichText: (m) => ({
        type: "text",
        text: m[1],
        annotations: { ...DEFAULT_ANNOTATIONS, strikethrough: true },
        href: null,
      }),
      getLength: (m) => m[0].length,
    },
    {
      regex: /\*([^*]+)\*/,
      toRichText: (m) => ({
        type: "text",
        text: m[1],
        annotations: { ...DEFAULT_ANNOTATIONS, italic: true },
        href: null,
      }),
      getLength: (m) => m[0].length,
    },
  ];

  let best: InlineMatch | null = null;
  for (const pat of patterns) {
    const m = text.match(pat.regex);
    if (m && m.index !== undefined) {
      if (!best || m.index < best.index) {
        best = {
          index: m.index,
          length: pat.getLength(m),
          richText: pat.toRichText(m),
        };
      }
    }
  }
  return best;
}

/** Create a plain text rich text element. */
function createPlainText(text: string): NotionRichText {
  return {
    type: "text",
    text,
    annotations: DEFAULT_ANNOTATIONS,
    href: null,
  };
}

/** Create a block with standard structure. */
function createBlock(
  type: string,
  content: NotionBlockContent,
): NotionBlock {
  return {
    id: "",
    type,
    hasChildren: false,
    content,
  };
}

/**
 * Convert a markdown string into Notion API block objects.
 *
 * Supports headings, paragraphs, bullet/numbered lists, checkboxes,
 * code fences, blockquotes, dividers, and inline formatting.
 */
export function markdownToNotionBlocks(markdown: string): readonly NotionBlock[] {
  const lines = markdown.split("\n");
  const blocks: NotionBlock[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Code fence
    if (line.startsWith("```")) {
      const { block, nextIndex } = parseCodeFence(lines, i);
      blocks.push(block);
      i = nextIndex;
      continue;
    }

    // Divider
    if (line.trim() === "---" || line.trim() === "***" || line.trim() === "___") {
      blocks.push(createBlock("divider", {}));
      i++;
      continue;
    }

    // Heading
    const headingMatch = line.match(/^(#{1,3})\s+(.+)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const headingType = `heading_${level}`;
      blocks.push(createBlock(headingType, {
        richText: parseInlineMarkdown(headingMatch[2]),
      }));
      i++;
      continue;
    }

    // Blockquote
    if (line.startsWith("> ") || line === ">") {
      const text = line.startsWith("> ") ? line.slice(2) : "";
      blocks.push(createBlock("quote", {
        richText: parseInlineMarkdown(text),
      }));
      i++;
      continue;
    }

    // Checkbox (to_do)
    const todoMatch = line.match(/^- \[([ xX])\]\s+(.+)$/);
    if (todoMatch) {
      blocks.push(createBlock("to_do", {
        richText: parseInlineMarkdown(todoMatch[2]),
        checked: todoMatch[1] !== " ",
      }));
      i++;
      continue;
    }

    // Bullet list
    if (line.startsWith("- ") || line.startsWith("* ")) {
      blocks.push(createBlock("bulleted_list_item", {
        richText: parseInlineMarkdown(line.slice(2)),
      }));
      i++;
      continue;
    }

    // Numbered list
    const numberedMatch = line.match(/^(\d+)\.\s+(.+)$/);
    if (numberedMatch) {
      blocks.push(createBlock("numbered_list_item", {
        richText: parseInlineMarkdown(numberedMatch[2]),
      }));
      i++;
      continue;
    }

    // Empty line (skip)
    if (line.trim() === "") {
      i++;
      continue;
    }

    // Paragraph (default)
    blocks.push(createBlock("paragraph", {
      richText: parseInlineMarkdown(line),
    }));
    i++;
  }

  return blocks;
}

/** Parse a code fence starting at the given line index. */
function parseCodeFence(
  lines: string[],
  startIndex: number,
): { block: NotionBlock; nextIndex: number } {
  const openLine = lines[startIndex];
  const language = openLine.slice(3).trim() || undefined;
  const codeLines: string[] = [];
  let i = startIndex + 1;

  while (i < lines.length && !lines[i].startsWith("```")) {
    codeLines.push(lines[i]);
    i++;
  }

  // Skip closing fence
  if (i < lines.length) i++;

  return {
    block: createBlock("code", {
      richText: [createPlainText(codeLines.join("\n"))],
      language,
    }),
    nextIndex: i,
  };
}

// ─── Notion Blocks → Markdown ────────────────────────────────────────────────

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

/** Render a single rich text element with annotations. */
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
