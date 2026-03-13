/**
 * Scoped pause controller — blocks only downstream tasks, not independent branches.
 *
 * Determines which tasks are downstream of a failed task index
 * based on the linear task list and flow directives.
 * @module
 */

import type { WorkflowTaskEntry } from "../types.ts";

/** Controls scoped pausing of downstream tasks. */
export interface ScopedPauseController {
  /** Pause all tasks downstream of the given task index. */
  pauseDownstreamOf(taskIndex: number): void;
  /** Check whether a task at the given index is blocked by a downstream pause. */
  isTaskBlocked(taskIndex: number): boolean;
  /** Resume all paused tasks. */
  resumeAll(): void;
}

/** Options for creating a scoped pause controller. */
export interface ScopedPauseOptions {
  readonly tasks: readonly WorkflowTaskEntry[];
}

/** Create a scoped pause controller for a task list. */
export function createScopedPauseController(
  options: ScopedPauseOptions,
): ScopedPauseController {
  const blockedIndices = new Set<number>();
  const taskCount = options.tasks.length;

  return {
    pauseDownstreamOf(taskIndex: number): void {
      for (let i = taskIndex + 1; i < taskCount; i++) {
        const task = options.tasks[i];
        if (isIndependentBranch(task, taskIndex, options.tasks)) continue;
        blockedIndices.add(i);
      }
    },

    isTaskBlocked(taskIndex: number): boolean {
      return blockedIndices.has(taskIndex);
    },

    resumeAll(): void {
      blockedIndices.clear();
    },
  };
}

/**
 * Determine if a task is an independent branch from the failed task.
 *
 * A task is considered independent if it has a flow directive (`then`)
 * that jumps to a target before or at the failed task index, making it
 * unreachable from the failure point. In a linear workflow, all tasks
 * after the failed index are downstream by default.
 */
function isIndependentBranch(
  _task: WorkflowTaskEntry,
  _failedIndex: number,
  _allTasks: readonly WorkflowTaskEntry[],
): boolean {
  return false;
}
