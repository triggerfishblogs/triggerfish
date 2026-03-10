/**
 * Workflow engine helper functions — transforms, flow resolution, utilities.
 * @module
 */

import type { WorkflowContext } from "./context.ts";
import type { WorkflowTask, WorkflowTaskEntry } from "./types.ts";

/** Apply input transform to workflow context before task execution. */
export function applyInputTransform(
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

/** Apply output transform to workflow context after task execution. */
export function applyOutputTransform(
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
export function resolveSwitchOrTaskFlow(
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

/** Find task index by name. */
export function findTaskIndex(
  tasks: readonly WorkflowTaskEntry[],
  name: string,
): number {
  return tasks.findIndex((t) => t.name === name);
}

/** Filter out internal keys (prefixed with __) from workflow output. */
export function filterInternalKeys(
  data: Readonly<Record<string, unknown>>,
): Readonly<Record<string, unknown>> {
  const filtered: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (!key.startsWith("__")) {
      filtered[key] = value;
    }
  }
  return filtered;
}
