/**
 * Markdown parsing tests — frontmatter, wikilinks, tags, headings.
 * All pure function tests.
 */

import { assertEquals, assert } from "@std/assert";
import {
  parseFrontmatter,
  serializeFrontmatter,
  mergeFrontmatter,
  extractWikilinks,
  extractTags,
  extractHeadings,
  buildNote,
} from "../../../src/tools/obsidian/markdown.ts";

// --- Frontmatter parsing ---

Deno.test("parseFrontmatter: extracts YAML between --- delimiters", () => {
  const content = `---
title: My Note
tags:
  - project
  - important
---
# Content here`;

  const result = parseFrontmatter(content);
  assertEquals(result.data.title, "My Note");
  assertEquals(result.data.tags, ["project", "important"]);
  assertEquals(result.body, "# Content here");
});

Deno.test("parseFrontmatter: returns empty data when no frontmatter", () => {
  const content = "# Just a heading\n\nSome content.";
  const result = parseFrontmatter(content);
  assertEquals(result.data, {});
  assertEquals(result.body, content);
  assertEquals(result.raw, "");
});

Deno.test("parseFrontmatter: handles empty frontmatter block", () => {
  const content = "---\n\n---\n# Content";
  const result = parseFrontmatter(content);
  // parseYaml("") returns null, so data should be empty object
  assertEquals(Object.keys(result.data).length, 0);
  assertEquals(result.body, "# Content");
});

Deno.test("parseFrontmatter: handles invalid YAML gracefully", () => {
  const content = "---\n[invalid: yaml: :\n---\n# Content";
  const result = parseFrontmatter(content);
  assertEquals(result.data, {});
  assertEquals(result.body, content);
});

// --- Frontmatter serialization ---

Deno.test("serializeFrontmatter: round-trips frontmatter", () => {
  const original = `---
title: Test
---
# Hello`;

  const { data, body } = parseFrontmatter(original);
  const serialized = serializeFrontmatter(data, body);
  const reparsed = parseFrontmatter(serialized);

  assertEquals(reparsed.data.title, "Test");
  assertEquals(reparsed.body, "# Hello");
});

Deno.test("serializeFrontmatter: returns body only when data is empty", () => {
  const result = serializeFrontmatter({}, "# Just content");
  assertEquals(result, "# Just content");
});

// --- Frontmatter merging ---

Deno.test("mergeFrontmatter: preserves existing keys", () => {
  const existing = { title: "Old", author: "Alice" };
  const update = { title: "New", tags: ["a"] };
  const merged = mergeFrontmatter(existing, update);
  assertEquals(merged.title, "New");
  assertEquals(merged.author, "Alice");
  assertEquals(merged.tags, ["a"]);
});

// --- Wikilink extraction ---

Deno.test("extractWikilinks: simple wikilinks", () => {
  const content = "Link to [[Note A]] and [[Note B]].";
  const links = extractWikilinks(content);
  assertEquals(links, ["Note A", "Note B"]);
});

Deno.test("extractWikilinks: aliased wikilinks", () => {
  const content = "See [[Target Note|display text]] for details.";
  const links = extractWikilinks(content);
  assertEquals(links, ["Target Note"]);
});

Deno.test("extractWikilinks: embedded wikilinks", () => {
  const content = "Embed this: ![[Embedded Note]]";
  const links = extractWikilinks(content);
  assertEquals(links, ["Embedded Note"]);
});

Deno.test("extractWikilinks: path-based wikilinks", () => {
  const content = "See [[folder/subfolder/Note]].";
  const links = extractWikilinks(content);
  assertEquals(links, ["folder/subfolder/Note"]);
});

Deno.test("extractWikilinks: deduplicates", () => {
  const content = "[[Note A]] and again [[Note A]] and [[Note A|alias]].";
  const links = extractWikilinks(content);
  assertEquals(links, ["Note A"]);
});

// --- Tag extraction ---

Deno.test("extractTags: from frontmatter array", () => {
  const tags = extractTags("content", { tags: ["project", "important"] });
  assert(tags.includes("project"));
  assert(tags.includes("important"));
});

Deno.test("extractTags: from frontmatter string", () => {
  const tags = extractTags("content", { tags: "single-tag" });
  assert(tags.includes("single-tag"));
});

Deno.test("extractTags: inline tags from content", () => {
  const tags = extractTags("Some text #project and #todo here", {});
  assert(tags.includes("project"));
  assert(tags.includes("todo"));
});

Deno.test("extractTags: deduplicates across sources", () => {
  const tags = extractTags("Text #project here", { tags: ["project"] });
  const count = tags.filter((t) => t === "project").length;
  assertEquals(count, 1);
});

Deno.test("extractTags: strips leading # from frontmatter tags", () => {
  const tags = extractTags("content", { tags: ["#tagged"] });
  assert(tags.includes("tagged"));
  assert(!tags.includes("#tagged"));
});

// --- Heading extraction ---

Deno.test("extractHeadings: extracts all heading levels", () => {
  const content = `# H1
## H2
### H3
#### H4
##### H5
###### H6`;

  const headings = extractHeadings(content);
  assertEquals(headings.length, 6);
  assertEquals(headings[0], { level: 1, text: "H1" });
  assertEquals(headings[5], { level: 6, text: "H6" });
});

Deno.test("extractHeadings: ignores non-heading # usage", () => {
  const content = "Some text with #hashtag\n\n# Real Heading\n\nMore text";
  const headings = extractHeadings(content);
  assertEquals(headings.length, 1);
  assertEquals(headings[0].text, "Real Heading");
});

// --- buildNote ---

Deno.test("buildNote: combines all parsers", () => {
  const content = `---
tags:
  - test
---
# My Note

Link to [[Other]] and #inline-tag here.

## Section Two`;

  const note = buildNote("folder/my-note.md", content, {
    mtime: new Date("2025-01-01"),
    birthtime: new Date("2024-06-15"),
  });

  assertEquals(note.path, "folder/my-note.md");
  assertEquals(note.name, "my-note");
  assert(note.tags.includes("test"));
  assert(note.tags.includes("inline-tag"));
  assertEquals(note.wikilinks, ["Other"]);
  assertEquals(note.headings.length, 2);
  assertEquals(note.headings[0], { level: 1, text: "My Note" });
  assertEquals(note.headings[1], { level: 2, text: "Section Two" });
});
