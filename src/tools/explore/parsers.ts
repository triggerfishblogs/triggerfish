/**
 * Result parsing and extraction for the explore tool.
 *
 * Extracts key files and code patterns from agent response text
 * using regex-based parsing. Also handles tree output truncation.
 *
 * @module
 */

import type { KeyFile, Pattern } from "./tools_defs.ts";

/** Maximum line count for tree output before truncation. */
const MAX_TREE_DEPTH_LINES = 200;

/** Regex patterns that match file entries in agent response text. */
function buildKeyFilePatterns(): RegExp[] {
  return [
    /^[-*]\s+[`"]?([^\s`"]+\.\w+)[`"]?\s*[-—#:]+\s*(.+)/gm,
    /[├└│─]+\s+([^\s]+\.\w+)\s+#\s*(.+)/gm,
    /^##\s+(.+\.(?:ts|js|json|md|yaml|toml))\b/gm,
  ];
}

/** Collect unique key files from regex matches against text. */
function collectKeyFileMatches(
  text: string,
  patterns: readonly RegExp[],
): KeyFile[] {
  const files: KeyFile[] = [];
  const seen = new Set<string>();
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const path = match[1].replace(/[`"]/g, "");
      if (!seen.has(path) && path.length < 200) {
        seen.add(path);
        files.push({ path, role: match[2]?.trim() ?? "" });
      }
    }
  }
  return files;
}

/**
 * Extract key files from agent response text.
 * Looks for file paths mentioned in the response.
 */
export function extractKeyFiles(text: string): KeyFile[] {
  return collectKeyFileMatches(text, buildKeyFilePatterns());
}

/** Check if a section heading is a non-pattern section to skip. */
function isNonPatternSection(name: string): boolean {
  return /^(relevant|key|code|summary|entry|module|dependencies)/i.test(name);
}

/** Extract up to 3 file path examples from a pattern body. */
function extractPatternExamples(body: string): string[] {
  const examples: string[] = [];
  const matches = body.matchAll(/[`"]([^\s`"]+\.(?:ts|js|json))[`"]/g);
  for (const m of matches) {
    if (examples.length < 3) examples.push(m[1]);
  }
  return examples;
}

/**
 * Extract patterns from agent response text.
 */
export function extractPatterns(text: string): Pattern[] {
  const patterns: Pattern[] = [];
  const sections = text.split(/(?:^|\n)(?:\*\*|##\s+)([^*\n]+)(?:\*\*)?/);

  for (let i = 1; i < sections.length; i += 2) {
    const name = sections[i]?.trim();
    const body = sections[i + 1]?.trim();
    if (!name || !body) continue;
    if (isNonPatternSection(name)) continue;

    patterns.push({
      name,
      description: body.split("\n")[0]?.trim() ?? "",
      examples: extractPatternExamples(body),
    });
  }

  return patterns;
}

/**
 * Truncate tree output to the line limit.
 */
export function truncateTree(tree: string): string {
  const lines = tree.split("\n");
  if (lines.length <= MAX_TREE_DEPTH_LINES) return tree;
  return (
    lines.slice(0, MAX_TREE_DEPTH_LINES).join("\n") +
    `\n... (truncated, ${lines.length - MAX_TREE_DEPTH_LINES} more lines)`
  );
}
