/**
 * Agent task prompt builders for the explore tool.
 *
 * Each function builds a system prompt for a specific sub-agent facet
 * (tree structure, manifest/dependencies, code patterns, focus search,
 * import graph tracing, git history analysis).
 *
 * @module
 */

import type { ExploreDepth } from "./tools_defs.ts";

/** Internal agent task descriptor. */
export interface AgentTask {
  readonly name: string;
  readonly prompt: string;
}

/**
 * Build the agent task prompt for the tree-structure agent.
 */
function buildTreePrompt(path: string): string {
  return `List the directory structure of "${path}" recursively (max 3 levels deep). Use list_directory to explore each level. Identify key files by convention (mod.ts, main.ts, index.ts, deno.json, package.json, README.md, SKILL.md, CLAUDE.md).

Return your findings as a formatted tree with annotations. Format:
\`\`\`
path/
├── src/
│   ├── core/        # Core types and policy
│   ├── agent/       # LLM orchestration
│   └── mod.ts       # Barrel export
├── tests/
├── deno.json        # Project config
└── README.md        # Documentation
\`\`\`

Only use read-only tools: list_directory, read_file, search_files.`;
}

/**
 * Build the agent task prompt for the manifest/dependency agent.
 */
function buildManifestPrompt(path: string): string {
  return `Read dependency manifests and config files at "${path}" (look for: deno.json, deno.jsonc, package.json, tsconfig.json, README.md, CLAUDE.md, Makefile). Use read_file to read each one that exists.

Report in this format:
## Dependencies
- List each dependency with version

## Scripts/Tasks
- List each script/task and what it does

## Entry Points
- List entry point files

## Project Metadata
- Name, description, runtime, etc.

Only use read-only tools: list_directory, read_file, search_files.`;
}

/**
 * Build the agent task prompt for the code patterns agent.
 */
function buildPatternPrompt(path: string): string {
  return `Analyze source files in "${path}" to detect coding patterns and conventions. Read a sampling of source files (prefer mod.ts, types files, and main entry points — read files under 200 lines fully, for larger files read headers + exports only).

Detect and report these patterns:
- **Module structure**: How code is organized (barrel exports, one-concept-per-file, etc.)
- **Error handling**: Result types vs thrown exceptions vs error codes
- **Type conventions**: Branded types, interface vs type, readonly usage
- **Import style**: Bare specifiers, URL imports, relative paths, barrel imports
- **Naming**: camelCase, snake_case, PascalCase conventions
- **Testing**: Test file naming, test framework, assertion style

For each pattern, give the pattern name, a description, and 1-2 file path examples.

Only use read-only tools: list_directory, read_file, search_files.`;
}

/**
 * Build the agent task prompt for focused exploration.
 */
function buildFocusPrompt(path: string, focus: string): string {
  return `Search "${path}" for files and patterns related to: "${focus}".

Use search_files with content_search to find relevant code, then use read_file to read the most relevant files. Summarize your findings that answer the focus question.

Structure your response as:
## Relevant Files
- List files related to the focus, with brief annotation

## Key Findings
- Summarize what you found about "${focus}"

## Code Examples
- Include short relevant code snippets if helpful

Only use read-only tools: list_directory, read_file, search_files.`;
}

/**
 * Build the agent task prompt for import graph tracing.
 */
function buildImportPrompt(path: string): string {
  return `Trace import graphs starting from entry points in "${path}". Look for mod.ts, main.ts, or index.ts as starting points, then follow imports.

Report:
## Entry Points
- List entry point files found

## Module Dependencies
- Which modules depend on which (top-level)

## Circular Dependencies
- Report any circular import chains found (or "None detected")

Only use read-only tools: list_directory, read_file, search_files.`;
}

/**
 * Build the agent task prompt for git history analysis.
 */
function buildGitPrompt(path: string): string {
  return `Analyze git state at "${path}". Run these read-only commands:
1. run_command: "git -C ${path} log --oneline -20"
2. run_command: "git -C ${path} status --short"
3. run_command: "git -C ${path} branch -a"

Report:
## Recent Commits
- List the last 20 commits

## Current State
- Branch name, any uncommitted changes

## Active Branches
- List local and remote branches

Only use read-only tools: run_command, read_file.`;
}

/** Append pattern task when depth allows. */
function appendPatternTask(
  tasks: AgentTask[],
  path: string,
  depth: ExploreDepth,
): void {
  if (depth === "standard" || depth === "deep") {
    tasks.push({ name: "pattern", prompt: buildPatternPrompt(path) });
  }
}

/** Append focus task when focus is provided and depth allows. */
function appendFocusTask(
  tasks: AgentTask[],
  path: string,
  depth: ExploreDepth,
  focus?: string,
): void {
  if (focus && (depth === "standard" || depth === "deep")) {
    tasks.push({ name: "focus", prompt: buildFocusPrompt(path, focus) });
  }
}

/** Append deep-only tasks (import graph + git history). */
function appendDeepTasks(
  tasks: AgentTask[],
  path: string,
  depth: ExploreDepth,
): void {
  if (depth === "deep") {
    tasks.push({ name: "import", prompt: buildImportPrompt(path) });
    tasks.push({ name: "git", prompt: buildGitPrompt(path) });
  }
}

/**
 * Build agent tasks based on the depth level and focus.
 */
export function buildAgentTasks(
  path: string,
  depth: ExploreDepth,
  focus?: string,
): readonly AgentTask[] {
  const tasks: AgentTask[] = [];

  tasks.push({ name: "tree", prompt: buildTreePrompt(path) });
  tasks.push({ name: "manifest", prompt: buildManifestPrompt(path) });
  appendPatternTask(tasks, path, depth);
  appendFocusTask(tasks, path, depth, focus);
  appendDeepTasks(tasks, path, depth);

  return tasks;
}
