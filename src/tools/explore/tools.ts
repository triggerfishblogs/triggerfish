/**
 * Explore tool — structured codebase understanding via parallel sub-agents.
 *
 * Spawns focused sub-agents to investigate different facets of a codebase
 * (tree structure, patterns, dependencies, focus areas), then assembles
 * their findings into a unified ExploreResult.
 *
 * Types, tool definitions, and system prompt live in `tools_defs.ts`.
 *
 * @module
 */

import type {
  ExploreDepth,
  ExploreResult,
  KeyFile,
  Pattern,
} from "./tools_defs.ts";

// ─── Barrel re-exports from tools_defs.ts ───────────────────────────────────

export {
  EXPLORE_SYSTEM_PROMPT,
  getExploreToolDefinitions,
} from "./tools_defs.ts";
export type {
  ExploreDepth,
  ExploreResult,
  KeyFile,
  Pattern,
} from "./tools_defs.ts";

// ─── Internal types & constants ─────────────────────────────────────────────

/** Internal agent task descriptor. */
interface AgentTask {
  readonly name: string;
  readonly prompt: string;
}

/** Maximum limits for token budget enforcement. */
const MAX_KEY_FILES = 20;
const MAX_PATTERNS = 8;
const MAX_TREE_DEPTH_LINES = 200;

/**
 * Build the agent task prompts for the tree-structure agent.
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

/**
 * Build agent tasks based on the depth level and focus.
 */
export function buildAgentTasks(
  path: string,
  depth: ExploreDepth,
  focus?: string,
): readonly AgentTask[] {
  const tasks: AgentTask[] = [];

  // All depths get tree + manifest
  tasks.push({ name: "tree", prompt: buildTreePrompt(path) });
  tasks.push({ name: "manifest", prompt: buildManifestPrompt(path) });

  // Standard and deep get patterns
  if (depth === "standard" || depth === "deep") {
    tasks.push({ name: "pattern", prompt: buildPatternPrompt(path) });
  }

  // Focus agent when focus is provided (standard+)
  if (focus && (depth === "standard" || depth === "deep")) {
    tasks.push({ name: "focus", prompt: buildFocusPrompt(path, focus) });
  }

  // Deep gets import graph + git
  if (depth === "deep") {
    tasks.push({ name: "import", prompt: buildImportPrompt(path) });
    tasks.push({ name: "git", prompt: buildGitPrompt(path) });
  }

  return tasks;
}

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
function extractKeyFiles(text: string): KeyFile[] {
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
function extractPatterns(text: string): Pattern[] {
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
function truncateTree(tree: string): string {
  const lines = tree.split("\n");
  if (lines.length <= MAX_TREE_DEPTH_LINES) return tree;
  return (
    lines.slice(0, MAX_TREE_DEPTH_LINES).join("\n") +
    `\n... (truncated, ${lines.length - MAX_TREE_DEPTH_LINES} more lines)`
  );
}

/**
 * Build a template-based summary when no LLM summarizer is available.
 */
function buildTemplateSummary(result: Omit<ExploreResult, "summary">): string {
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

/** Parse and validate explore tool input parameters. */
function parseExploreInput(input: Record<string, unknown>): {
  path: string;
  depth: ExploreDepth;
  focus?: string;
} | null {
  const path = input.path;
  if (typeof path !== "string" || path.length === 0) return null;
  const focus = typeof input.focus === "string" && input.focus.length > 0
    ? input.focus
    : undefined;
  const rawDepth = typeof input.depth === "string" ? input.depth : "standard";
  const depth: ExploreDepth = rawDepth === "shallow" || rawDepth === "deep"
    ? rawDepth
    : "standard";
  return { path, depth, focus };
}

/** Spawn all agent tasks concurrently and collect results into a map. */
async function spawnAgentTasks(
  tasks: readonly AgentTask[],
  spawnSubagent: (task: string, tools?: string) => Promise<string>,
): Promise<Map<string, string>> {
  const results = await Promise.all(
    tasks.map(async (task) => {
      try {
        return { name: task.name, response: await spawnSubagent(task.prompt) };
      } catch (err) {
        return {
          name: task.name,
          response: `Error: ${
            err instanceof Error ? err.message : String(err)
          }`,
        };
      }
    }),
  );
  const resultMap = new Map<string, string>();
  for (const r of results) resultMap.set(r.name, r.response);
  return resultMap;
}

/** Build an LLM summary prompt from partial explore results. */
function buildSummaryPrompt(
  partial: Omit<ExploreResult, "summary">,
): string {
  const keyFiles = partial.key_files.map((f) => `${f.path} (${f.role})`)
    .join(", ");
  const patterns = partial.patterns.map((p) => `${p.name}: ${p.description}`)
    .join("; ");
  const focus = partial.focus_findings
    ? `Focus findings: ${partial.focus_findings.slice(0, 1000)}`
    : "";
  return `Summarize these codebase exploration findings in 2-3 concise sentences. Focus on the most important structural and architectural observations:\n\nTree: ${
    partial.tree.slice(0, 2000)
  }\n\nKey files: ${keyFiles}\n\nPatterns: ${patterns}\n\n${focus}`;
}

/** Generate a summary using LLM or template fallback. */
async function generateExploreSummary(
  partial: Omit<ExploreResult, "summary">,
  llmTask?: (prompt: string) => Promise<string>,
): Promise<string> {
  if (!llmTask) return buildTemplateSummary(partial);
  try {
    return await llmTask(buildSummaryPrompt(partial));
  } catch {
    return buildTemplateSummary(partial);
  }
}

/**
 * Create an explore tool executor.
 *
 * @param spawnSubagent - Function to spawn a sub-agent with a task prompt
 * @param llmTask - Optional function for LLM-based summary generation
 * @returns Tool executor that handles `explore` tool calls
 */
export function createExploreToolExecutor(
  spawnSubagent: (task: string, tools?: string) => Promise<string>,
  llmTask?: (prompt: string) => Promise<string>,
): (name: string, input: Record<string, unknown>) => Promise<string | null> {
  return async (
    name: string,
    input: Record<string, unknown>,
  ): Promise<string | null> => {
    if (name !== "explore") return null;

    const parsed = parseExploreInput(input);
    if (!parsed) {
      return "Error: explore requires a non-empty 'path' argument (string).";
    }

    const agentTasks = buildAgentTasks(parsed.path, parsed.depth, parsed.focus);
    const resultMap = await spawnAgentTasks(agentTasks, spawnSubagent);
    const partial = assembleResult(parsed.path, parsed.depth, resultMap);
    const summary = await generateExploreSummary(partial, llmTask);
    return JSON.stringify({ ...partial, summary } as ExploreResult);
  };
}
