/**
 * Rich event emission helpers for the workflow engine.
 *
 * Extracted from engine.ts to keep file size manageable.
 * These are internal helpers — not part of the public API.
 * @module
 */

import type { ClassificationLevel } from "../core/types/classification.ts";
import { createLogger } from "../core/logger/logger.ts";
import type { WorkflowContext } from "./context.ts";
import { filterInternalKeys } from "./helpers.ts";
import type { RichWorkflowEvent } from "./healing/types.ts";
import type { WorkflowStatus, WorkflowTaskEntry } from "./types.ts";

const log = createLogger("workflow-engine-events");

/** Callback type for step event emission. */
export type StepEventCallback = (event: RichWorkflowEvent) => void;

/** Safely invoke the step event callback, swallowing errors. */
export function emitStepEvent(
  onStepEvent: StepEventCallback | undefined,
  event: RichWorkflowEvent,
): void {
  if (!onStepEvent) return;
  try {
    onStepEvent(event);
  } catch (err) {
    log.warn("Step event callback threw", {
      operation: "emitStepEvent",
      eventType: event.type,
      err,
    });
  }
}

/** Build and emit a STEP_SKIPPED event. */
export function emitSkipEvent(
  onStepEvent: StepEventCallback | undefined,
  runId: string,
  workflowName: string,
  entry: WorkflowTaskEntry,
  taskIndex: number,
): void {
  emitStepEvent(onStepEvent, {
    type: "STEP_SKIPPED",
    runId,
    workflowName,
    timestamp: new Date().toISOString(),
    taskName: entry.name,
    taskIndex,
    reason: `Condition '${entry.task.if}' evaluated to false`,
  });
}

/** Build and emit a STEP_STARTED event. */
export function emitStartEvent(
  onStepEvent: StepEventCallback | undefined,
  runId: string,
  workflowName: string,
  entry: WorkflowTaskEntry,
  taskIndex: number,
  input: Readonly<Record<string, unknown>>,
  taint: ClassificationLevel,
): void {
  emitStepEvent(onStepEvent, {
    type: "STEP_STARTED",
    runId,
    workflowName,
    timestamp: new Date().toISOString(),
    taskName: entry.name,
    taskIndex,
    taskDef: entry,
    input,
    runningTaint: taint,
  });
}

/** Build and emit a STEP_FAILED event. */
export function emitFailEvent(
  onStepEvent: StepEventCallback | undefined,
  runId: string,
  workflowName: string,
  entry: WorkflowTaskEntry,
  taskIndex: number,
  error: string,
  input: Readonly<Record<string, unknown>>,
): void {
  emitStepEvent(onStepEvent, {
    type: "STEP_FAILED",
    runId,
    workflowName,
    timestamp: new Date().toISOString(),
    taskName: entry.name,
    taskIndex,
    error,
    input,
    attemptNumber: 1,
  });
}

/** Build and emit a STEP_COMPLETED event. */
export function emitCompleteEvent(
  onStepEvent: StepEventCallback | undefined,
  runId: string,
  workflowName: string,
  entry: WorkflowTaskEntry,
  taskIndex: number,
  output: unknown,
  duration: number,
  taintAfter: ClassificationLevel,
): void {
  emitStepEvent(onStepEvent, {
    type: "STEP_COMPLETED",
    runId,
    workflowName,
    timestamp: new Date().toISOString(),
    taskName: entry.name,
    taskIndex,
    output,
    duration,
    taintAfter,
  });
}

/** Emit WORKFLOW_COMPLETED or WORKFLOW_FAULTED depending on status. */
export function emitTerminalEvent(
  onStepEvent: StepEventCallback | undefined,
  runId: string,
  workflowName: string,
  status: WorkflowStatus,
  error: string | undefined,
  context: WorkflowContext,
  taskCount: number,
  failedTaskName: string | undefined,
  failedTaskIndex: number | undefined,
): void {
  if (!onStepEvent) return;

  const timestamp = new Date().toISOString();
  if (status === "completed") {
    emitStepEvent(onStepEvent, {
      type: "WORKFLOW_COMPLETED",
      runId,
      workflowName,
      timestamp,
      output: filterInternalKeys(context.data),
      taskCount,
    });
  } else if (status === "failed") {
    emitStepEvent(onStepEvent, {
      type: "WORKFLOW_FAULTED",
      runId,
      workflowName,
      timestamp,
      error: error ?? "Unknown error",
      failedTaskName,
      failedTaskIndex,
    });
  }
}
