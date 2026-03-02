/**
 * Tasks tool definitions.
 *
 * Defines the 3 Tasks tool schemas: list, create, complete.
 *
 * @module
 */

import type { ToolDefinition } from "../../../core/types/tool.ts";

/** Build the tasks_list tool definition. */
export function buildTasksListDef(): ToolDefinition {
  return {
    name: "tasks_list",
    description: "List Google Tasks from a task list.",
    parameters: {
      task_list_id: {
        type: "string",
        description: "Task list ID (default: '@default')",
        required: false,
      },
      show_completed: {
        type: "boolean",
        description: "Include completed tasks (default: true)",
        required: false,
      },
      max_results: {
        type: "number",
        description: "Maximum tasks to return (default: 20)",
        required: false,
      },
    },
  };
}

function buildTasksCreateParams(): ToolDefinition["parameters"] {
  return {
    title: {
      type: "string",
      description: "Task title",
      required: true,
    },
    notes: {
      type: "string",
      description: "Task notes/description",
      required: false,
    },
    due: {
      type: "string",
      description: "Due date (ISO 8601, e.g. '2025-01-20T00:00:00Z')",
      required: false,
    },
    task_list_id: {
      type: "string",
      description: "Task list ID (default: '@default')",
      required: false,
    },
  };
}

/** Build the tasks_create tool definition. */
export function buildTasksCreateDef(): ToolDefinition {
  return {
    name: "tasks_create",
    description: "Create a new Google Task.",
    parameters: buildTasksCreateParams(),
  };
}

/** Build the tasks_complete tool definition. */
export function buildTasksCompleteDef(): ToolDefinition {
  return {
    name: "tasks_complete",
    description: "Mark a Google Task as completed.",
    parameters: {
      task_id: {
        type: "string",
        description: "The task ID to complete",
        required: true,
      },
      task_list_id: {
        type: "string",
        description: "Task list ID (default: '@default')",
        required: false,
      },
    },
  };
}
