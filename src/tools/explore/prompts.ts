/**
 * Explore prompt builder — single-agent codebase exploration.
 *
 * Builds a depth-aware prompt for a single agent to explore
 * a directory and return structured findings using read-only tools.
 *
 * @module
 */

import type { ExploreDepth } from "./tools_defs.ts";

/** Build core exploration instructions common to all depths. */
function buildCoreInstructions(path: string): string {
  return (
    `Explore the directory "${path}" and report your findings.\n\n` +
    "Use ONLY read-only tools: list_directory, read_file, search_files.\n\n" +
    "Start by listing the directory structure (max 3 levels). " +
    "Identify key files (mod.ts, main.ts, index.ts, deno.json, package.json, README.md, SKILL.md)."
  );
}

/** Build depth-specific exploration instructions. */
function buildDepthInstructions(depth: ExploreDepth): string {
  if (depth === "shallow") {
    return "Report the directory tree and key files only. Keep it brief.";
  }
  const standard =
    "Read dependency manifests (deno.json, package.json, tsconfig.json) and key config files.\n" +
    "Detect coding patterns: module structure, error handling, type conventions, import style, naming.\n" +
    "For each pattern, name it and give 1-2 file path examples.";
  if (depth === "standard") return standard;
  return (
    standard +
    "\nTrace imports from entry points to map module dependencies.\n" +
    "Check git status: recent commits (git log --oneline -10), current branch, uncommitted changes."
  );
}

/** Build focus instructions when a focus query is provided. */
function buildFocusInstructions(focus: string): string {
  return (
    `\nPriority focus: search for "${focus}". ` +
    "Use search_files with content search to find relevant code, " +
    "then read the most relevant files. Report focus findings prominently."
  );
}

/** Build output format instructions scaled by depth. */
function buildFormatInstructions(depth: ExploreDepth): string {
  const sections = ["## Directory Structure", "## Key Files"];
  if (depth !== "shallow") {
    sections.push("## Dependencies", "## Patterns & Conventions");
  }
  if (depth === "deep") {
    sections.push("## Module Dependencies", "## Git Status");
  }
  return (
    `\nFormat your response with these sections:\n${sections.join("\n")}\n\n` +
    "Be concise. End with a 2-3 sentence summary."
  );
}

/**
 * Build a single comprehensive explore prompt.
 *
 * Combines all exploration facets into one prompt, scaled by depth.
 */
export function buildExplorePrompt(
  path: string,
  depth: ExploreDepth,
  focus?: string,
): string {
  const parts = [
    buildCoreInstructions(path),
    buildDepthInstructions(depth),
  ];
  if (focus) parts.push(buildFocusInstructions(focus));
  parts.push(buildFormatInstructions(depth));
  return parts.join("\n\n");
}
