/**
 * Google Tasks service types.
 *
 * Task item, list options, and service interface for the Tasks API.
 *
 * @module
 */

import type { GoogleApiResult } from "./types_auth.ts";

// ─── Tasks ───────────────────────────────────────────────────────────────────

/** A Google Tasks item. */
export interface TaskItem {
  readonly id: string;
  readonly title: string;
  readonly notes?: string;
  readonly status: string;
  readonly due?: string;
  readonly completed?: string;
}

/** Options for listing tasks. */
export interface TaskListOptions {
  readonly taskListId?: string;
  readonly showCompleted?: boolean;
  readonly maxResults?: number;
}

/** Options for creating a task. */
export interface TaskCreateOptions {
  readonly title: string;
  readonly notes?: string;
  readonly due?: string;
  readonly taskListId?: string;
}

/** Tasks service interface. */
export interface TasksService {
  readonly list: (
    options: TaskListOptions,
  ) => Promise<GoogleApiResult<readonly TaskItem[]>>;
  readonly create: (
    options: TaskCreateOptions,
  ) => Promise<GoogleApiResult<TaskItem>>;
  readonly complete: (
    taskId: string,
    taskListId?: string,
  ) => Promise<GoogleApiResult<TaskItem>>;
}
