/**
 * Markdown parsing utilities for Obsidian notes.
 *
 * Pure functions for extracting and manipulating frontmatter,
 * wikilinks, tags, and headings from markdown content.
 *
 * @module
 */

import { parse as parseYaml, stringify as stringifyYaml } from "@std/yaml";
import type { Heading, ObsidianNote } from "./types.ts";

/** Parsed frontmatter result. */
export interface FrontmatterResult {
  /** Parsed YAML data (empty object if no frontmatter). */
  readonly data: Readonly<Record<string, unknown>>;
  /** Markdown body after frontmatter. */
  readonly body: string;
  /** Raw frontmatter string (empty if none). */
  readonly raw: string;
}

/** Frontmatter delimiter pattern. */
const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;

/**
 * Parse YAML frontmatter from markdown content.
 *
 * Extracts YAML between `---` delimiters at the start of the file.
 * Returns empty data and full content as body if no frontmatter found.
 */
export function parseFrontmatter(content: string): FrontmatterResult {
  const match = content.match(FRONTMATTER_RE);
  if (!match) {
    return { data: {}, body: content, raw: "" };
  }

  const raw = match[1];
  const body = content.slice(match[0].length);

  try {
    const parsed = parseYaml(raw);
    const data =
      (parsed && typeof parsed === "object" && !Array.isArray(parsed))
        ? parsed as Record<string, unknown>
        : {};
    return { data, body, raw };
  } catch {
    // Invalid YAML — treat as no frontmatter
    return { data: {}, body: content, raw: "" };
  }
}

/**
 * Serialize frontmatter data and body back to markdown.
 *
 * Produces valid YAML frontmatter between `---` delimiters.
 * Returns just the body if data is empty.
 */
export function serializeFrontmatter(
  data: Readonly<Record<string, unknown>>,
  body: string,
): string {
  if (Object.keys(data).length === 0) {
    return body;
  }
  const yaml = stringifyYaml(data as Record<string, unknown>).trimEnd();
  return `---\n${yaml}\n---\n${body}`;
}

/**
 * Merge frontmatter data, preserving existing keys not in the update.
 */
export function mergeFrontmatter(
  existing: Readonly<Record<string, unknown>>,
  update: Readonly<Record<string, unknown>>,
): Readonly<Record<string, unknown>> {
  return { ...existing, ...update };
}

/**
 * Extract wikilink targets from markdown content.
 *
 * Matches `[[target]]`, `[[target|alias]]`, and `![[embed]]`.
 * Returns deduplicated target names.
 */
export function extractWikilinks(content: string): readonly string[] {
  const re = /!?\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g;
  const targets = new Set<string>();
  let match: RegExpExecArray | null;
  while ((match = re.exec(content)) !== null) {
    targets.add(match[1].trim());
  }
  return [...targets];
}

/**
 * Extract tags from markdown content and frontmatter.
 *
 * Collects tags from:
 * - Frontmatter `tags` field (array or single string)
 * - Inline `#tag` patterns in content
 *
 * Returns deduplicated, normalized tags (without leading `#`).
 */
export function extractTags(
  content: string,
  frontmatterData?: Readonly<Record<string, unknown>>,
): readonly string[] {
  const tags = new Set<string>();

  // Frontmatter tags
  if (frontmatterData?.tags) {
    const fmTags = frontmatterData.tags;
    if (Array.isArray(fmTags)) {
      for (const t of fmTags) {
        if (typeof t === "string") tags.add(t.replace(/^#/, ""));
      }
    } else if (typeof fmTags === "string") {
      tags.add(fmTags.replace(/^#/, ""));
    }
  }

  // Inline tags — match #tag but not inside wikilinks or code blocks
  const inlineRe = /(?:^|\s)#([a-zA-Z][a-zA-Z0-9_/-]*)/g;
  let match: RegExpExecArray | null;
  while ((match = inlineRe.exec(content)) !== null) {
    tags.add(match[1]);
  }

  return [...tags];
}

/**
 * Extract headings from markdown content.
 *
 * Matches ATX-style headings (`# Heading` through `###### Heading`).
 */
export function extractHeadings(content: string): readonly Heading[] {
  const re = /^(#{1,6})\s+(.+)$/gm;
  const headings: Heading[] = [];
  let match: RegExpExecArray | null;
  while ((match = re.exec(content)) !== null) {
    headings.push({
      level: match[1].length,
      text: match[2].trim(),
    });
  }
  return headings;
}

/**
 * Build an ObsidianNote from raw file data.
 *
 * Combines all parsers to produce a complete note representation.
 */
export function buildNote(
  relativePath: string,
  content: string,
  stat: { mtime: Date | null; birthtime: Date | null },
): ObsidianNote {
  const { data, body } = parseFrontmatter(content);
  const name = relativePath.replace(/.*\//, "").replace(/\.md$/, "");

  return {
    path: relativePath,
    name,
    content,
    frontmatter: data,
    tags: extractTags(body, data),
    wikilinks: extractWikilinks(body),
    headings: extractHeadings(body),
    createdAt: stat.birthtime ?? new Date(0),
    modifiedAt: stat.mtime ?? new Date(0),
  };
}
