/**
 * Run task sub-executors for shell, script, and sub-workflow execution.
 *
 * Extracted from task_runners.ts to keep file sizes under the hygiene limit.
 * @module
 */

import type { WorkflowContext } from "./context.ts";
import type {
  EngineResult,
  ExecuteWorkflowOptions,
  TaskResult,
} from "./engine.ts";
import type { SubWorkflowExecutor } from "./task_runners.ts";
import { parseToolResult } from "./task_runners.ts";

/** Execute a shell command via the tool executor. */
export async function executeRunShell(
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

    const resultStr = await options.toolExecutor("run_command", { command });
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

/** Execute a script via the tool executor. */
export async function executeRunScript(
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

/** Execute a sub-workflow via the injected executor callback. */
export async function executeRunSubWorkflow(
  taskName: string,
  wf: {
    readonly name: string;
    readonly input?: Readonly<Record<string, unknown>>;
  },
  context: WorkflowContext,
  options: ExecuteWorkflowOptions,
  subWorkflowExecutor: SubWorkflowExecutor,
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

  const subResult = await subWorkflowExecutor({
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
