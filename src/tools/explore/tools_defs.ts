/**
 * Explore tool types, definitions, and system prompt.
 *
 * Defines the public result types (ExploreResult, KeyFile, Pattern),
 * the single `explore` tool schema, and the system prompt section.
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
