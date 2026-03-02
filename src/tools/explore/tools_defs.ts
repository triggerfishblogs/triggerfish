/**
 * Explore tool types, definitions, and system prompt.
 *
 * Defines the public result types (ExploreResult, KeyFile, Pattern),
 * the single `explore` tool schema, and the system prompt section.
 *
 * @module
 */

import type { ToolDefinition } from "../../core/types/tool.ts";

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

function buildExploreDef(): ToolDefinition {
  return {
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
        description: "How thorough: 'shallow', 'standard' (default), or 'deep'",
        required: false,
      },
    },
  };
}

/** Get the explore tool definition. */
export function getExploreToolDefinitions(): readonly ToolDefinition[] {
  return [buildExploreDef()];
}

/** System prompt section for the explore tool. */
export const EXPLORE_SYSTEM_PROMPT = `## Explore Tool

Use \`explore\` before modifying unfamiliar code or at the start of non-trivial tasks.
Spawns parallel agents — faster and more thorough than manually calling read_file/list_directory/search_files in sequence.

Use the focus parameter to direct exploration:
  explore({ path: "src/auth", focus: "how tokens are validated" })
  explore({ path: "src/core", depth: "deep" })

Reference the patterns and conventions you find when writing new code.`;
