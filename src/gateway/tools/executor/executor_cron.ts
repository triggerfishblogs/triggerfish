/**
 * Cron tool handlers — create, list, delete, history.
 *
 * Each handler delegates to CronManager and formats the result
 * as a human-readable string for the agent.
 *
 * @module
 */

import type { CronManager } from "../../../scheduler/cron/parser.ts";
import type { ClassificationLevel } from "../../../core/types/classification.ts";

/** Handle cron_create tool call. */
export function executeCronCreate(
  input: Record<string, unknown>,
  cronManager: CronManager,
): string {
  const expression = input.expression as string;
  const task = input.task as string;
  const classification = (input.classification as string) ?? "INTERNAL";
  const result = cronManager.create({
    expression,
    task,
    classificationCeiling: classification as ClassificationLevel,
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

/** Handle cron_list tool call. */
export function executeCronList(cronManager: CronManager): string {
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

/** Handle cron_delete tool call. */
export function executeCronDelete(
  input: Record<string, unknown>,
  cronManager: CronManager,
): string {
  const jobId = input.job_id as string;
  const result = cronManager.delete(jobId);
  return result.ok ? `Deleted cron job ${jobId}` : `Error: ${result.error}`;
}

/** Handle cron_history tool call. */
export function executeCronHistory(
  input: Record<string, unknown>,
  cronManager: CronManager,
): string {
  const jobId = input.job_id as string;
  const hist = cronManager.history(jobId);
  if (hist.length === 0) return "No execution history for this job.";
  return hist.slice(-10).map((e) =>
    `${e.executedAt.toISOString()} — ${e.success ? "SUCCESS" : "FAILED"}${
      e.error ? ` (${e.error})` : ""
    } [${Math.round(e.durationMs)}ms]`
  ).join("\n");
}

/** Dispatch cron tools. Returns null if not matched. */
export function dispatchCronTool(
  name: string,
  input: Record<string, unknown>,
  cronManager: CronManager | undefined,
): string | null {
  const unavailable = "Cron management is not available in this context.";
  switch (name) {
    case "cron_create":
      return cronManager ? executeCronCreate(input, cronManager) : unavailable;
    case "cron_list":
      return cronManager ? executeCronList(cronManager) : unavailable;
    case "cron_delete":
      return cronManager ? executeCronDelete(input, cronManager) : unavailable;
    case "cron_history":
      return cronManager ? executeCronHistory(input, cronManager) : unavailable;
    default:
      return null;
  }
}
