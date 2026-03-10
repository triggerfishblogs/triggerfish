/**
 * Workflow execution engine.
 *
 * Parses a WorkflowDefinition, walks the task list, dispatches each
 * task through an injected ToolExecutor, and tracks execution state.
 * @module
 */

import type { ClassificationLevel } from "../core/types/classification.ts";
import { canFlowTo } from "../core/types/classification.ts";
import { createWorkflowContext, type WorkflowContext } from "./context.ts";
import { isDispatchError, resolveCallDispatch } from "./dispatch.ts";
import type {
  CallTask,
  EmitTask,
  ForTask,
  RaiseTask,
  RunTask,
  SetTask,
  SwitchTask,
  WaitTask,
  WorkflowDefinition,
  WorkflowEvent,
  WorkflowRunResult,
  WorkflowRunState,
  WorkflowStatus,
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

      // Check classification ceiling before each task
      const ceilingResult = checkCeiling(options);
      if (!ceilingResult.ok) {
        status = "failed";
        error = ceilingResult.error;
        break;
      }

      // Evaluate `if:` condition
      if (entry.task.if && !context.evaluateCondition(entry.task.if)) {
        taskIndex++;
        continue;
      }

      // Apply input transform
      context = applyInputTransform(context, entry.task.input);

      // Execute the task
      const result = await executeTask(entry, context, events, options);
      if (!result.ok) {
        status = "failed";
        error = result.error;
        break;
      }

      context = result.value.context;

      // Apply output transform
      context = applyOutputTransform(context, entry.task.output, entry.name);

      // Handle flow directive — switch tasks use the matched case's `then`
      const flow = resolveSwitchOrTaskFlow(entry.task, context);
      if (flow === "end") {
        break;
      }
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

/** Build a workflow run state snapshot. */
export function buildRunState(
  runId: string,
  definition: WorkflowDefinition,
  input: Readonly<Record<string, unknown>>,
  taskIndex: number,
  taskName: string,
  status: WorkflowStatus,
  events: readonly WorkflowEvent[],
): WorkflowRunState {
  return {
    id: runId,
    workflowId: definition.document
      .name as unknown as import("./types.ts").WorkflowId,
    workflowName: definition.document.name,
    status,
    currentTaskIndex: taskIndex,
    currentTaskName: taskName,
    input,
    events,
    startedAt: new Date().toISOString(),
  };
}

// --- Task execution ---

interface TaskResult {
  readonly context: WorkflowContext;
}

function executeTask(
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
      return executeForTask(task, context, events, options);
    case "raise":
      return executeRaiseTask(task);
    case "emit":
      return executeEmitTask(task, context, events);
    case "wait":
      return executeWaitTask(task, context);
    case "run":
      return executeRunTask(entry.name, task, context, options);
  }
}

async function executeCallTask(
  taskName: string,
  task: CallTask,
  context: WorkflowContext,
  options: ExecuteWorkflowOptions,
): Promise<EngineResult<TaskResult>> {
  const dispatch = resolveCallDispatch(task, context);
  if (isDispatchError(dispatch)) {
    return { ok: false, error: `Task '${taskName}': ${dispatch.error}` };
  }

  try {
    const resultStr = await options.toolExecutor(
      dispatch.toolName,
      dispatch.input,
    );
    const parsed = parseToolResult(resultStr);
    const newContext = context.set(taskName, parsed);
    return { ok: true, value: { context: newContext } };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: `Task '${taskName}' call failed: ${msg}` };
  }
}

function executeSetTask(
  task: SetTask,
  context: WorkflowContext,
): Promise<EngineResult<TaskResult>> {
  const newContext = context.merge(task.set);
  return Promise.resolve({ ok: true, value: { context: newContext } });
}

function executeSwitchTask(
  task: SwitchTask,
  context: WorkflowContext,
): Promise<EngineResult<TaskResult>> {
  for (const c of task.switch) {
    // A case without `when` is the default case
    if (!c.when || context.evaluateCondition(c.when)) {
      // Store the matched flow directive so the engine can follow it
      // The switch task itself doesn't change flow — the then directive does
      const newContext = context.set("__switchResult", {
        matched: c.name,
        then: c.then,
      });
      return Promise.resolve({ ok: true, value: { context: newContext } });
    }
  }

  // No case matched — continue normally
  return Promise.resolve({ ok: true, value: { context } });
}

async function executeForTask(
  task: ForTask,
  context: WorkflowContext,
  events: WorkflowEvent[],
  options: ExecuteWorkflowOptions,
): Promise<EngineResult<TaskResult>> {
  const collection = context.evaluate(task.for.in);
  if (!Array.isArray(collection)) {
    return {
      ok: false,
      error: `For loop: '${task.for.in}' did not resolve to an array`,
    };
  }

  let currentContext = context;

  for (let i = 0; i < collection.length; i++) {
    // Set loop variables
    currentContext = currentContext.set(task.for.each, collection[i]);
    if (task.for.at) {
      currentContext = currentContext.set(task.for.at, i);
    }

    // Execute nested tasks
    for (const entry of task.do) {
      if (entry.task.if && !currentContext.evaluateCondition(entry.task.if)) {
        continue;
      }

      const result = await executeTask(entry, currentContext, events, options);
      if (!result.ok) return result;
      currentContext = result.value.context;
    }
  }

  return { ok: true, value: { context: currentContext } };
}

function executeRaiseTask(
  task: RaiseTask,
): Promise<EngineResult<TaskResult>> {
  const e = task.raise.error;
  return Promise.resolve({
    ok: false,
    error: `Workflow raised error [${e.status} ${e.type}]: ${e.title}${
      e.detail ? ` — ${e.detail}` : ""
    }`,
  });
}

function executeEmitTask(
  task: EmitTask,
  context: WorkflowContext,
  events: WorkflowEvent[],
): Promise<EngineResult<TaskResult>> {
  events.push({
    type: task.emit.event.type,
    source: task.emit.event.source,
    data: task.emit.event.data,
    timestamp: new Date().toISOString(),
  });
  return Promise.resolve({ ok: true, value: { context } });
}

async function executeWaitTask(
  task: WaitTask,
  context: WorkflowContext,
): Promise<EngineResult<TaskResult>> {
  const ms = parseDuration(task.wait);
  if (ms > 0) {
    await new Promise((resolve) => setTimeout(resolve, ms));
  }
  return { ok: true, value: { context } };
}

function executeRunTask(
  taskName: string,
  task: RunTask,
  context: WorkflowContext,
  options: ExecuteWorkflowOptions,
): Promise<EngineResult<TaskResult>> {
  if ("shell" in task.run) {
    return executeRunShell(taskName, task.run.shell, context, options);
  }
  if ("script" in task.run) {
    return executeRunScript(taskName, task.run.script, context, options);
  }
  if ("workflow" in task.run) {
    return executeRunSubWorkflow(taskName, task.run.workflow, context, options);
  }
  return Promise.resolve({
    ok: false,
    error: `Task '${taskName}': run target not recognized`,
  });
}

async function executeRunShell(
  taskName: string,
  shell: {
    readonly command: string;
    readonly arguments?: Readonly<Record<string, string>>;
  },
  context: WorkflowContext,
  options: ExecuteWorkflowOptions,
): Promise<EngineResult<TaskResult>> {
  try {
    const command =
      typeof shell.command === "string" && shell.command.includes("${")
        ? String(context.evaluate(shell.command))
        : shell.command;

    const resultStr = await options.toolExecutor("run_command", {
      command,
    });
    const newContext = context.set(taskName, parseToolResult(resultStr));
    return { ok: true, value: { context: newContext } };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return {
      ok: false,
      error: `Task '${taskName}' shell execution failed: ${msg}`,
    };
  }
}

async function executeRunScript(
  taskName: string,
  script: { readonly language: string; readonly code: string },
  context: WorkflowContext,
  options: ExecuteWorkflowOptions,
): Promise<EngineResult<TaskResult>> {
  try {
    const resultStr = await options.toolExecutor("run_command", {
      command: script.code,
      language: script.language,
    });
    const newContext = context.set(taskName, parseToolResult(resultStr));
    return { ok: true, value: { context: newContext } };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return {
      ok: false,
      error: `Task '${taskName}' script execution failed: ${msg}`,
    };
  }
}

async function executeRunSubWorkflow(
  taskName: string,
  wf: {
    readonly name: string;
    readonly input?: Readonly<Record<string, unknown>>;
  },
  context: WorkflowContext,
  options: ExecuteWorkflowOptions,
): Promise<EngineResult<TaskResult>> {
  if (!options.resolveSubWorkflow) {
    return {
      ok: false,
      error:
        `Task '${taskName}': sub-workflow execution requires resolveSubWorkflow callback`,
    };
  }

  const subDef = await options.resolveSubWorkflow(wf.name);
  if (!subDef) {
    return {
      ok: false,
      error: `Task '${taskName}': sub-workflow '${wf.name}' not found`,
    };
  }

  const subInput = wf.input ? context.resolveObject(wf.input) : context.data;

  const subResult = await executeWorkflow({
    definition: subDef,
    input: subInput,
    toolExecutor: options.toolExecutor,
    getSessionTaint: options.getSessionTaint,
    resolveSubWorkflow: options.resolveSubWorkflow,
    depth: (options.depth ?? 0) + 1,
  });

  if (!subResult.ok) {
    return {
      ok: false,
      error:
        `Task '${taskName}': sub-workflow '${wf.name}' failed: ${subResult.error}`,
    };
  }

  if (subResult.value.status === "failed") {
    return {
      ok: false,
      error: `Task '${taskName}': sub-workflow '${wf.name}' failed: ${
        subResult.value.error ?? "unknown error"
      }`,
    };
  }

  const newContext = context.set(taskName, subResult.value.output);
  return { ok: true, value: { context: newContext } };
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

  // Map-based transform: { key: expression }
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
  task: import("./types.ts").WorkflowTask,
  context: WorkflowContext,
): string {
  // For switch tasks, use the matched case's `then` directive
  if (task.type === "switch") {
    const switchResult = context.resolve(".__switchResult") as
      | { then: string }
      | undefined;
    if (switchResult?.then) return switchResult.then;
  }

  // Otherwise use the task's own `then` directive
  if (task.then) return task.then;
  return "continue";
}

function findTaskIndex(
  tasks: readonly WorkflowTaskEntry[],
  name: string,
): number {
  return tasks.findIndex((t) => t.name === name);
}

/** Parse ISO 8601 duration to milliseconds. Supports PT<n>S, PT<n>M, PT<n>H. */
function parseDuration(duration: string): number {
  const match = duration.match(
    /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?$/,
  );
  if (!match) return 0;

  const hours = parseInt(match[1] ?? "0", 10);
  const minutes = parseInt(match[2] ?? "0", 10);
  const seconds = parseFloat(match[3] ?? "0");

  return (hours * 3600 + minutes * 60 + seconds) * 1000;
}

/** Try to parse a tool result string as JSON, fall back to raw string. */
function parseToolResult(result: string): unknown {
  try {
    return JSON.parse(result);
  } catch {
    return result;
  }
}
