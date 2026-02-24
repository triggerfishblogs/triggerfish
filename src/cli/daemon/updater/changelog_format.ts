/**
 * Changelog formatting — render release notes for terminal and markdown output.
 *
 * @module
 */

import type { ChangelogRange } from "./changelog.ts";

/**
 * Format a changelog range as plain text for terminal display.
 *
 * Each release is rendered as a bordered section with the tag and date,
 * followed by the release body.
 */
export function formatChangelogPlainText(range: ChangelogRange): string {
  if (range.releases.length === 0) {
    return `No releases found between ${range.from} and ${range.to}.`;
  }

  const sections: string[] = [];
  for (const release of [...range.releases].reverse()) {
    const date = release.publishedAt
      ? ` (${release.publishedAt.split("T")[0]})`
      : "";
    const header = `═══ ${release.tag}${date} ═══`;
    const body = release.body.trim() || "(no release notes)";
    sections.push(`${header}\n${body}`);
  }
  return sections.join("\n\n");
}

/**
 * Format a changelog range as markdown.
 *
 * Each release becomes an h3 heading with its body as markdown content.
 */
export function formatChangelogMarkdown(range: ChangelogRange): string {
  if (range.releases.length === 0) {
    return `No releases found between ${range.from} and ${range.to}.`;
  }

  const sections: string[] = [];
  for (const release of [...range.releases].reverse()) {
    const date = release.publishedAt
      ? ` (${release.publishedAt.split("T")[0]})`
      : "";
    const title = release.name !== release.tag
      ? `${release.tag}: ${release.name}`
      : release.tag;
    const header = `### ${title}${date}`;
    const body = release.body.trim() || "_No release notes._";
    sections.push(`${header}\n\n${body}`);
  }
  return sections.join("\n\n---\n\n");
}

/**
 * Concatenate all release bodies for summarization input.
 *
 * Returns a single string with all release notes separated by headers,
 * suitable for passing to an LLM for summarization.
 */
export function formatChangelogConcatenated(range: ChangelogRange): string {
  if (range.releases.length === 0) {
    return `No releases found between ${range.from} and ${range.to}.`;
  }

  const sections: string[] = [];
  for (const release of [...range.releases].reverse()) {
    const body = release.body.trim();
    if (body.length > 0) {
      sections.push(`[${release.tag}]\n${body}`);
    }
  }
  return sections.join("\n\n");
}
