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

export { matchesNow, parseCronExpression } from "./parser.ts";
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

// ─── Shared method implementations ──────────────────────────────────────────

/** Validate and build a new CronJob, adding it to the in-memory maps. */
function buildAndStoreCronJob(
  jobs: Map<string, CronJob>,
  history: Map<string, CronJobExecution[]>,
  options: CronJobOptions,
): Result<CronJob, string> {
  const parseResult = parseCronExpression(options.expression);
  if (!parseResult.ok) return { ok: false, error: parseResult.error };

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
  history.set(id, []);
  return { ok: true, value: job };
}

/** Delete a job from in-memory maps. */
function deleteCronJob(
  jobs: Map<string, CronJob>,
  jobId: string,
): Result<void, string> {
  if (!jobs.has(jobId)) return { ok: false, error: `Job not found: ${jobId}` };
  jobs.delete(jobId);
  return { ok: true, value: undefined };
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
  const history = new Map<string, CronJobExecution[]>();

  return {
    create: (options) => buildAndStoreCronJob(jobs, history, options),
    list: () => [...jobs.values()],
    delete: (jobId) => deleteCronJob(jobs, jobId),
    history: (jobId) => history.get(jobId) ?? [],
    recordExecution(execution) {
      const hist = history.get(execution.jobId);
      if (hist) hist.push(execution);
    },
  };
}

// ─── Persistent manager ─────────────────────────────────────────────────────

/** Load all stored cron jobs from a storage provider. */
async function loadStoredJobs(
  storage: StorageProvider,
): Promise<Map<string, CronJob>> {
  const jobs = new Map<string, CronJob>();
  const jobKeys = await storage.list(CRON_JOB_PREFIX);
  for (const key of jobKeys) {
    const raw = await storage.get(key);
    if (raw) {
      const job = deserialiseJob(raw);
      jobs.set(job.id, job);
    }
  }
  return jobs;
}

/** Load execution history for all known jobs from storage. */
async function loadStoredHistory(
  storage: StorageProvider,
  jobIds: Iterable<string>,
): Promise<Map<string, CronJobExecution[]>> {
  const history = new Map<string, CronJobExecution[]>();
  for (const jobId of jobIds) {
    const raw = await storage.get(CRON_HISTORY_PREFIX + jobId);
    history.set(jobId, raw ? deserialiseHistory(raw) : []);
  }
  return history;
}

/** Record an execution with write-through to storage and history trimming. */
function recordPersistentExecution(
  history: Map<string, CronJobExecution[]>,
  storage: StorageProvider,
  execution: CronJobExecution,
): void {
  let hist = history.get(execution.jobId);
  if (!hist) {
    hist = [];
    history.set(execution.jobId, hist);
  }
  hist.push(execution);
  if (hist.length > MAX_HISTORY_PER_JOB) {
    hist.splice(0, hist.length - MAX_HISTORY_PER_JOB);
  }
  storage.set(CRON_HISTORY_PREFIX + execution.jobId, serialiseHistory(hist));
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
  const jobs = await loadStoredJobs(storage);
  const history = await loadStoredHistory(storage, jobs.keys());

  return {
    create(options) {
      const result = buildAndStoreCronJob(jobs, history, options);
      if (result.ok) {
        storage.set(
          CRON_JOB_PREFIX + result.value.id,
          serialiseJob(result.value),
        );
        storage.set(CRON_HISTORY_PREFIX + result.value.id, "[]");
      }
      return result;
    },
    list: () => [...jobs.values()],
    delete(jobId) {
      const result = deleteCronJob(jobs, jobId);
      if (result.ok) {
        history.delete(jobId);
        storage.delete(CRON_JOB_PREFIX + jobId);
        storage.delete(CRON_HISTORY_PREFIX + jobId);
      }
      return result;
    },
    history: (jobId) => history.get(jobId) ?? [],
    recordExecution: (execution) =>
      recordPersistentExecution(history, storage, execution),
  };
}
