/**
 * Google Tasks service — list, create, and complete tasks.
 *
 * @module
 */

import type {
  GoogleApiClient,
  GoogleApiResult,
  TaskCreateOptions,
  TaskItem,
  TaskListOptions,
  TasksService,
} from "./types.ts";

/** Tasks API base URL. */
const TASKS_BASE = "https://tasks.googleapis.com/tasks/v1";

/** Raw Tasks API item shape. */
interface TasksApiItem {
  readonly id: string;
  readonly title: string;
  readonly notes?: string;
  readonly status: string;
  readonly due?: string;
  readonly completed?: string;
}

/** Convert a raw API item to a TaskItem. */
function toTaskItem(item: TasksApiItem): TaskItem {
  return {
    id: item.id,
    title: item.title,
    notes: item.notes,
    status: item.status,
    due: item.due,
    completed: item.completed,
  };
}

/**
 * Create a Google Tasks service.
 *
 * @param client - Authenticated Google API client
 */
export function createTasksService(client: GoogleApiClient): TasksService {
  return {
    async list(
      options: TaskListOptions,
    ): Promise<GoogleApiResult<readonly TaskItem[]>> {
      const taskListId = options.taskListId ?? "@default";
      const params: Record<string, string> = {
        maxResults: String(options.maxResults ?? 20),
      };
      if (options.showCompleted === false) {
        params.showCompleted = "false";
      }

      const result = await client.get<{
        readonly items?: readonly TasksApiItem[];
      }>(`${TASKS_BASE}/lists/${taskListId}/tasks`, params);

      if (!result.ok) return result;
      const items = (result.value.items ?? []).map(toTaskItem);
      return { ok: true, value: items };
    },

    async create(
      options: TaskCreateOptions,
    ): Promise<GoogleApiResult<TaskItem>> {
      const taskListId = options.taskListId ?? "@default";
      const body: Record<string, unknown> = {
        title: options.title,
      };
      if (options.notes) body.notes = options.notes;
      if (options.due) body.due = options.due;

      const result = await client.post<TasksApiItem>(
        `${TASKS_BASE}/lists/${taskListId}/tasks`,
        body,
      );
      if (!result.ok) return result;
      return { ok: true, value: toTaskItem(result.value) };
    },

    async complete(
      taskId: string,
      taskListId?: string,
    ): Promise<GoogleApiResult<TaskItem>> {
      const listId = taskListId ?? "@default";
      const result = await client.patch<TasksApiItem>(
        `${TASKS_BASE}/lists/${listId}/tasks/${taskId}`,
        { status: "completed" },
      );
      if (!result.ok) return result;
      return { ok: true, value: toTaskItem(result.value) };
    },
  };
}
