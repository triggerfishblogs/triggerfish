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

export {
  createLlmTaskToolExecutor,
  getLlmTaskToolDefinitions,
  LLM_TASK_SYSTEM_PROMPT,
} from "./llm-task.ts";

export {
  buildSummarizePrompt,
  createSummarizeToolExecutor,
  getSummarizeToolDefinitions,
  SUMMARIZE_SYSTEM_PROMPT,
} from "./summarize.ts";

export {
  createHealthcheckToolExecutor,
  getHealthcheckToolDefinitions,
  HEALTHCHECK_SYSTEM_PROMPT,
} from "./healthcheck.ts";

export type { HealthcheckDeps } from "./healthcheck.ts";
