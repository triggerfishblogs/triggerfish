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

export { readLogsForLlm } from "./log_reader.ts";
export type { LogReadResult, LogReaderOptions } from "./log_reader.ts";

export {
  executeLogRead,
  getLogReaderToolDefinitions,
  LOG_READER_SYSTEM_PROMPT,
} from "./log_reader_tool.ts";

export {
  createReleaseNotesToolExecutor,
  getReleaseNotesToolDefinitions,
  RELEASE_NOTES_SYSTEM_PROMPT,
} from "./release_notes.ts";

export type {
  ReleaseNotesFetcher,
  ReleaseNoteRange,
  ReleaseNoteSummary,
} from "./release_notes.ts";
