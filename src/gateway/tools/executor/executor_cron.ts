/**
 * Cron tool handler — dispatches on action parameter.
 *
 * Each action delegates to CronManager and formats the result
 * as a human-readable string for the agent.
 *
 * @module
 */

import type { CronManager } from "../../../scheduler/cron/parser.ts";
import {
  CLASSIFICATION_ORDER,
  type ClassificationLevel,
} from "../../../core/types/classification.ts";
import { createLogger } from "../../../core/logger/mod.ts";

const log = createLogger("cron-executor");

/** Require a non-empty string from tool input, returning an error message if invalid. */
function requireString(
  input: Record<string, unknown>,
  key: string,
  action: string,
): string | null {
  const value = input[key];
  if (typeof value !== "string" || value.length === 0) {
    return `Error: cron(action: '${action}') requires a non-empty '${key}' argument (string).`;
  }
  return null;
}

/** Parse and validate a ClassificationLevel string, defaulting to INTERNAL. */
function parseClassificationLevel(raw: unknown): ClassificationLevel {
  if (typeof raw === "string" && raw in CLASSIFICATION_ORDER) {
    return raw as ClassificationLevel;
  }
  log.debug("Cron classification defaulted to INTERNAL", {
    operation: "parseClassificationLevel",
    providedValue: raw,
  });
  return "INTERNAL";
}

/** Handle cron create action. */
function executeCronCreate(
  input: Record<string, unknown>,
  cronManager: CronManager,
): string {
  const exprErr = requireString(input, "expression", "create");
  if (exprErr) return exprErr;
  const taskErr = requireString(input, "task", "create");
  if (taskErr) return taskErr;

  const expression = input.expression as string;
  const task = input.task as string;
  const classification = parseClassificationLevel(input.classification);
  const result = cronManager.create({
    expression,
    task,
    classificationCeiling: classification,
  });
  if (!result.ok) return `Error creating cron job: ${result.error}`;
  const job = result.value;
  return [
    "Created cron job:",
    `  ID: ${job.id}`,
    `  Schedule: ${job.expression}`,
    `  Task: ${job.task}`,
    `  Classification: ${job.classificationCeiling}`,
    `  Created: ${job.createdAt.toISOString()}`,
  ].join("\n");
}

/** Handle cron list action. */
function executeCronList(cronManager: CronManager): string {
  const jobs = cronManager.list();
  if (jobs.length === 0) return "No cron jobs registered.";
  return jobs.map((j) =>
    [
      j.id,
      `  Schedule: ${j.expression}`,
      `  Task: ${j.task}`,
      `  Enabled: ${j.enabled}`,
      `  Classification: ${j.classificationCeiling}`,
      `  Created: ${j.createdAt.toISOString()}`,
    ].join("\n")
  ).join("\n\n");
}

/** Handle cron delete action. */
function executeCronDelete(
  input: Record<string, unknown>,
  cronManager: CronManager,
): string {
  const argErr = requireString(input, "job_id", "delete");
  if (argErr) return argErr;

  const jobId = input.job_id as string;
  const result = cronManager.delete(jobId);
  return result.ok ? `Deleted cron job ${jobId}` : `Error: ${result.error}`;
}

/** Handle cron history action. */
function executeCronHistory(
  input: Record<string, unknown>,
  cronManager: CronManager,
): string {
  const argErr = requireString(input, "job_id", "history");
  if (argErr) return argErr;

  const jobId = input.job_id as string;
  const hist = cronManager.history(jobId);
  if (hist.length === 0) return "No execution history for this job.";
  return hist.slice(-10).map((e) =>
    `${e.executedAt.toISOString()} — ${e.success ? "SUCCESS" : "FAILED"}${
      e.error ? ` (${e.error})` : ""
    } [${Math.round(e.durationMs)}ms]`
  ).join("\n");
}

/** Dispatch cron tool. Returns null if not matched. */
export function dispatchCronTool(
  name: string,
  input: Record<string, unknown>,
  cronManager: CronManager | undefined,
): string | null {
  if (name !== "cron") return null;

  const unavailable = "Cron management is not available in this context.";
  if (!cronManager) return unavailable;

  const action = input.action;
  if (typeof action !== "string" || action.length === 0) {
    return "Error: cron requires an 'action' parameter (string).";
  }

  switch (action) {
    case "create":
      return executeCronCreate(input, cronManager);
    case "list":
      return executeCronList(cronManager);
    case "delete":
      return executeCronDelete(input, cronManager);
    case "history":
      return executeCronHistory(input, cronManager);
    default:
      return `Error: unknown action "${action}" for cron. Valid actions: create, list, delete, history`;
  }
}
