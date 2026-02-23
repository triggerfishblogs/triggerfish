/**
 * Memory tool definitions — LLM-callable operation schemas.
 *
 * Provides 5 tool definitions (memory_save, memory_get, memory_search,
 * memory_list, memory_delete) and the system prompt section for memory
 * auto-extraction.
 *
 * @module
 */

import type { ToolDefinition } from "../../../core/types/tool.ts";

function buildMemorySaveParams(): ToolDefinition["parameters"] {
  return {
    key: {
      type: "string",
      description:
        "Unique identifier for this memory (e.g. 'user-name', 'favorite-color')",
      required: true,
    },
    content: {
      type: "string",
      description: "The content to remember",
      required: true,
    },
    tags: {
      type: "array",
      description:
        "Optional tags for categorization (e.g. ['personal', 'preference'])",
      items: { type: "string" },
    },
  };
}

function buildMemorySaveDef(): ToolDefinition {
  return {
    name: "memory_save",
    description: "Save a fact or piece of information to persistent memory. " +
      "The memory persists across sessions. Classification is automatically " +
      "set to the current session's security level — you cannot choose it. " +
      "Use descriptive keys like 'user-birthday' or 'project-deadline'.",
    parameters: buildMemorySaveParams(),
  };
}

function buildMemoryGetDef(): ToolDefinition {
  return {
    name: "memory_get",
    description:
      "Retrieve a specific memory by its key. Returns the memory content " +
      "if it exists and is accessible at the current security level. " +
      "Higher-classified versions shadow lower ones.",
    parameters: {
      key: {
        type: "string",
        description: "The key of the memory to retrieve",
        required: true,
      },
    },
  };
}

function buildMemorySearchDef(): ToolDefinition {
  return {
    name: "memory_search",
    description:
      "Search across all accessible memories using natural language. " +
      "Uses full-text search with stemming. Results are filtered by " +
      "the current session's security level.",
    parameters: {
      query: {
        type: "string",
        description: "Natural language search query",
        required: true,
      },
      max_results: {
        type: "number",
        description: "Maximum number of results to return (default: 10)",
      },
    },
  };
}

function buildMemoryListDef(): ToolDefinition {
  return {
    name: "memory_list",
    description: "List all accessible memories, optionally filtered by tag. " +
      "Returns memories visible at the current security level.",
    parameters: {
      tag: { type: "string", description: "Optional tag to filter by" },
    },
  };
}

function buildMemoryDeleteDef(): ToolDefinition {
  return {
    name: "memory_delete",
    description:
      "Delete a memory by key. Can only delete memories at the current " +
      "session's security level. The record is soft-deleted (hidden but " +
      "retained for audit).",
    parameters: {
      key: {
        type: "string",
        description: "The key of the memory to delete",
        required: true,
      },
    },
  };
}

/** Tool definitions for the 5 memory operations. */
export function getMemoryToolDefinitions(): readonly ToolDefinition[] {
  return [
    buildMemorySaveDef(),
    buildMemoryGetDef(),
    buildMemorySearchDef(),
    buildMemoryListDef(),
    buildMemoryDeleteDef(),
  ];
}

/**
 * System prompt section for memory auto-extraction.
 *
 * Appended to the system prompt after SPINE.md and tool definitions.
 * Instructs the agent to proactively save important facts using memory_save.
 */
export const MEMORY_SYSTEM_PROMPT = `## Cross-Session Memory

You have persistent memory tools (memory_save, memory_get, memory_search, memory_list, memory_delete) for remembering information across sessions.

Save important facts the user shares (personal details, project context, preferences) using descriptive keys like 'user-name', 'project-deadline'. Use tags for categorization.

Do NOT proactively search or list memories unless the user asks about something you previously discussed, or you need context to answer their question. Focus on the current request first.

Classification is automatic based on the current session's security level.`;
