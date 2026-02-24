import { assertEquals } from "@std/assert";
import {
  markdownToNotionBlocks,
  notionBlocksToMarkdown,
  parseInlineMarkdown,
} from "../../../src/integrations/notion/richtext.ts";
import type {
  NotionBlock,
  NotionRichText,
} from "../../../src/integrations/notion/types.ts";

/** Create a test block with standard structure. */
function makeBlock(
  type: string,
  text: string,
  opts?: {
    checked?: boolean;
    language?: string;
    children?: readonly NotionBlock[];
  },
): NotionBlock {
  return {
    id: "test-id",
    type,
    hasChildren: !!opts?.children,
    content: {
      richText: [{
        type: "text",
        text,
        annotations: {
          bold: false,
          italic: false,
          strikethrough: false,
          underline: false,
          code: false,
        },
        href: null,
      }],
      checked: opts?.checked,
      language: opts?.language,
    },
    children: opts?.children,
  };
}

// ─── markdownToNotionBlocks ──────────────────────────────────────────────────

Deno.test("markdownToNotionBlocks: converts heading 1", () => {
  const blocks = markdownToNotionBlocks("# Title");
  assertEquals(blocks.length, 1);
  assertEquals(blocks[0].type, "heading_1");
  assertEquals(blocks[0].content.richText?.[0].text, "Title");
});

Deno.test("markdownToNotionBlocks: converts heading 2", () => {
  const blocks = markdownToNotionBlocks("## Subtitle");
  assertEquals(blocks.length, 1);
  assertEquals(blocks[0].type, "heading_2");
  assertEquals(blocks[0].content.richText?.[0].text, "Subtitle");
});

Deno.test("markdownToNotionBlocks: converts heading 3", () => {
  const blocks = markdownToNotionBlocks("### Section");
  assertEquals(blocks.length, 1);
  assertEquals(blocks[0].type, "heading_3");
  assertEquals(blocks[0].content.richText?.[0].text, "Section");
});

Deno.test("markdownToNotionBlocks: converts paragraph", () => {
  const blocks = markdownToNotionBlocks("Hello world");
  assertEquals(blocks.length, 1);
  assertEquals(blocks[0].type, "paragraph");
  assertEquals(blocks[0].content.richText?.[0].text, "Hello world");
});

Deno.test("markdownToNotionBlocks: converts bullet list", () => {
  const blocks = markdownToNotionBlocks("- Item 1");
  assertEquals(blocks.length, 1);
  assertEquals(blocks[0].type, "bulleted_list_item");
  assertEquals(blocks[0].content.richText?.[0].text, "Item 1");
});

Deno.test("markdownToNotionBlocks: converts numbered list", () => {
  const blocks = markdownToNotionBlocks("1. First");
  assertEquals(blocks.length, 1);
  assertEquals(blocks[0].type, "numbered_list_item");
  assertEquals(blocks[0].content.richText?.[0].text, "First");
});

Deno.test("markdownToNotionBlocks: converts unchecked todo", () => {
  const blocks = markdownToNotionBlocks("- [ ] Task");
  assertEquals(blocks.length, 1);
  assertEquals(blocks[0].type, "to_do");
  assertEquals(blocks[0].content.checked, false);
  assertEquals(blocks[0].content.richText?.[0].text, "Task");
});

Deno.test("markdownToNotionBlocks: converts checked todo", () => {
  const blocks = markdownToNotionBlocks("- [x] Done");
  assertEquals(blocks.length, 1);
  assertEquals(blocks[0].type, "to_do");
  assertEquals(blocks[0].content.checked, true);
  assertEquals(blocks[0].content.richText?.[0].text, "Done");
});

Deno.test("markdownToNotionBlocks: converts code fence", () => {
  const blocks = markdownToNotionBlocks("```js\nconsole.log();\n```");
  assertEquals(blocks.length, 1);
  assertEquals(blocks[0].type, "code");
  assertEquals(blocks[0].content.language, "js");
  assertEquals(blocks[0].content.richText?.[0].text, "console.log();");
});

Deno.test("markdownToNotionBlocks: converts blockquote", () => {
  const blocks = markdownToNotionBlocks("> Quote");
  assertEquals(blocks.length, 1);
  assertEquals(blocks[0].type, "quote");
  assertEquals(blocks[0].content.richText?.[0].text, "Quote");
});

Deno.test("markdownToNotionBlocks: converts divider", () => {
  const blocks = markdownToNotionBlocks("---");
  assertEquals(blocks.length, 1);
  assertEquals(blocks[0].type, "divider");
});

Deno.test("markdownToNotionBlocks: skips empty lines", () => {
  const blocks = markdownToNotionBlocks("Line 1\n\nLine 2");
  assertEquals(blocks.length, 2);
  assertEquals(blocks[0].type, "paragraph");
  assertEquals(blocks[1].type, "paragraph");
  assertEquals(blocks[0].content.richText?.[0].text, "Line 1");
  assertEquals(blocks[1].content.richText?.[0].text, "Line 2");
});

// ─── parseInlineMarkdown ─────────────────────────────────────────────────────

Deno.test("parseInlineMarkdown: parses bold", () => {
  const result = parseInlineMarkdown("**bold**");
  assertEquals(result.length, 1);
  assertEquals(result[0].text, "bold");
  assertEquals(result[0].annotations.bold, true);
});

Deno.test("parseInlineMarkdown: parses italic", () => {
  const result = parseInlineMarkdown("*italic*");
  assertEquals(result.length, 1);
  assertEquals(result[0].text, "italic");
  assertEquals(result[0].annotations.italic, true);
});

Deno.test("parseInlineMarkdown: parses strikethrough", () => {
  const result = parseInlineMarkdown("~~strike~~");
  assertEquals(result.length, 1);
  assertEquals(result[0].text, "strike");
  assertEquals(result[0].annotations.strikethrough, true);
});

Deno.test("parseInlineMarkdown: parses inline code", () => {
  const result = parseInlineMarkdown("`code`");
  assertEquals(result.length, 1);
  assertEquals(result[0].text, "code");
  assertEquals(result[0].annotations.code, true);
});

Deno.test("parseInlineMarkdown: parses links", () => {
  const result = parseInlineMarkdown("[text](url)");
  assertEquals(result.length, 1);
  assertEquals(result[0].text, "text");
  assertEquals(result[0].href, "url");
});

Deno.test("parseInlineMarkdown: parses plain text", () => {
  const result = parseInlineMarkdown("hello");
  assertEquals(result.length, 1);
  assertEquals(result[0].text, "hello");
  assertEquals(result[0].annotations.bold, false);
  assertEquals(result[0].annotations.italic, false);
  assertEquals(result[0].annotations.strikethrough, false);
  assertEquals(result[0].annotations.code, false);
  assertEquals(result[0].href, null);
});

// ─── notionBlocksToMarkdown ─────────────────────────────────────────────────

Deno.test("notionBlocksToMarkdown: renders heading", () => {
  const blocks = [makeBlock("heading_1", "Title")];
  const md = notionBlocksToMarkdown(blocks);
  assertEquals(md, "# Title");
});

Deno.test("notionBlocksToMarkdown: renders paragraph", () => {
  const blocks = [makeBlock("paragraph", "Some text")];
  const md = notionBlocksToMarkdown(blocks);
  assertEquals(md, "Some text");
});

Deno.test("notionBlocksToMarkdown: renders bullet list", () => {
  const blocks = [makeBlock("bulleted_list_item", "Item")];
  const md = notionBlocksToMarkdown(blocks);
  assertEquals(md, "- Item");
});

Deno.test("notionBlocksToMarkdown: renders code block", () => {
  const blocks = [makeBlock("code", "console.log();", { language: "js" })];
  const md = notionBlocksToMarkdown(blocks);
  assertEquals(md, "```js\nconsole.log();\n```");
});

Deno.test("notionBlocksToMarkdown: renders unsupported type", () => {
  const blocks = [makeBlock("table", "")];
  const md = notionBlocksToMarkdown(blocks);
  assertEquals(md, "[unsupported: table]");
});

Deno.test("notionBlocksToMarkdown: renders nested blocks", () => {
  const child = makeBlock("paragraph", "Child text");
  const parent = makeBlock("bulleted_list_item", "Parent", {
    children: [child],
  });
  const md = notionBlocksToMarkdown([parent]);
  assertEquals(md, "- Parent\n  Child text");
});
