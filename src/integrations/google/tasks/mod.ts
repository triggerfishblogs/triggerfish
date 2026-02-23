/**
 * Google Tasks module.
 *
 * Tasks service, tool definitions, and tool executors.
 *
 * @module
 */

export type {
  TaskItem,
  TaskListOptions,
  TaskCreateOptions,
  TasksService,
} from "./types_tasks.ts";

export { createTasksService } from "./tasks.ts";

export {
  buildTasksListDef,
  buildTasksCreateDef,
  buildTasksCompleteDef,
} from "./tools_defs_tasks.ts";

export {
  executeTasksList,
  executeTasksCreate,
  executeTasksComplete,
} from "./tools_exec_tasks.ts";
