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

const log = createLogger("workflow-engine");
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
  WorkflowTask,
  WorkflowTaskEntry,
} from "./types.ts";

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
  const events: WorkflowEvent[] = [];
  let context = createWorkflowContext(
    options.input as Record<string, unknown> | undefined,
  );
  let status: WorkflowStatus = "running";
  let error: string | undefined;

  const tasks = options.definition.do;
  let taskIndex = 0;

  try {
    while (taskIndex < tasks.length && status === "running") {
      const entry = tasks[taskIndex];

      const ceilingResult = checkCeiling(options);
      if (!ceilingResult.ok) {
        status = "failed";
        error = ceilingResult.error;
        break;
      }

      if (entry.task.if && !context.evaluateCondition(entry.task.if)) {
        taskIndex++;
        continue;
      }

      context = applyInputTransform(context, entry.task.input);

      const result = await dispatchTask(entry, context, events, options);
      if (!result.ok) {
        status = "failed";
        error = result.error;
        break;
      }

      context = result.value.context;
      context = applyOutputTransform(context, entry.task.output, entry.name);

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
    status = "failed";
    error = e instanceof Error ? e.message : String(e);
  }

  return {
    ok: true,
    value: {
      runId,
      workflowName: options.definition.document.name,
      status,
      output: context.data,
      events,
      error,
      startedAt,
      completedAt: new Date().toISOString(),
      taskCount: tasks.length,
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

  return { ok: true, value: undefined };
}

function applyInputTransform(
  context: WorkflowContext,
  transform:
    | { readonly from?: string | Readonly<Record<string, string>> }
    | undefined,
): WorkflowContext {
  if (!transform?.from) return context;

  if (typeof transform.from === "string") {
    const value = context.evaluate(transform.from);
    if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      return context.merge(value as Record<string, unknown>);
    }
    return context;
  }

  const mapped: Record<string, unknown> = {};
  for (const [key, expr] of Object.entries(transform.from)) {
    mapped[key] = context.evaluate(expr);
  }
  return context.merge(mapped);
}

function applyOutputTransform(
  context: WorkflowContext,
  transform:
    | { readonly from?: string | Readonly<Record<string, string>> }
    | undefined,
  taskName: string,
): WorkflowContext {
  if (!transform?.from) return context;

  if (typeof transform.from === "string") {
    const value = context.evaluate(transform.from);
    return context.set(taskName, value);
  }

  const mapped: Record<string, unknown> = {};
  for (const [key, expr] of Object.entries(transform.from)) {
    mapped[key] = context.evaluate(expr);
  }
  return context.set(taskName, mapped);
}

/** Resolve flow directive, checking switch result first. */
function resolveSwitchOrTaskFlow(
  task: WorkflowTask,
  context: WorkflowContext,
): string {
  if (task.type === "switch") {
    const switchResult = context.resolve(".__switchResult") as
      | { then: string }
      | undefined;
    if (switchResult?.then) return switchResult.then;
  }

  if (task.then) return task.then;
  return "continue";
}

function findTaskIndex(
  tasks: readonly WorkflowTaskEntry[],
  name: string,
): number {
  return tasks.findIndex((t) => t.name === name);
}
