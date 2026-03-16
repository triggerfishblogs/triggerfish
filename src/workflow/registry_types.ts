/**
 * Type definitions for the workflow run registry.
 *
 * @module
 */

import type { ClassificationLevel } from "../core/types/classification.ts";
import type { HealingPhase } from "../core/types/healing.ts";
import type { WorkflowStatus } from "./types.ts";
import type { RichWorkflowEvent } from "./healing/types.ts";

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

/** Per-step execution state accumulated during a run. */
export interface StepState {
  readonly taskIndex: number;
  readonly taskName: string;
  readonly status: "pending" | "running" | "completed" | "failed" | "skipped";
  readonly taintBefore?: ClassificationLevel;
  readonly taintAfter?: ClassificationLevel;
  readonly duration?: number;
  readonly error?: string;
  readonly healingPhase?: HealingPhase;
  readonly attemptNumber?: number;
  readonly branchTaken?: string;
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
  stepHistory: StepState[];
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
  /** Get accumulated step history for a run. */
  listRunStepHistory(runId: string): readonly StepState[];
  /** Report a rich step event and update step history. */
  reportStepEvent(runId: string, event: RichWorkflowEvent): void;
  /** Subscribe to rich per-step events. */
  subscribeRichEvents(listener: (event: RichWorkflowEvent) => void): () => void;
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

/** Error thrown when a workflow is cancelled via the registry. */
export class WorkflowCancelledError extends Error {
  readonly runId: string;
  constructor(runId: string) {
    super(`Workflow run cancelled: ${runId}`);
    this.name = "WorkflowCancelledError";
    this.runId = runId;
  }
}
