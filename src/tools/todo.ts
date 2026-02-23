/**
 * Todo tool — manager, executor, and display formatters.
 *
 * Implements the TodoManager factory, tool executor, ANSI/HTML formatters
 * for todo list rendering, and todo event extraction.
 *
 * Types, tool definitions, and system prompt live in `todo_defs.ts`.
 *
 * @module
 */

import type {
  TodoItem,
  TodoList,
  TodoManager,
  TodoManagerOptions,
  TodoStatus,
} from "./todo_defs.ts";

// ─── Barrel re-exports from todo_defs.ts ────────────────────────────────────

export { getTodoToolDefinitions, TODO_SYSTEM_PROMPT } from "./todo_defs.ts";
export type {
  TodoItem,
  TodoList,
  TodoManager,
  TodoManagerOptions,
  TodoPriority,
  TodoStatus,
} from "./todo_defs.ts";

// ─── Helpers ────────────────────────────────────────────────────────────────

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

  const validStatuses: readonly TodoStatus[] = [
    "pending",
    "in_progress",
    "completed",
  ];
  if (!validStatuses.includes(obj.status as TodoStatus)) return null;

  const validPriorities = ["high", "medium", "low"];
  if (!validPriorities.includes(obj.priority as string)) return null;

  if (typeof obj.created_at !== "string" || obj.created_at.length === 0) {
    return null;
  }
  if (typeof obj.updated_at !== "string" || obj.updated_at.length === 0) {
    return null;
  }

  return {
    id: obj.id as string,
    content: obj.content as string,
    status: obj.status as TodoStatus,
    priority: obj.priority as TodoItem["priority"],
    created_at: obj.created_at as string,
    updated_at: obj.updated_at as string,
  };
}

// ─── Manager ────────────────────────────────────────────────────────────────

/** Parse and validate a todo list from raw storage JSON, returning empty on failure. */
function parseTodoListFromStorage(raw: string | null): readonly TodoItem[] {
  if (raw === null) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed.todos)) return [];
    return parsed.todos
      .map(validateTodoItem)
      .filter((item: TodoItem | null): item is TodoItem => item !== null);
  } catch {
    return [];
  }
}

/** Mark old items absent from the new list as completed (auto-preserve). */
function preserveAbsentTodoItems(
  oldItems: readonly TodoItem[],
  newIds: ReadonlySet<string>,
): readonly TodoItem[] {
  return oldItems
    .filter((old) => !newIds.has(old.id))
    .map((old): TodoItem => ({
      ...old,
      status: "completed" as TodoStatus,
      updated_at: new Date().toISOString(),
    }));
}

/** Resolve preserved items from storage when not all incoming items are done. */
async function resolvePreservedTodoItems(
  storage: TodoManagerOptions["storage"],
  key: string,
  validated: readonly TodoItem[],
): Promise<readonly TodoItem[]> {
  const allDone = validated.every((t) => t.status === "completed");
  if (allDone) return [];
  const oldRaw = await storage.get(key);
  const oldItems = parseTodoListFromStorage(oldRaw);
  const newIds = new Set(validated.map((t) => t.id));
  return preserveAbsentTodoItems(oldItems, newIds);
}

/** Write validated todo items to storage, merging preserved items. */
async function writeTodoList(
  storage: TodoManagerOptions["storage"],
  key: string,
  todos: readonly TodoItem[],
): Promise<TodoList> {
  const validated = todos
    .map(validateTodoItem)
    .filter((item): item is TodoItem => item !== null);
  if (validated.length === 0) {
    await storage.delete(key);
    return { todos: [] };
  }
  const preserved = await resolvePreservedTodoItems(storage, key, validated);
  const merged: TodoList = { todos: [...preserved, ...validated] };
  await storage.set(key, JSON.stringify(merged));
  return merged;
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
      return { todos: [...parseTodoListFromStorage(raw)] };
    },
    write(todos: readonly TodoItem[]): Promise<TodoList> {
      return writeTodoList(storage, key, todos);
    },
  };
}

// ─── Tool executor ──────────────────────────────────────────────────────────

/**
 * Create a tool executor function for todo operations.
 *
 * Returns a handler that accepts tool name + args and returns a result string,
 * or null if the tool name is not a todo tool (so callers can fall through).
 */
export function createTodoToolExecutor(
  manager: TodoManager,
): (name: string, input: Record<string, unknown>) => Promise<string | null> {
  return async (
    name: string,
    input: Record<string, unknown>,
  ): Promise<string | null> => {
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
        return JSON.stringify(list, null, 2);
      }

      default:
        return null;
    }
  };
}

// ─── Display formatters ─────────────────────────────────────────────────────

const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";
const DIM = "\x1b[2m";
const STRIKETHROUGH = "\x1b[9m";
const YELLOW = "\x1b[33m";
const GREEN = "\x1b[32m";
const CYAN = "\x1b[36m";

/** Strip ANSI escape sequences to get visible character count. */
function visibleLength(s: string): number {
  // deno-lint-ignore no-control-regex
  return s.replace(/\x1b\[[0-9;]*m/g, "").length;
}

/** Format a single todo item as an ANSI-styled content line. */
function formatTodoItemAnsi(todo: TodoItem): string {
  switch (todo.status) {
    case "completed":
      return `${DIM}${GREEN}✓${RESET} ${DIM}${STRIKETHROUGH}${todo.content}${RESET}`;
    case "in_progress":
      return `${YELLOW}${BOLD}▶${RESET} ${BOLD}${todo.content}${RESET}`;
    case "pending":
      return `${DIM}○${RESET} ${todo.content}`;
  }
}

/** Wrap content lines in a box with a header, returning the rendered lines. */
function wrapTodoContentInBox(
  header: string,
  contentLines: readonly string[],
): string {
  const allVisible = [header, ...contentLines];
  const maxWidth = Math.max(...allVisible.map(visibleLength));
  const boxInner = Math.max(maxWidth + 2, 20);
  const lines: string[] = [];
  const dashesAfter = boxInner - visibleLength(header) - 3;
  lines.push(
    `  ${CYAN}╭─ ${RESET}${header}${CYAN} ${
      "─".repeat(Math.max(dashesAfter, 1))
    }╮${RESET}`,
  );
  for (const line of contentLines) {
    const pad = boxInner - visibleLength(line) - 2;
    lines.push(
      `  ${CYAN}│${RESET} ${line}${
        " ".repeat(Math.max(pad, 0))
      } ${CYAN}│${RESET}`,
    );
  }
  lines.push(`  ${CYAN}╰${"─".repeat(boxInner)}╯${RESET}`);
  return lines.join("\n");
}

/**
 * Format a todo list as ANSI-styled text for CLI display inside a box.
 *
 * - Completed items: checkmark with strikethrough + dim
 * - In-progress items: arrow bold + yellow (highlighted)
 * - Pending items: circle normal
 */
export function formatTodoListAnsi(todos: readonly TodoItem[]): string {
  if (todos.length === 0) {
    return `  ${DIM}╭─ 📋 No tasks ─╮${RESET}\n  ${DIM}╰────────────────╯${RESET}`;
  }
  const contentLines = todos.map(formatTodoItemAnsi);
  return wrapTodoContentInBox("📋 Tasks", contentLines);
}

/**
 * Format a todo list as HTML for the Tidepool web client.
 *
 * Returns a styled div with completed/active/pending items.
 */
export function formatTodoListHtml(todos: readonly TodoItem[]): string {
  if (todos.length === 0) {
    return '<div class="todo-list"><span class="todo-empty">📋 No tasks</span></div>';
  }
  const items = todos.map((todo) => {
    switch (todo.status) {
      case "completed":
        return `<div class="todo-item todo-done"><span class="todo-check">✓</span> <s>${
          escapeHtml(todo.content)
        }</s></div>`;
      case "in_progress":
        return `<div class="todo-item todo-active"><span class="todo-arrow">▶</span> ${
          escapeHtml(todo.content)
        }</div>`;
      case "pending":
        return `<div class="todo-item todo-pending"><span class="todo-circle">○</span> ${
          escapeHtml(todo.content)
        }</div>`;
    }
  }).join("");
  return `<div class="todo-list"><div class="todo-header">📋 Tasks</div>${items}</div>`;
}

/** HTML-escape a string. */
function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Extract TodoItem[] from a tool_call args object or a tool_result JSON string.
 *
 * Returns the items if parseable, or null otherwise.
 */
export function extractTodosFromEvent(
  toolName: string,
  data: { args?: Record<string, unknown>; result?: string },
): readonly TodoItem[] | null {
  if (toolName !== "todo_read" && toolName !== "todo_write") return null;

  // Both todo_read and todo_write now return JSON — parse the result first.
  if (data.result) {
    try {
      const parsed = JSON.parse(data.result);
      if (parsed.todos && Array.isArray(parsed.todos)) {
        const validated = (parsed.todos as unknown[])
          .map(validateTodoItem)
          .filter((t): t is TodoItem => t !== null);
        if (validated.length > 0) return validated;
      }
    } catch {
      // not JSON — e.g. "No todos" message
    }
  }
  return null;
}
