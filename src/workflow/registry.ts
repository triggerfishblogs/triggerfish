/**
 * Workflow run registry — tracks active workflow executions.
 *
 * Provides pause, unpause, and stop signals that the engine checks
 * between task boundaries. The UI and LLM tool share this single
 * control path — no duplicate stop/pause logic.
 *
 * @module
 */

import type { ClassificationLevel } from "../core/types/classification.ts";
import { createLogger } from "../core/logger/logger.ts";
import type { WorkflowStatus } from "./types.ts";

const log = createLogger("workflow-registry");

/** Listener callback for registry state changes. */
export type RegistryListener = (
  event: RegistryEvent,
) => void;

/** Events emitted by the registry on state changes. */
export interface RegistryEvent {
  readonly type:
    | "run_started"
    | "run_stopped"
    | "run_paused"
    | "run_unpaused"
    | "task_progress"
    | "run_completed";
  readonly runId: string;
  readonly workflowName: string;
  readonly status: WorkflowStatus;
  readonly currentTaskIndex?: number;
  readonly currentTaskName?: string;
  readonly taint?: ClassificationLevel;
  readonly error?: string;
}

/** Control handle for a single running workflow. */
export interface RunControl {
  readonly runId: string;
  readonly workflowName: string;
  readonly abortController: AbortController;
  readonly startedAt: string;
  status: WorkflowStatus;
  currentTaskIndex: number;
  currentTaskName: string;
  taint?: ClassificationLevel;
  paused: boolean;
  pauseResolve: (() => void) | null;
}

/** Workflow run registry for tracking and controlling active executions. */
export interface WorkflowRunRegistry {
  /** Register a new running workflow. Returns a pause-check function for the engine. */
  registerRun(options: RegisterRunOptions): RunRegistration;
  /** Signal a workflow to stop after its current task completes. */
  stopRun(runId: string): boolean;
  /** Signal a workflow to pause after its current task completes. */
  pauseRun(runId: string): boolean;
  /** Resume a paused workflow. */
  unpauseRun(runId: string): boolean;
  /** Mark a run as completed and remove from active tracking. */
  completeRun(runId: string, options: CompleteRunOptions): void;
  /** Report task progress for a running workflow. */
  reportTaskProgress(runId: string, options: TaskProgressOptions): void;
  /** Get all currently active runs. */
  listActiveRuns(): readonly ActiveRunSnapshot[];
  /** Get a single active run by ID. */
  getActiveRun(runId: string): ActiveRunSnapshot | null;
  /** Subscribe to registry events. */
  subscribe(listener: RegistryListener): () => void;
}

/** Options for registering a new run. */
export interface RegisterRunOptions {
  readonly runId: string;
  readonly workflowName: string;
  readonly taint?: ClassificationLevel;
}

/** Returned to the caller after registering a run. */
export interface RunRegistration {
  readonly signal: AbortSignal;
  /** Async function the engine calls between tasks. Resolves immediately unless paused. */
  readonly checkPause: () => Promise<void>;
}

/** Options for completing a run. */
export interface CompleteRunOptions {
  readonly status: WorkflowStatus;
  readonly error?: string;
}

/** Options for reporting task progress. */
export interface TaskProgressOptions {
  readonly taskIndex: number;
  readonly taskName: string;
  readonly taint?: ClassificationLevel;
}

/** Snapshot of an active run for external consumers. */
export interface ActiveRunSnapshot {
  readonly runId: string;
  readonly workflowName: string;
  readonly status: WorkflowStatus;
  readonly currentTaskIndex: number;
  readonly currentTaskName: string;
  readonly startedAt: string;
  readonly paused: boolean;
  readonly taint?: ClassificationLevel;
}

/** Create a new workflow run registry. */
export function createWorkflowRunRegistry(): WorkflowRunRegistry {
  const runs = new Map<string, RunControl>();
  const listeners = new Set<RegistryListener>();

  function emit(event: RegistryEvent): void {
    for (const listener of listeners) {
      try {
        listener(event);
      } catch (err) {
        log.warn("Registry listener threw during event dispatch", {
          operation: "emit",
          eventType: event.type,
          runId: event.runId,
          err,
        });
      }
    }
  }

  function snapshotRun(ctrl: RunControl): ActiveRunSnapshot {
    return {
      runId: ctrl.runId,
      workflowName: ctrl.workflowName,
      status: ctrl.paused ? "paused" as WorkflowStatus : ctrl.status,
      currentTaskIndex: ctrl.currentTaskIndex,
      currentTaskName: ctrl.currentTaskName,
      startedAt: ctrl.startedAt,
      paused: ctrl.paused,
      taint: ctrl.taint,
    };
  }

  return {
    registerRun(options) {
      const abortController = new AbortController();
      const ctrl: RunControl = {
        runId: options.runId,
        workflowName: options.workflowName,
        abortController,
        startedAt: new Date().toISOString(),
        status: "running",
        currentTaskIndex: 0,
        currentTaskName: "",
        taint: options.taint,
        paused: false,
        pauseResolve: null,
      };

      runs.set(options.runId, ctrl);

      log.info("Workflow run registered", {
        operation: "registerRun",
        runId: options.runId,
        workflowName: options.workflowName,
      });

      emit({
        type: "run_started",
        runId: options.runId,
        workflowName: options.workflowName,
        status: "running",
        taint: options.taint,
      });

      const checkPause = (): Promise<void> => {
        if (abortController.signal.aborted) {
          return Promise.reject(new WorkflowCancelledError(options.runId));
        }
        if (!ctrl.paused) return Promise.resolve();
        return new Promise<void>((resolve) => {
          ctrl.pauseResolve = resolve;
        });
      };

      return { signal: abortController.signal, checkPause };
    },

    stopRun(runId) {
      const ctrl = runs.get(runId);
      if (!ctrl) {
        log.warn("Workflow stop requested for unknown run", {
          operation: "stopRun",
          runId,
        });
        return false;
      }

      ctrl.abortController.abort();
      ctrl.status = "cancelled";

      if (ctrl.paused && ctrl.pauseResolve) {
        ctrl.paused = false;
        ctrl.pauseResolve();
        ctrl.pauseResolve = null;
      }

      log.info("Workflow run stop signalled", {
        operation: "stopRun",
        runId,
        workflowName: ctrl.workflowName,
      });

      emit({
        type: "run_stopped",
        runId,
        workflowName: ctrl.workflowName,
        status: "cancelled",
        taint: ctrl.taint,
      });

      return true;
    },

    pauseRun(runId) {
      const ctrl = runs.get(runId);
      if (!ctrl || ctrl.paused || ctrl.status !== "running") {
        log.warn("Workflow pause rejected: run not active or already paused", {
          operation: "pauseRun",
          runId,
          found: !!ctrl,
          paused: ctrl?.paused,
          status: ctrl?.status,
        });
        return false;
      }

      ctrl.paused = true;

      log.info("Workflow run pause signalled", {
        operation: "pauseRun",
        runId,
        workflowName: ctrl.workflowName,
      });

      emit({
        type: "run_paused",
        runId,
        workflowName: ctrl.workflowName,
        status: "paused" as WorkflowStatus,
        currentTaskIndex: ctrl.currentTaskIndex,
        currentTaskName: ctrl.currentTaskName,
        taint: ctrl.taint,
      });

      return true;
    },

    unpauseRun(runId) {
      const ctrl = runs.get(runId);
      if (!ctrl || !ctrl.paused) {
        log.warn("Workflow unpause rejected: run not found or not paused", {
          operation: "unpauseRun",
          runId,
          found: !!ctrl,
          paused: ctrl?.paused,
        });
        return false;
      }

      ctrl.paused = false;
      if (ctrl.pauseResolve) {
        ctrl.pauseResolve();
        ctrl.pauseResolve = null;
      }
      ctrl.status = "running";

      log.info("Workflow run unpaused", {
        operation: "unpauseRun",
        runId,
        workflowName: ctrl.workflowName,
      });

      emit({
        type: "run_unpaused",
        runId,
        workflowName: ctrl.workflowName,
        status: "running",
        taint: ctrl.taint,
      });

      return true;
    },

    completeRun(runId, options) {
      const ctrl = runs.get(runId);
      if (!ctrl) return;

      runs.delete(runId);

      log.info("Workflow run completed", {
        operation: "completeRun",
        runId,
        workflowName: ctrl.workflowName,
        status: options.status,
        error: options.error,
      });

      emit({
        type: "run_completed",
        runId,
        workflowName: ctrl.workflowName,
        status: options.status,
        error: options.error,
        taint: ctrl.taint,
      });
    },

    reportTaskProgress(runId, options) {
      const ctrl = runs.get(runId);
      if (!ctrl) return;

      ctrl.currentTaskIndex = options.taskIndex;
      ctrl.currentTaskName = options.taskName;
      if (options.taint) ctrl.taint = options.taint;

      emit({
        type: "task_progress",
        runId,
        workflowName: ctrl.workflowName,
        status: ctrl.paused ? "paused" as WorkflowStatus : ctrl.status,
        currentTaskIndex: options.taskIndex,
        currentTaskName: options.taskName,
        taint: ctrl.taint,
      });
    },

    listActiveRuns() {
      return Array.from(runs.values()).map(snapshotRun);
    },

    getActiveRun(runId) {
      const ctrl = runs.get(runId);
      if (!ctrl) return null;
      return snapshotRun(ctrl);
    },

    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

/** Error thrown when a workflow is cancelled via the registry. */
export class WorkflowCancelledError extends Error {
  readonly runId: string;
  constructor(runId: string) {
    super(`Workflow run cancelled: ${runId}`);
    this.name = "WorkflowCancelledError";
    this.runId = runId;
  }
}
