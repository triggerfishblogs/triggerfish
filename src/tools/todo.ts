/**
 * Todo tool — agent task tracking and planning.
 *
 * Provides `todo_read` and `todo_write` operations that let the agent
 * maintain a structured task list. Todos are scoped per-agent (not per-session)
 * so they persist across sessions, trigger wakeups, and restarts.
 *
 * Storage key: `todos:<agentId>` — a single JSON blob of the full list,
 * replaced atomically on each write (same pattern as Claude Code / Gemini CLI).
 *
 * @module
 */

import type { StorageProvider } from "../core/storage/provider.ts";
import type { ToolDefinition } from "../agent/orchestrator.ts";

/** Priority level for a todo item. */
export type TodoPriority = "high" | "medium" | "low";

/** Status of a todo item. */
export type TodoStatus = "pending" | "in_progress" | "completed";

/** A single todo item. */
export interface TodoItem {
  readonly id: string;
  readonly content: string;
  readonly status: TodoStatus;
  readonly priority: TodoPriority;
  readonly created_at: string;
  readonly updated_at: string;
}

/** The full todo list payload for read/write operations. */
export interface TodoList {
  readonly todos: readonly TodoItem[];
}

/** Options for creating a TodoManager. */
export interface TodoManagerOptions {
  readonly storage: StorageProvider;
  readonly agentId: string;
}

/** Manager for agent todo operations. */
export interface TodoManager {
  /** Read the full todo list. */
  read(): Promise<TodoList>;
  /** Replace the full todo list. */
  write(todos: readonly TodoItem[]): Promise<TodoList>;
}

/**
 * Build the storage key for an agent's todo list.
 */
function todoKey(agentId: string): string {
  return `todos:${agentId}`;
}

/**
 * Validate a single todo item from untrusted LLM input.
 * Returns the validated item or null if invalid.
 */
function validateTodoItem(raw: unknown): TodoItem | null {
  if (typeof raw !== "object" || raw === null) return null;
  const obj = raw as Record<string, unknown>;

  if (typeof obj.id !== "string" || obj.id.length === 0) return null;
  if (typeof obj.content !== "string" || obj.content.length === 0) return null;

  const validStatuses: readonly TodoStatus[] = ["pending", "in_progress", "completed"];
  if (!validStatuses.includes(obj.status as TodoStatus)) return null;

  const validPriorities: readonly TodoPriority[] = ["high", "medium", "low"];
  if (!validPriorities.includes(obj.priority as TodoPriority)) return null;

  if (typeof obj.created_at !== "string" || obj.created_at.length === 0) return null;
  if (typeof obj.updated_at !== "string" || obj.updated_at.length === 0) return null;

  return {
    id: obj.id as string,
    content: obj.content as string,
    status: obj.status as TodoStatus,
    priority: obj.priority as TodoPriority,
    created_at: obj.created_at as string,
    updated_at: obj.updated_at as string,
  };
}

/**
 * Create a TodoManager bound to a specific agent and storage provider.
 */
export function createTodoManager(options: TodoManagerOptions): TodoManager {
  const { storage, agentId } = options;
  const key = todoKey(agentId);

  return {
    async read(): Promise<TodoList> {
      const raw = await storage.get(key);
      if (raw === null) {
        return { todos: [] };
      }
      try {
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed.todos)) {
          return { todos: [] };
        }
        const validated = parsed.todos
          .map(validateTodoItem)
          .filter((item: TodoItem | null): item is TodoItem => item !== null);
        return { todos: validated };
      } catch {
        return { todos: [] };
      }
    },

    async write(todos: readonly TodoItem[]): Promise<TodoList> {
      const validated = todos
        .map(validateTodoItem)
        .filter((item): item is TodoItem => item !== null);
      const list: TodoList = { todos: validated };
      await storage.set(key, JSON.stringify(list));
      return list;
    },
  };
}

/** Tool definitions for todo_read and todo_write. */
export function getTodoToolDefinitions(): readonly ToolDefinition[] {
  return [
    {
      name: "todo_read",
      description:
        "Read the current todo list. Returns all todo items with their id, content, status, priority, and timestamps.",
      parameters: {},
    },
    {
      name: "todo_write",
      description:
        "Replace the entire todo list. Takes the full list of todos — this is a complete replacement, not a partial update. " +
        "Each todo must have: id (string), content (string), status (pending|in_progress|completed), " +
        "priority (high|medium|low), created_at (ISO timestamp), updated_at (ISO timestamp).",
      parameters: {
        todos: {
          type: "array",
          description:
            "The complete list of todo items. Each item: {id, content, status, priority, created_at, updated_at}",
          required: true,
        },
      },
    },
  ];
}

/**
 * Create a tool executor function for todo operations.
 *
 * Returns a handler that accepts tool name + args and returns a result string,
 * or null if the tool name is not a todo tool (so callers can fall through).
 */
export function createTodoToolExecutor(
  manager: TodoManager,
): (name: string, input: Record<string, unknown>) => Promise<string | null> {
  return async (name: string, input: Record<string, unknown>): Promise<string | null> => {
    switch (name) {
      case "todo_read": {
        const list = await manager.read();
        if (list.todos.length === 0) {
          return "No todos. Use todo_write to create your task list.";
        }
        return JSON.stringify(list, null, 2);
      }

      case "todo_write": {
        const rawTodos = input.todos;
        if (!Array.isArray(rawTodos)) {
          return "Error: todo_write requires a 'todos' argument (array).";
        }
        const list = await manager.write(rawTodos as readonly TodoItem[]);
        const counts = {
          total: list.todos.length,
          pending: list.todos.filter((t) => t.status === "pending").length,
          in_progress: list.todos.filter((t) => t.status === "in_progress").length,
          completed: list.todos.filter((t) => t.status === "completed").length,
        };
        return `Updated todo list: ${counts.total} items (${counts.pending} pending, ${counts.in_progress} in progress, ${counts.completed} completed)`;
      }

      default:
        return null;
    }
  };
}

/**
 * Platform-level system prompt section for the todo tool.
 *
 * This is appended to the system prompt AFTER SPINE.md and tool definitions.
 * SPINE.md remains the foundation of the agent's identity and mission.
 * This section layers on platform behaviour that every agent gets regardless
 * of user configuration — the user never needs to know about it or set it up.
 */
export const TODO_SYSTEM_PROMPT = `## Task Planning

You have access to a todo list (todo_read / todo_write) for tracking your work. Use it proactively:

- Before starting complex or multi-step tasks, plan by creating todos first.
- Mark each task as in_progress before you begin working on it.
- Mark tasks completed immediately when done — do not batch completions.
- Keep exactly one task in_progress at a time.
- Break large tasks into specific, actionable items.
- Update the list as you discover new sub-tasks during implementation.
- Read the todo list at the start of a session to resume where you left off.`;
