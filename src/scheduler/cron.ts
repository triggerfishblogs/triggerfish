/**
 * Cron job manager for scheduled task execution.
 *
 * Provides a standard 5-field cron expression parser and a manager
 * for creating, listing, deleting, and tracking cron jobs. Each job
 * runs in its own spawned session with independent taint and a
 * classification ceiling.
 *
 * @module
 */

import type {
  ClassificationLevel,
  Result,
} from "../core/types/classification.ts";
import type { StorageProvider } from "../core/storage/provider.ts";

/** Parsed representation of a cron expression field. */
interface CronField {
  readonly type: "wildcard" | "value" | "step" | "range" | "list";
  readonly values: readonly number[];
}

/** Parsed cron expression with all five standard fields. */
export interface CronExpression {
  readonly minute: CronField;
  readonly hour: CronField;
  readonly dayOfMonth: CronField;
  readonly month: CronField;
  readonly dayOfWeek: CronField;
  readonly raw: string;
}

/** Options for creating a cron job. */
export interface CronJobOptions {
  readonly expression: string;
  readonly task: string;
  readonly classificationCeiling: ClassificationLevel;
}

/** A scheduled cron job. */
export interface CronJob {
  readonly id: string;
  readonly expression: string;
  readonly task: string;
  readonly classificationCeiling: ClassificationLevel;
  readonly createdAt: Date;
  readonly enabled: boolean;
}

/** Execution history entry for a cron job. */
export interface CronJobExecution {
  readonly jobId: string;
  readonly executedAt: Date;
  readonly durationMs: number;
  readonly success: boolean;
  readonly error?: string;
}

/** Cron job manager interface. */
export interface CronManager {
  /** Create a new cron job. */
  create(options: CronJobOptions): Result<CronJob, string>;
  /** List all registered jobs. */
  list(): readonly CronJob[];
  /** Delete a job by ID. */
  delete(jobId: string): Result<void, string>;
  /** Get execution history for a job. */
  history(jobId: string): readonly CronJobExecution[];
  /** Record an execution result for a job. */
  recordExecution(execution: CronJobExecution): void;
}

/** Valid ranges for each cron field. */
const FIELD_RANGES: readonly { readonly min: number; readonly max: number }[] = [
  { min: 0, max: 59 },  // minute
  { min: 0, max: 23 },  // hour
  { min: 1, max: 31 },  // day of month
  { min: 1, max: 12 },  // month
  { min: 0, max: 6 },   // day of week
];

/**
 * Parse a single cron field (e.g., step, range, list, wildcard, or value).
 */
function parseCronField(
  field: string,
  min: number,
  max: number,
): Result<CronField, string> {
  // Wildcard
  if (field === "*") {
    const values: number[] = [];
    for (let i = min; i <= max; i++) values.push(i);
    return { ok: true, value: { type: "wildcard", values } };
  }

  // Step: */N or M-N/S
  if (field.includes("/")) {
    const parts = field.split("/");
    if (parts.length !== 2) {
      return { ok: false, error: `Invalid step expression: ${field}` };
    }
    const step = parseInt(parts[1], 10);
    if (isNaN(step) || step <= 0) {
      return { ok: false, error: `Invalid step value: ${parts[1]}` };
    }

    let start = min;
    let end = max;
    if (parts[0] !== "*") {
      if (parts[0].includes("-")) {
        const rangeParts = parts[0].split("-");
        start = parseInt(rangeParts[0], 10);
        end = parseInt(rangeParts[1], 10);
      } else {
        start = parseInt(parts[0], 10);
      }
    }

    if (isNaN(start) || isNaN(end)) {
      return { ok: false, error: `Invalid step range: ${field}` };
    }

    const values: number[] = [];
    for (let i = start; i <= end; i += step) values.push(i);
    return { ok: true, value: { type: "step", values } };
  }

  // List: 1,2,3
  if (field.includes(",")) {
    const values: number[] = [];
    for (const part of field.split(",")) {
      const val = parseInt(part.trim(), 10);
      if (isNaN(val) || val < min || val > max) {
        return { ok: false, error: `Invalid list value: ${part}` };
      }
      values.push(val);
    }
    return { ok: true, value: { type: "list", values } };
  }

  // Range: 1-5
  if (field.includes("-")) {
    const parts = field.split("-");
    if (parts.length !== 2) {
      return { ok: false, error: `Invalid range: ${field}` };
    }
    const start = parseInt(parts[0], 10);
    const end = parseInt(parts[1], 10);
    if (isNaN(start) || isNaN(end) || start < min || end > max || start > end) {
      return { ok: false, error: `Invalid range: ${field}` };
    }
    const values: number[] = [];
    for (let i = start; i <= end; i++) values.push(i);
    return { ok: true, value: { type: "range", values } };
  }

  // Single value
  const val = parseInt(field, 10);
  if (isNaN(val) || val < min || val > max) {
    return { ok: false, error: `Invalid value: ${field} (expected ${min}-${max})` };
  }
  return { ok: true, value: { type: "value", values: [val] } };
}

/**
 * Check if a parsed cron expression matches the given date at minute precision.
 *
 * Evaluates each field (minute, hour, dayOfMonth, month, dayOfWeek) against
 * the corresponding component of the date. All five fields must match.
 *
 * @param expr - Parsed cron expression
 * @param now - Date to check against (defaults to current time)
 * @returns true if the expression matches the given time
 */
export function matchesNow(expr: CronExpression, now?: Date): boolean {
  const d = now ?? new Date();
  return (
    expr.minute.values.includes(d.getMinutes()) &&
    expr.hour.values.includes(d.getHours()) &&
    expr.dayOfMonth.values.includes(d.getDate()) &&
    expr.month.values.includes(d.getMonth() + 1) &&
    expr.dayOfWeek.values.includes(d.getDay())
  );
}

/**
 * Parse a standard 5-field cron expression.
 *
 * Format: minute hour day-of-month month day-of-week
 *
 * Supports: wildcards (*), steps (* /N), ranges (M-N), lists (A,B,C), values.
 *
 * @returns Result with parsed expression or error message
 */
export function parseCronExpression(
  expression: string,
): Result<CronExpression, string> {
  const fields = expression.trim().split(/\s+/);
  if (fields.length !== 5) {
    return {
      ok: false,
      error: `Expected 5 fields, got ${fields.length}: "${expression}"`,
    };
  }

  const parsed: CronField[] = [];
  for (let i = 0; i < 5; i++) {
    const result = parseCronField(
      fields[i],
      FIELD_RANGES[i].min,
      FIELD_RANGES[i].max,
    );
    if (!result.ok) {
      return { ok: false, error: result.error };
    }
    parsed.push(result.value);
  }

  return {
    ok: true,
    value: {
      minute: parsed[0],
      hour: parsed[1],
      dayOfMonth: parsed[2],
      month: parsed[3],
      dayOfWeek: parsed[4],
      raw: expression,
    },
  };
}

/** Storage key prefix for cron jobs. */
const CRON_JOB_PREFIX = "cron:";
/** Storage key prefix for cron execution history. */
const CRON_HISTORY_PREFIX = "cron-history:";
/** Maximum execution history entries per job. */
const MAX_HISTORY_PER_JOB = 100;

/** Serialise a CronJob to JSON string for storage. */
function serialiseJob(job: CronJob): string {
  return JSON.stringify({
    ...job,
    createdAt: job.createdAt.toISOString(),
  });
}

/** Deserialise a JSON string to CronJob. */
function deserialiseJob(raw: string): CronJob {
  const data = JSON.parse(raw);
  return {
    ...data,
    createdAt: new Date(data.createdAt),
  } as CronJob;
}

/** Serialise execution history for a job. */
function serialiseHistory(history: readonly CronJobExecution[]): string {
  return JSON.stringify(
    history.map((e) => ({
      ...e,
      executedAt: e.executedAt.toISOString(),
    })),
  );
}

/** Deserialise execution history. */
function deserialiseHistory(raw: string): CronJobExecution[] {
  const data = JSON.parse(raw);
  return (data as Array<Record<string, unknown>>).map((e) => ({
    ...e,
    executedAt: new Date(e.executedAt as string),
  })) as CronJobExecution[];
}

/**
 * Create a new cron manager for scheduling and managing jobs.
 *
 * Jobs are stored in memory only. Use `createPersistentCronManager`
 * for persistence across daemon restarts.
 */
export function createCronManager(): CronManager {
  const jobs = new Map<string, CronJob>();
  const executionHistory = new Map<string, CronJobExecution[]>();

  return {
    create(options: CronJobOptions): Result<CronJob, string> {
      const parseResult = parseCronExpression(options.expression);
      if (!parseResult.ok) {
        return { ok: false, error: parseResult.error };
      }

      const id = crypto.randomUUID();
      const job: CronJob = {
        id,
        expression: options.expression,
        task: options.task,
        classificationCeiling: options.classificationCeiling,
        createdAt: new Date(),
        enabled: true,
      };

      jobs.set(id, job);
      executionHistory.set(id, []);
      return { ok: true, value: job };
    },

    list(): readonly CronJob[] {
      return [...jobs.values()];
    },

    delete(jobId: string): Result<void, string> {
      if (!jobs.has(jobId)) {
        return { ok: false, error: `Job not found: ${jobId}` };
      }
      jobs.delete(jobId);
      return { ok: true, value: undefined };
    },

    history(jobId: string): readonly CronJobExecution[] {
      return executionHistory.get(jobId) ?? [];
    },

    recordExecution(execution: CronJobExecution): void {
      const hist = executionHistory.get(execution.jobId);
      if (hist) {
        hist.push(execution);
      }
    },
  };
}

/**
 * Create a persistent cron manager backed by a StorageProvider.
 *
 * Jobs and execution history survive daemon restarts. On creation,
 * all stored jobs are loaded into memory for the tick loop.
 * Mutations (create/delete/recordExecution) are written through
 * to storage immediately.
 *
 * @param storage - StorageProvider for persisting jobs and history
 * @returns A CronManager that persists to the given storage
 */
export async function createPersistentCronManager(
  storage: StorageProvider,
): Promise<CronManager> {
  // Load existing jobs from storage into memory
  const jobs = new Map<string, CronJob>();
  const executionHistory = new Map<string, CronJobExecution[]>();

  const jobKeys = await storage.list(CRON_JOB_PREFIX);
  for (const key of jobKeys) {
    const raw = await storage.get(key);
    if (raw) {
      const job = deserialiseJob(raw);
      jobs.set(job.id, job);
    }
  }

  // Load execution history for each job
  for (const jobId of jobs.keys()) {
    const raw = await storage.get(CRON_HISTORY_PREFIX + jobId);
    if (raw) {
      executionHistory.set(jobId, deserialiseHistory(raw));
    } else {
      executionHistory.set(jobId, []);
    }
  }

  return {
    create(options: CronJobOptions): Result<CronJob, string> {
      const parseResult = parseCronExpression(options.expression);
      if (!parseResult.ok) {
        return { ok: false, error: parseResult.error };
      }

      const id = crypto.randomUUID();
      const job: CronJob = {
        id,
        expression: options.expression,
        task: options.task,
        classificationCeiling: options.classificationCeiling,
        createdAt: new Date(),
        enabled: true,
      };

      jobs.set(id, job);
      executionHistory.set(id, []);
      // Write-through to storage (fire-and-forget)
      storage.set(CRON_JOB_PREFIX + id, serialiseJob(job));
      storage.set(CRON_HISTORY_PREFIX + id, "[]");
      return { ok: true, value: job };
    },

    list(): readonly CronJob[] {
      return [...jobs.values()];
    },

    delete(jobId: string): Result<void, string> {
      if (!jobs.has(jobId)) {
        return { ok: false, error: `Job not found: ${jobId}` };
      }
      jobs.delete(jobId);
      executionHistory.delete(jobId);
      // Write-through deletion
      storage.delete(CRON_JOB_PREFIX + jobId);
      storage.delete(CRON_HISTORY_PREFIX + jobId);
      return { ok: true, value: undefined };
    },

    history(jobId: string): readonly CronJobExecution[] {
      return executionHistory.get(jobId) ?? [];
    },

    recordExecution(execution: CronJobExecution): void {
      let hist = executionHistory.get(execution.jobId);
      if (!hist) {
        hist = [];
        executionHistory.set(execution.jobId, hist);
      }
      hist.push(execution);
      // Trim to max history size
      if (hist.length > MAX_HISTORY_PER_JOB) {
        hist.splice(0, hist.length - MAX_HISTORY_PER_JOB);
      }
      // Write-through to storage
      storage.set(
        CRON_HISTORY_PREFIX + execution.jobId,
        serialiseHistory(hist),
      );
    },
  };
}
