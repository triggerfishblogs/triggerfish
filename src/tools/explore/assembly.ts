/**
 * Result assembly for the explore tool.
 *
 * Combines parsed agent responses into a structured ExploreResult,
 * enforcing token budget limits (max key files, max patterns).
 * Also provides template-based summary generation as a fallback.
 *
 * @module
 */

import type { ExploreDepth, ExploreResult, KeyFile } from "./tools_defs.ts";
import { extractKeyFiles, extractPatterns, truncateTree } from "./parsers.ts";

/** Maximum limits for token budget enforcement. */
const MAX_KEY_FILES = 20;
const MAX_PATTERNS = 8;

/** Deduplicate key files by path, preserving first occurrence. */
function deduplicateKeyFiles(files: readonly KeyFile[]): KeyFile[] {
  const seen = new Set<string>();
  const result: KeyFile[] = [];
  for (const f of files) {
    if (!seen.has(f.path)) {
      seen.add(f.path);
      result.push(f);
    }
  }
  return result;
}

/** Build the dependencies section from manifest and import agent text. */
function buildDependenciesSection(
  manifestText: string,
  importText: string,
): string {
  const parts: string[] = [];
  if (manifestText) parts.push(manifestText);
  if (importText) parts.push(importText);
  return parts.join("\n\n---\n\n");
}

/** Build tree output, appending git status if available. */
function buildTreeOutput(treeText: string, gitText: string): string {
  if (!gitText) return treeText;
  return `${treeText}\n\n--- Git Status ---\n${gitText}`;
}

/**
 * Build a template-based summary when no LLM summarizer is available.
 */
export function buildTemplateSummary(
  result: Omit<ExploreResult, "summary">,
): string {
  const parts: string[] = [];
  parts.push(`Explored ${result.path} (${result.depth} depth).`);
  if (result.key_files.length > 0) {
    parts.push(`Found ${result.key_files.length} key file(s).`);
  }
  if (result.patterns.length > 0) {
    parts.push(
      `Detected ${result.patterns.length} pattern(s): ${
        result.patterns.map((p) => p.name).join(", ")
      }.`,
    );
  }
  if (result.focus_findings) {
    parts.push("Focus findings included.");
  }
  return parts.join(" ");
}

/**
 * Assemble agent responses into a structured ExploreResult.
 */
export function assembleResult(
  path: string,
  depth: ExploreDepth,
  agentResults: ReadonlyMap<string, string>,
): Omit<ExploreResult, "summary"> {
  const treeText = agentResults.get("tree") ?? "";
  const manifestText = agentResults.get("manifest") ?? "";
  const patternText = agentResults.get("pattern") ?? "";
  const focusText = agentResults.get("focus") ?? "";
  const importText = agentResults.get("import") ?? "";
  const gitText = agentResults.get("git") ?? "";

  const allKeyFiles = [
    ...extractKeyFiles(treeText),
    ...extractKeyFiles(manifestText),
  ];

  return {
    path,
    depth,
    tree: truncateTree(buildTreeOutput(treeText, gitText)),
    key_files: deduplicateKeyFiles(allKeyFiles).slice(0, MAX_KEY_FILES),
    patterns: (patternText ? extractPatterns(patternText) : []).slice(
      0,
      MAX_PATTERNS,
    ),
    dependencies: buildDependenciesSection(manifestText, importText),
    focus_findings: focusText || "",
  };
}
