/**
 * Agent tools — capabilities exposed to the LLM as callable tools.
 *
 * @module
 */

export {
  createTodoManager,
  createTodoToolExecutor,
  extractTodosFromEvent,
  formatTodoListAnsi,
  formatTodoListHtml,
  getTodoToolDefinitions,
  TODO_SYSTEM_PROMPT,
} from "./todo.ts";

export type {
  TodoItem,
  TodoList,
  TodoManager,
  TodoManagerOptions,
  TodoPriority,
  TodoStatus,
} from "./todo.ts";
