/**
 * Explore tool — structured codebase understanding via parallel sub-agents.
 *
 * Spawns focused sub-agents to investigate different facets of a codebase
 * (tree structure, patterns, dependencies, focus areas), then assembles
 * their findings into a unified ExploreResult.
 *
 * @module
 */

import type { ToolDefinition } from "../../agent/orchestrator.ts";

/** A key file identified during exploration. */
export interface KeyFile {
  readonly path: string;
  readonly role: string;
}

/** A pattern or convention detected in the codebase. */
export interface Pattern {
  readonly name: string;
  readonly description: string;
  readonly examples: readonly string[];
}

/** Structured result from the explore tool. */
export interface ExploreResult {
  readonly path: string;
  readonly depth: ExploreDepth;
  readonly tree: string;
  readonly key_files: readonly KeyFile[];
  readonly patterns: readonly Pattern[];
  readonly dependencies: string;
  readonly focus_findings: string;
  readonly summary: string;
}

/** Exploration depth levels. */
export type ExploreDepth = "shallow" | "standard" | "deep";

/** Internal agent task descriptor. */
interface AgentTask {
  readonly name: string;
  readonly prompt: string;
}

/** Maximum limits for token budget enforcement. */
const MAX_KEY_FILES = 20;
const MAX_PATTERNS = 8;
const MAX_TREE_DEPTH_LINES = 200;

/** Get the explore tool definition. */
export function getExploreToolDefinitions(): readonly ToolDefinition[] {
  return [
    {
      name: "explore",
      description:
        "Explore a directory or codebase to understand structure, patterns, and conventions. Spawns parallel agents for fast, thorough understanding. Read-only.",
      parameters: {
        path: {
          type: "string",
          description: "Directory or file to explore",
          required: true,
        },
        focus: {
          type: "string",
          description:
            "What to look for (e.g. 'auth patterns', 'test structure')",
          required: false,
        },
        depth: {
          type: "string",
          description:
            "How thorough: 'shallow', 'standard' (default), or 'deep'",
          required: false,
        },
      },
    },
  ];
}

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

/**
 * Extract key files from agent response text.
 * Looks for file paths mentioned in the response.
 */
function extractKeyFiles(text: string): KeyFile[] {
  const files: KeyFile[] = [];
  const seen = new Set<string>();

  // Match lines that look like file entries:
  // - path/to/file.ts — description
  // - path/to/file.ts # description
  // ├── file.ts  # description
  const patterns = [
    /^[-*]\s+[`"]?([^\s`"]+\.\w+)[`"]?\s*[-—#:]+\s*(.+)/gm,
    /[├└│─]+\s+([^\s]+\.\w+)\s+#\s*(.+)/gm,
    /^##\s+(.+\.(?:ts|js|json|md|yaml|toml))\b/gm,
  ];

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
 * Extract patterns from agent response text.
 */
function extractPatterns(text: string): Pattern[] {
  const patterns: Pattern[] = [];

  // Split on **pattern_name** or ## Pattern Name headers
  const sections = text.split(/(?:^|\n)(?:\*\*|##\s+)([^*\n]+)(?:\*\*)?/);

  for (let i = 1; i < sections.length; i += 2) {
    const name = sections[i]?.trim();
    const body = sections[i + 1]?.trim();
    if (!name || !body) continue;

    // Skip non-pattern sections
    if (/^(relevant|key|code|summary|entry|module|dependencies)/i.test(name)) {
      continue;
    }

    // Extract examples (file paths from the body)
    const examples: string[] = [];
    const exampleMatches = body.matchAll(
      /[`"]([^\s`"]+\.(?:ts|js|json))[`"]/g,
    );
    for (const m of exampleMatches) {
      if (examples.length < 3) examples.push(m[1]);
    }

    patterns.push({
      name,
      description: body.split("\n")[0]?.trim() ?? "",
      examples,
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
      `Detected ${result.patterns.length} pattern(s): ${result.patterns.map((p) => p.name).join(", ")}.`,
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

  // Extract structured data from agent responses
  const treeKeyFiles = extractKeyFiles(treeText);
  const manifestKeyFiles = extractKeyFiles(manifestText);
  const allKeyFiles = [...treeKeyFiles, ...manifestKeyFiles];

  // Deduplicate key files
  const seenPaths = new Set<string>();
  const dedupedKeyFiles: KeyFile[] = [];
  for (const f of allKeyFiles) {
    if (!seenPaths.has(f.path)) {
      seenPaths.add(f.path);
      dedupedKeyFiles.push(f);
    }
  }

  const detectedPatterns = patternText
    ? extractPatterns(patternText)
    : [];

  // Build dependencies section from manifest + import agents
  const depsParts: string[] = [];
  if (manifestText) depsParts.push(manifestText);
  if (importText) depsParts.push(importText);
  const dependencies = depsParts.join("\n\n---\n\n");

  // Focus findings
  const focus_findings = focusText || "";

  // Tree (includes git info if available)
  let treeOutput = treeText;
  if (gitText) {
    treeOutput += `\n\n--- Git Status ---\n${gitText}`;
  }

  return {
    path,
    depth,
    tree: truncateTree(treeOutput),
    key_files: dedupedKeyFiles.slice(0, MAX_KEY_FILES),
    patterns: detectedPatterns.slice(0, MAX_PATTERNS),
    dependencies,
    focus_findings,
  };
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

    // Validate required path parameter
    const path = input.path;
    if (typeof path !== "string" || path.length === 0) {
      return "Error: explore requires a non-empty 'path' argument (string).";
    }

    // Parse optional parameters
    const focus =
      typeof input.focus === "string" && input.focus.length > 0
        ? input.focus
        : undefined;
    const rawDepth =
      typeof input.depth === "string" ? input.depth : "standard";
    const depth: ExploreDepth =
      rawDepth === "shallow" || rawDepth === "deep" ? rawDepth : "standard";

    // Build agent tasks
    const agentTasks = buildAgentTasks(path, depth, focus);

    // Spawn all agents concurrently
    const results = await Promise.all(
      agentTasks.map(async (task) => {
        try {
          const response = await spawnSubagent(task.prompt);
          return { name: task.name, response };
        } catch (err) {
          return {
            name: task.name,
            response: `Error: ${err instanceof Error ? err.message : String(err)}`,
          };
        }
      }),
    );

    // Build results map
    const resultMap = new Map<string, string>();
    for (const r of results) {
      resultMap.set(r.name, r.response);
    }

    // Assemble structured result
    const partial = assembleResult(path, depth, resultMap);

    // Generate summary
    let summary: string;
    if (llmTask) {
      try {
        const summaryPrompt = `Summarize these codebase exploration findings in 2-3 concise sentences. Focus on the most important structural and architectural observations:\n\nTree: ${partial.tree.slice(0, 2000)}\n\nKey files: ${partial.key_files.map((f) => `${f.path} (${f.role})`).join(", ")}\n\nPatterns: ${partial.patterns.map((p) => `${p.name}: ${p.description}`).join("; ")}\n\n${partial.focus_findings ? `Focus findings: ${partial.focus_findings.slice(0, 1000)}` : ""}`;
        summary = await llmTask(summaryPrompt);
      } catch {
        summary = buildTemplateSummary(partial);
      }
    } else {
      summary = buildTemplateSummary(partial);
    }

    const exploreResult: ExploreResult = { ...partial, summary };
    return JSON.stringify(exploreResult);
  };
}

/** System prompt section for the explore tool. */
export const EXPLORE_SYSTEM_PROMPT = `## Explore Tool

Use \`explore\` to understand a codebase, directory, or file before working with it.
Spawns parallel agents for fast, thorough exploration.

When to use explore:
- Before modifying unfamiliar code
- When asked "what does this do" or "how is this structured"
- At the start of any non-trivial task involving existing code
- When you need to find the right file or pattern to follow

explore is read-only and returns structured results. Prefer it over manually
calling read_file/list_directory/search_files in sequence — it's faster (parallel)
and produces better context.

Use the focus parameter to direct exploration toward what matters:
  explore({ path: "src/auth", focus: "how tokens are validated" })
  explore({ path: ".", focus: "test patterns and conventions" })
  explore({ path: "src/core", depth: "deep" })

After exploring, reference the patterns and conventions you found when writing new code.`;
