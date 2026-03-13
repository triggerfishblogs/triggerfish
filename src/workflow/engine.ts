/**
 * Workflow execution engine — orchestrates task dispatch and flow control.
 *
 * Parses a WorkflowDefinition, walks the task list, dispatches each
 * task through an injected ToolExecutor, and tracks execution state.
 * Individual task executors live in task_runners.ts.
 * @module
 */

import type { ClassificationLevel } from "../core/types/classification.ts";
import { canFlowTo } from "../core/types/classification.ts";
import { createLogger } from "../core/logger/logger.ts";
import { createWorkflowContext, type WorkflowContext } from "./context.ts";
import {
  applyInputTransform,
  applyOutputTransform,
  filterInternalKeys,
  findTaskIndex,
  resolveSwitchOrTaskFlow,
} from "./helpers.ts";
import {
  executeCallTask,
  executeEmitTask,
  executeForTask,
  executeRaiseTask,
  executeRunTask,
  executeSetTask,
  executeSwitchTask,
  executeWaitTask,
} from "./task_runners.ts";
import type {
  WorkflowDefinition,
  WorkflowEvent,
  WorkflowRunResult,
  WorkflowStatus,
  WorkflowTaskEntry,
} from "./types.ts";
import type { RichWorkflowEvent } from "./healing/types.ts";
import type { RuntimeDeviation } from "./healing/types.ts";
import type { ScopedPauseController } from "./healing/scoped_pause.ts";

const log = createLogger("workflow-engine");

/** Maximum sub-workflow recursion depth. */
const MAX_RECURSION_DEPTH = 5;

/** Tool executor function signature (matches existing ToolExecutor). */
export type WorkflowToolExecutor = (
  name: string,
  input: Record<string, unknown>,
) => Promise<string>;

/** Options for executing a workflow. */
export interface ExecuteWorkflowOptions {
  /** Parsed workflow definition. */
  readonly definition: WorkflowDefinition;
  /** Initial input data for the workflow context. */
  readonly input?: Readonly<Record<string, unknown>>;
  /** Tool executor for dispatching call/run tasks. */
  readonly toolExecutor: WorkflowToolExecutor;
  /** Current session taint level getter. */
  readonly getSessionTaint?: () => ClassificationLevel;
  /** Resolver for sub-workflows by name. */
  readonly resolveSubWorkflow?: (
    name: string,
  ) => Promise<WorkflowDefinition | null>;
  /** Current recursion depth (internal — do not set). */
  readonly depth?: number;
  /** Whether shell/script run tasks are allowed (default: true). */
  readonly allowShellExecution?: boolean;
  /** Abort signal for cancellation from registry. */
  readonly signal?: AbortSignal;
  /** Async pause checkpoint called between tasks. */
  readonly checkPause?: () => Promise<void>;
  /** Callback to report task progress to the registry. */
  readonly onTaskProgress?: (taskIndex: number, taskName: string) => void;
  /** Optional callback for rich step-level event emission (self-healing). */
  readonly onStepEvent?: (event: RichWorkflowEvent) => void;
  /** Optional scoped pause controller (self-healing). */
  readonly scopedPause?: ScopedPauseController;
  /** Optional callback to record runtime deviations (self-healing). */
  readonly recordDeviation?: (deviation: RuntimeDeviation) => void;
}

/** Result type for engine operations. */
export type EngineResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: string };

/** Internal result from a single task execution. */
export interface TaskResult {
  readonly context: WorkflowContext;
}

/** Execute a workflow definition to completion. */
export async function executeWorkflow(
  options: ExecuteWorkflowOptions,
): Promise<EngineResult<WorkflowRunResult>> {
  const depth = options.depth ?? 0;
  if (depth >= MAX_RECURSION_DEPTH) {
    return {
      ok: false,
      error:
        `Workflow recursion depth exceeded maximum of ${MAX_RECURSION_DEPTH}`,
    };
  }

  const runId = crypto.randomUUID();
  const startedAt = new Date().toISOString();
  const workflowName = options.definition.document.name;
  const events: WorkflowEvent[] = [];
  const deviations: RuntimeDeviation[] = [];
  let context = createWorkflowContext(
    options.input as Record<string, unknown> | undefined,
  );
  let status: WorkflowStatus = "running";
  let error: string | undefined;
  let failedTaskName: string | undefined;
  let failedTaskIndex: number | undefined;

  const tasks = options.definition.do;
  let taskIndex = 0;

  if (options.recordDeviation) {
    const originalRecord = options.recordDeviation;
    options = { ...options, recordDeviation: (d) => { deviations.push(d); originalRecord(d); } };
  }

  try {
    while (taskIndex < tasks.length && status === "running") {
      const entry = tasks[taskIndex];

      const cancelResult = checkSignalAborted(options.signal);
      if (cancelResult) {
        status = "cancelled";
        error = cancelResult;
        break;
      }

      if (options.checkPause) await options.checkPause();

      if (options.scopedPause?.isTaskBlocked(taskIndex)) {
        if (options.checkPause) await options.checkPause();
      }

      if (options.onTaskProgress) {
        options.onTaskProgress(taskIndex, entry.name);
      }

      const ceilingResult = checkCeiling(options);
      if (!ceilingResult.ok) {
        status = "failed";
        error = ceilingResult.error;
        break;
      }

      if (entry.task.if && !context.evaluateCondition(entry.task.if)) {
        emitStepEvent(options, {
          type: "STEP_SKIPPED",
          runId,
          workflowName,
          timestamp: new Date().toISOString(),
          taskName: entry.name,
          taskIndex,
          reason: `Condition '${entry.task.if}' evaluated to false`,
        });
        taskIndex++;
        continue;
      }

      const taintBefore = options.getSessionTaint?.() ?? "PUBLIC";
      emitStepEvent(options, {
        type: "STEP_STARTED",
        runId,
        workflowName,
        timestamp: new Date().toISOString(),
        taskName: entry.name,
        taskIndex,
        taskDef: entry,
        input: context.data,
        runningTaint: taintBefore,
      });

      context = applyInputTransform(context, entry.task.input);

      const stepStart = Date.now();
      const result = await dispatchTask(entry, context, events, options);
      const stepDuration = Date.now() - stepStart;

      if (!result.ok) {
        emitStepEvent(options, {
          type: "STEP_FAILED",
          runId,
          workflowName,
          timestamp: new Date().toISOString(),
          taskName: entry.name,
          taskIndex,
          error: result.error,
          input: context.data,
          attemptNumber: 1,
        });
        status = "failed";
        error = result.error;
        failedTaskName = entry.name;
        failedTaskIndex = taskIndex;
        break;
      }

      context = result.value.context;
      context = applyOutputTransform(context, entry.task.output, entry.name);

      const taintAfter = options.getSessionTaint?.() ?? "PUBLIC";
      emitStepEvent(options, {
        type: "STEP_COMPLETED",
        runId,
        workflowName,
        timestamp: new Date().toISOString(),
        taskName: entry.name,
        taskIndex,
        output: context.resolve(entry.name),
        duration: stepDuration,
        taintAfter,
      });

      const flow = resolveSwitchOrTaskFlow(entry.task, context);
      if (flow === "end") break;
      if (flow !== "continue") {
        const jumpIndex = findTaskIndex(tasks, flow);
        if (jumpIndex === -1) {
          status = "failed";
          error = `Flow directive references unknown task: ${flow}`;
          break;
        }
        taskIndex = jumpIndex;
        continue;
      }

      taskIndex++;
    }

    if (status === "running") status = "completed";
  } catch (e: unknown) {
    if (isWorkflowCancelled(e)) {
      status = "cancelled";
      error = e.message;
    } else {
      status = "failed";
      error = e instanceof Error ? e.message : String(e);
      log.error("Workflow execution threw unexpected error", {
        operation: "executeWorkflow",
        workflow: workflowName,
        err: e,
      });
    }
  }

  emitTerminalEvent(options, runId, workflowName, status, error, context, tasks.length, failedTaskName, failedTaskIndex);

  const output = filterInternalKeys(context.data);

  return {
    ok: true,
    value: {
      runId,
      workflowName,
      status,
      output,
      events,
      error,
      startedAt,
      completedAt: new Date().toISOString(),
      taskCount: tasks.length,
      classification: options.getSessionTaint?.(),
      runtimeDeviations: deviations.length > 0 ? deviations : undefined,
    },
  };
}

// --- Task dispatch ---

function dispatchTask(
  entry: WorkflowTaskEntry,
  context: WorkflowContext,
  events: WorkflowEvent[],
  options: ExecuteWorkflowOptions,
): Promise<EngineResult<TaskResult>> {
  const task = entry.task;

  switch (task.type) {
    case "call":
      return executeCallTask(entry.name, task, context, options);
    case "set":
      return executeSetTask(task, context);
    case "switch":
      return executeSwitchTask(task, context);
    case "for":
      return executeForTask(task, context, events, options, dispatchTask);
    case "raise":
      return executeRaiseTask(task);
    case "emit":
      return executeEmitTask(task, context, events);
    case "wait":
      return executeWaitTask(task, context);
    case "run":
      return executeRunTask(
        entry.name,
        task,
        context,
        options,
        executeWorkflow,
      );
  }
}

// --- Helpers ---

function checkSignalAborted(signal?: AbortSignal): string | null {
  if (signal?.aborted) {
    return "Workflow cancelled by user";
  }
  return null;
}

function isWorkflowCancelled(e: unknown): e is Error {
  return e instanceof Error && e.name === "WorkflowCancelledError";
}

function checkCeiling(
  options: ExecuteWorkflowOptions,
): EngineResult<void> {
  const ceiling = options.definition.classificationCeiling;
  if (!ceiling || !options.getSessionTaint) {
    return { ok: true, value: undefined };
  }

  const taint = options.getSessionTaint();
  if (!canFlowTo(taint, ceiling)) {
    log.warn(
      "Workflow ceiling breached: session taint exceeds classification ceiling",
      {
        operation: "checkCeiling",
        workflow: options.definition.document.name,
        sessionTaint: taint,
        ceiling,
      },
    );
    return {
      ok: false,
      error:
        `Workflow classification ceiling breached: session taint ${taint} exceeds ceiling ${ceiling}`,
    };
  }

  log.debug("Workflow ceiling check passed", {
    operation: "checkCeiling",
    workflow: options.definition.document.name,
    sessionTaint: taint,
    ceiling,
  });
  return { ok: true, value: undefined };
}

function emitStepEvent(
  options: ExecuteWorkflowOptions,
  event: RichWorkflowEvent,
): void {
  if (!options.onStepEvent) return;
  try {
    options.onStepEvent(event);
  } catch (err) {
    log.warn("Step event callback threw", {
      operation: "emitStepEvent",
      eventType: event.type,
      err,
    });
  }
}

function emitTerminalEvent(
  options: ExecuteWorkflowOptions,
  runId: string,
  workflowName: string,
  status: WorkflowStatus,
  error: string | undefined,
  context: WorkflowContext,
  taskCount: number,
  failedTaskName: string | undefined,
  failedTaskIndex: number | undefined,
): void {
  if (!options.onStepEvent) return;

  const timestamp = new Date().toISOString();
  if (status === "completed") {
    emitStepEvent(options, {
      type: "WORKFLOW_COMPLETED",
      runId,
      workflowName,
      timestamp,
      output: filterInternalKeys(context.data),
      taskCount,
    });
  } else if (status === "failed") {
    emitStepEvent(options, {
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
