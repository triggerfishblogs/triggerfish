/**
 * Memory tools — LLM-callable operations for cross-session recall.
 *
 * Provides 5 tool definitions (memory_save, memory_get, memory_search,
 * memory_list, memory_delete) and a tool executor factory that follows
 * the same pattern as `createTodoToolExecutor`.
 *
 * Classification is always forced to session taint — the LLM cannot
 * choose what level a memory is stored at.
 *
 * @module
 */

import type { ToolDefinition } from "../agent/orchestrator.ts";
import type { ClassificationLevel } from "../core/types/classification.ts";
import type { SessionId } from "../core/types/session.ts";
import type { MemoryStore } from "./store.ts";
import type { MemorySearchProvider } from "./search.ts";

/** Context required by the memory tool executor. */
export interface MemoryToolContext {
  readonly store: MemoryStore;
  readonly searchProvider?: MemorySearchProvider;
  readonly agentId: string;
  readonly sessionTaint: ClassificationLevel;
  readonly sourceSessionId: SessionId;
}

/** Tool definitions for the 5 memory operations. */
export function getMemoryToolDefinitions(): readonly ToolDefinition[] {
  return [
    {
      name: "memory_save",
      description:
        "Save a fact or piece of information to persistent memory. " +
        "The memory persists across sessions. Classification is automatically " +
        "set to the current session's security level — you cannot choose it. " +
        "Use descriptive keys like 'user-birthday' or 'project-deadline'.",
      parameters: {
        key: {
          type: "string",
          description: "Unique identifier for this memory (e.g. 'user-name', 'favorite-color')",
          required: true,
        },
        content: {
          type: "string",
          description: "The content to remember",
          required: true,
        },
        tags: {
          type: "array",
          description: "Optional tags for categorization (e.g. ['personal', 'preference'])",
        },
      },
    },
    {
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
    },
    {
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
    },
    {
      name: "memory_list",
      description:
        "List all accessible memories, optionally filtered by tag. " +
        "Returns memories visible at the current security level.",
      parameters: {
        tag: {
          type: "string",
          description: "Optional tag to filter by",
        },
      },
    },
    {
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
    },
  ];
}

/**
 * Create a tool executor for memory operations.
 *
 * Returns a handler that accepts tool name + args and returns a result string,
 * or null if the tool name is not a memory tool (so callers can fall through).
 */
export function createMemoryToolExecutor(
  ctx: MemoryToolContext,
): (name: string, input: Record<string, unknown>) => Promise<string | null> {
  return async (
    name: string,
    input: Record<string, unknown>,
  ): Promise<string | null> => {
    switch (name) {
      case "memory_save": {
        const key = input.key;
        const content = input.content;
        if (typeof key !== "string" || key.length === 0) {
          return "Error: memory_save requires a 'key' argument (non-empty string).";
        }
        if (typeof content !== "string" || content.length === 0) {
          return "Error: memory_save requires a 'content' argument (non-empty string).";
        }

        const tags = Array.isArray(input.tags)
          ? input.tags.filter((t): t is string => typeof t === "string")
          : [];

        const result = await ctx.store.save({
          key,
          agentId: ctx.agentId,
          sessionTaint: ctx.sessionTaint,
          content,
          tags,
          sourceSessionId: ctx.sourceSessionId,
        });

        if (!result.ok) {
          return `Error: ${result.error.message}`;
        }

        return JSON.stringify({
          saved: true,
          key: result.value.key,
          classification: result.value.classification,
        });
      }

      case "memory_get": {
        const key = input.key;
        if (typeof key !== "string" || key.length === 0) {
          return "Error: memory_get requires a 'key' argument (non-empty string).";
        }

        const record = await ctx.store.get({
          key,
          agentId: ctx.agentId,
          sessionTaint: ctx.sessionTaint,
        });

        if (record === null) {
          return JSON.stringify({ found: false, key });
        }

        return JSON.stringify({
          found: true,
          key: record.key,
          content: record.content,
          classification: record.classification,
          tags: record.tags,
          updated_at: record.updatedAt.toISOString(),
        });
      }

      case "memory_search": {
        const query = input.query;
        if (typeof query !== "string" || query.length === 0) {
          return "Error: memory_search requires a 'query' argument (non-empty string).";
        }

        const maxResults = typeof input.max_results === "number"
          ? input.max_results
          : 10;

        if (!ctx.searchProvider) {
          return "Error: Search is not available (no search provider configured).";
        }

        const results = await ctx.searchProvider.search({
          agentId: ctx.agentId,
          query,
          sessionTaint: ctx.sessionTaint,
          maxResults,
        });

        if (results.length === 0) {
          return JSON.stringify({ results: [], query });
        }

        return JSON.stringify({
          results: results.map((r) => ({
            key: r.record.key,
            content: r.record.content,
            classification: r.record.classification,
            tags: r.record.tags,
          })),
          query,
        });
      }

      case "memory_list": {
        const tag = typeof input.tag === "string" ? input.tag : undefined;

        const records = await ctx.store.list({
          agentId: ctx.agentId,
          sessionTaint: ctx.sessionTaint,
          tag,
        });

        if (records.length === 0) {
          return "No memories found.";
        }

        return JSON.stringify({
          memories: records.map((r) => ({
            key: r.key,
            content: r.content,
            classification: r.classification,
            tags: r.tags,
            updated_at: r.updatedAt.toISOString(),
          })),
        });
      }

      case "memory_delete": {
        const key = input.key;
        if (typeof key !== "string" || key.length === 0) {
          return "Error: memory_delete requires a 'key' argument (non-empty string).";
        }

        const result = await ctx.store.delete({
          key,
          agentId: ctx.agentId,
          sessionTaint: ctx.sessionTaint,
          sourceSessionId: ctx.sourceSessionId,
        });

        if (!result.ok) {
          return `Error: ${result.error.message}`;
        }

        return JSON.stringify({ deleted: true, key });
      }

      default:
        return null;
    }
  };
}

/**
 * System prompt section for memory auto-extraction.
 *
 * Appended to the system prompt after SPINE.md and tool definitions.
 * Instructs the agent to proactively save important facts using memory_save.
 */
export const MEMORY_SYSTEM_PROMPT = `## Cross-Session Memory

You have access to persistent memory tools (memory_save, memory_get, memory_search, memory_list, memory_delete) for remembering information across sessions.

**Auto-extraction:** Proactively save important facts the user shares:
- Personal details (name, preferences, important dates)
- Project context (goals, constraints, decisions)
- Recurring instructions or preferences
- Key facts that would be useful in future sessions

Use descriptive keys like 'user-name', 'project-deadline', 'preferred-language'.
Use tags for categorization: ['personal'], ['project'], ['preference'], etc.

**Important:** You cannot choose the security classification of memories — it is automatically set based on the current session's security level. Higher-security sessions can read lower-security memories, but not vice versa.

At the start of a session, use memory_search or memory_list to recall relevant context from previous sessions.`;
