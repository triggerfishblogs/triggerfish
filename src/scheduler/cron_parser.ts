/**
 * Cron expression parser and matcher.
 *
 * Provides a standard 5-field cron expression parser (minute, hour,
 * day-of-month, month, day-of-week) with support for wildcards,
 * steps, ranges, and lists.
 *
 * Types for CronJob, CronManager, and related interfaces are also
 * defined here; the manager implementations live in `cron.ts`.
 *
 * @module
 */

import type {
  ClassificationLevel,
  Result,
} from "../core/types/classification.ts";

// ─── Types ───────────────────────────────────────────────────────────────────

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

// ─── Parser ──────────────────────────────────────────────────────────────────

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
