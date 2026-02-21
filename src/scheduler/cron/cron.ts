/**
 * Cron job manager — in-memory and persistent implementations.
 *
 * Provides two manager factories:
 * - `createCronManager()` — in-memory only, no persistence
 * - `createPersistentCronManager()` — backed by StorageProvider
 *
 * Types, parser, and matcher live in `cron_parser.ts`.
 *
 * @module
 */

import type { Result } from "../../core/types/classification.ts";
import type { StorageProvider } from "../../core/storage/provider.ts";

import type {
  CronJob,
  CronJobExecution,
  CronJobOptions,
  CronManager,
} from "./parser.ts";
import { parseCronExpression } from "./parser.ts";

// ─── Barrel re-exports from cron_parser.ts ──────────────────────────────────

export {
  parseCronExpression,
  matchesNow,
} from "./parser.ts";
export type {
  CronExpression,
  CronJob,
  CronJobExecution,
  CronJobOptions,
  CronManager,
} from "./parser.ts";

// ─── Serialization helpers ──────────────────────────────────────────────────

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

// ─── In-memory manager ──────────────────────────────────────────────────────

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

// ─── Persistent manager ─────────────────────────────────────────────────────

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
