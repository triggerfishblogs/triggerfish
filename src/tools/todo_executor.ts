/**
 * Todo tool executor — handles todo_read and todo_write tool calls.
 *
 * Returns a handler that accepts tool name + args and returns a result string,
 * or null if the tool name is not a todo tool (so callers can fall through).
 *
 * @module
 */

import type { TodoItem, TodoManager } from "./todo_defs.ts";

/** Handle the todo_read tool call. */
async function executeTodoRead(manager: TodoManager): Promise<string> {
  const list = await manager.read();
  if (list.todos.length === 0) {
    return "No todos. Use todo_write to create your task list.";
  }
  return JSON.stringify(list, null, 2);
}

/** Handle the todo_write tool call, validating the input array. */
async function executeTodoWrite(
  manager: TodoManager,
  input: Record<string, unknown>,
): Promise<string> {
  const rawTodos = input.todos;
  if (!Array.isArray(rawTodos)) {
    return "Error: todo_write requires a 'todos' argument (array).";
  }
  const list = await manager.write(rawTodos as readonly TodoItem[]);
  return JSON.stringify(list, null, 2);
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
  // deno-lint-ignore require-await
  return async (
    name: string,
    input: Record<string, unknown>,
  ): Promise<string | null> => {
    switch (name) {
      case "todo_read":
        return executeTodoRead(manager);
      case "todo_write":
        return executeTodoWrite(manager, input);
      default:
        return null;
    }
  };
}
