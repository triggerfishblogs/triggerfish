/**
 * Scheduler service — ties together cron jobs, triggers, and webhooks.
 *
 * Runs a cron tick loop (every 60s), a periodic trigger that reads
 * TRIGGER.md, and handles inbound webhook HTTP requests. Each scheduled
 * execution spawns an isolated orchestrator session via the injected
 * OrchestratorFactory.
 *
 * Types and interfaces live in `service_types.ts`.
 *
 * @module
 */

import type {
  ClassificationLevel,
  Result,
} from "../core/types/classification.ts";
import {
  createCronManager,
  matchesNow,
  parseCronExpression,
} from "./cron/cron.ts";
import type { CronJob } from "./cron/parser.ts";
import { createTrigger } from "./triggers/trigger.ts";
import type { Trigger } from "./triggers/trigger.ts";
import { createWebhookHandler, verifyHmacAsync } from "./webhooks/webhooks.ts";
import type { WebhookEvent } from "./webhooks/webhooks.ts";
import { createLogger } from "../core/logger/mod.ts";
import type {
  SchedulerService,
  SchedulerServiceConfig,
} from "./service_types.ts";

// ─── Barrel re-exports from service_types.ts ─────────────────────────────────

export type {
  OrchestratorCreateOptions,
  OrchestratorFactory,
  SchedulerService,
  SchedulerServiceConfig,
  WebhookSourceConfig,
} from "./service_types.ts";

// ─── Service implementation ──────────────────────────────────────────────────

const log = createLogger("scheduler");

/** Persist a scheduler result to the trigger store. */
async function persistTriggerResult(
  config: SchedulerServiceConfig,
  source: string,
  text: string,
  classification: ClassificationLevel,
): Promise<void> {
  if (!config.triggerStore) return;
  try {
    await config.triggerStore.save({
      id: crypto.randomUUID(),
      source,
      message: text,
      classification,
      firedAt: new Date().toISOString(),
    });
    log.info(`[${source}] Result persisted to trigger store`);
  } catch (err) {
    log.error(
      `[${source}] Failed to persist to trigger store: ${
        err instanceof Error ? err.message : String(err)
      }`,
    );
  }
}

/** Deliver a notification to the owner via NotificationService. */
async function deliverSchedulerNotification(
  config: SchedulerServiceConfig,
  source: string,
  text: string,
  classification: ClassificationLevel,
): Promise<void> {
  if (!config.notificationService || !config.ownerId) {
    log.warn(
      `[${source}] No notification service or ownerId — output not delivered`,
    );
    return;
  }
  try {
    await config.notificationService.deliver({
      userId: config.ownerId,
      message: `[${source}] ${text}`,
      priority: "normal",
      classification,
    });
    log.info(`[${source}] Notification delivered`);
  } catch (err) {
    log.error(
      `[${source}] Notification delivery failed: ${
        err instanceof Error ? err.message : String(err)
      }`,
    );
  }
}

/** Validate a webhook request: check enabled, source, HMAC, and parse JSON. */
async function validateAndParseWebhookRequest(
  config: SchedulerServiceConfig,
  sourceId: string,
  body: string,
  signature: string,
): Promise<
  Result<{ event: WebhookEvent; classification: ClassificationLevel }, string>
> {
  if (!config.webhooks.enabled) {
    return { ok: false, error: "Webhooks are disabled" };
  }
  const source = config.webhooks.sources[sourceId];
  if (!source) {
    return { ok: false, error: `Unknown webhook source: ${sourceId}` };
  }
  const valid = await verifyHmacAsync(body, signature, source.secret);
  if (!valid) {
    return { ok: false, error: "Invalid HMAC signature" };
  }
  try {
    const parsed = JSON.parse(body);
    return {
      ok: true,
      value: {
        event: {
          event: parsed.event ?? "unknown",
          data: parsed.data ?? parsed,
        },
        classification: source.classification,
      },
    };
  } catch {
    return { ok: false, error: "Invalid JSON body" };
  }
}

/**
 * Create a scheduler service that manages cron jobs, triggers, and webhooks.
 *
 * The service uses the OrchestratorFactory to spawn isolated sessions
 * for each scheduled execution. Cron jobs are checked every 60 seconds.
 * The trigger reads TRIGGER.md and fires at the configured interval.
 *
 * @param config - Scheduler configuration
 * @returns A SchedulerService instance
 */
export function createSchedulerService(
  config: SchedulerServiceConfig,
): SchedulerService {
  const cronManager = config.cronManager ?? createCronManager();
  const webhookHandler = createWebhookHandler();
  let cronTickId: number | undefined;
  let trigger: Trigger | undefined;

  /** Deliver orchestrator output as a notification and persist to trigger store. */
  async function deliverOutput(
    result: Result<{ readonly response: string }, string>,
    sessionTaint: ClassificationLevel,
    source: string,
  ): Promise<void> {
    const text = result.ok ? result.value.response : result.error;
    if (!text || text.trim().length === 0) {
      log.debug(`[${source}] No output to deliver (empty response)`);
      return;
    }
    // NO_ACTION: persist but do NOT notify
    if (text.trim() === "NO_ACTION") {
      log.debug(`[${source}] LLM returned NO_ACTION — nothing to report`);
      await persistTriggerResult(config, source, text, sessionTaint);
      return;
    }
    await persistTriggerResult(config, source, text, sessionTaint);
    await deliverSchedulerNotification(config, source, text, sessionTaint);
  }

  /** Load TRIGGER.md content, returning null if not found. */
  async function loadTriggerMd(): Promise<string | null> {
    try {
      return await Deno.readTextFile(config.triggerMdPath);
    } catch {
      return null;
    }
  }

  /** Log token usage from an orchestrator result. */
  function logTokenUsage(
    source: string,
    result: Result<
      {
        readonly response: string;
        readonly tokenUsage: {
          readonly inputTokens: number;
          readonly outputTokens: number;
        };
      },
      string
    >,
  ): void {
    if (!result.ok) return;
    const { inputTokens, outputTokens } = result.value.tokenUsage;
    log.info(
      `[${source}] Token usage — input: ${inputTokens}, output: ${outputTokens}, total: ${
        inputTokens + outputTokens
      }`,
    );
  }

  /** Record a cron execution result in the cron manager. */
  function recordCronExecution(
    jobId: string,
    startTime: number,
    result: Result<{ readonly response: string }, string>,
  ): void {
    cronManager.recordExecution({
      jobId,
      executedAt: new Date(),
      durationMs: performance.now() - startTime,
      success: result.ok,
      error: result.ok ? undefined : result.error,
    });
  }

  /** Record a failed cron execution from an unhandled error. */
  function recordCronFailure(
    jobId: string,
    startTime: number,
    err: unknown,
  ): void {
    cronManager.recordExecution({
      jobId,
      executedAt: new Date(),
      durationMs: performance.now() - startTime,
      success: false,
      error: err instanceof Error ? err.message : String(err),
    });
  }

  /** Execute a cron job in an isolated session. */
  async function executeCronJob(job: CronJob): Promise<void> {
    log.info(`Executing cron job: ${job.id}`);
    const startTime = performance.now();
    try {
      const { orchestrator, session } = await config.orchestratorFactory.create(
        "cron",
      );
      const result = await orchestrator.executeAgentTurn({
        session,
        message: job.task,
        targetClassification: job.classificationCeiling,
      });
      logTokenUsage(`cron:${job.id}`, result);
      await deliverOutput(result, session.taint, `cron:${job.id}`);
      recordCronExecution(job.id, startTime, result);
    } catch (err) {
      recordCronFailure(job.id, startTime, err);
    }
  }

  /** Check all cron jobs against the current time. */
  function cronTick(): void {
    const now = new Date();
    for (const job of cronManager.list()) {
      if (!job.enabled) continue;
      const parseResult = parseCronExpression(job.expression);
      if (!parseResult.ok) continue;
      if (matchesNow(parseResult.value, now)) {
        // Fire-and-forget — errors captured in executeCronJob
        executeCronJob(job);
      }
    }
  }

  /** Execute the trigger orchestrator with the given TRIGGER.md content. */
  async function executeTriggerSession(message: string): Promise<void> {
    log.info("Creating trigger orchestrator session");
    const { orchestrator, session } = await config.orchestratorFactory.create(
      "trigger",
      { isTrigger: true, ceiling: config.trigger.classificationCeiling },
    );
    log.info("Trigger orchestrator processing TRIGGER.md");
    const result = await orchestrator.executeAgentTurn({
      session,
      message,
      targetClassification: config.trigger.classificationCeiling,
    });
    log.info(`Trigger completed (ok: ${result.ok}, taint: ${session.taint})`);
    logTokenUsage("trigger", result);
    await deliverOutput(result, session.taint, "trigger");
  }

  /** Execute a webhook event in an isolated orchestrator session. */
  async function executeWebhookSession(
    sourceId: string,
    body: string,
    event: WebhookEvent,
    classification: ClassificationLevel,
  ): Promise<void> {
    try {
      const { orchestrator, session } = await config.orchestratorFactory
        .create(`webhook-${sourceId}`);
      const message =
        `Webhook event from ${sourceId}: ${event.event}\n\nPayload:\n${body}`;
      const result = await orchestrator.executeAgentTurn({
        session,
        message,
        targetClassification: classification,
      });
      logTokenUsage(`webhook:${sourceId}`, result);
      await deliverOutput(result, session.taint, `webhook:${sourceId}`);
    } catch {
      // Webhook processing failures are logged but don't fail the HTTP response
    }
  }

  /** Trigger callback: load TRIGGER.md and send to orchestrator. */
  async function triggerCallback(): Promise<void> {
    const triggerContent = await loadTriggerMd();
    if (!triggerContent) {
      log.debug("No TRIGGER.md found — skipping trigger run");
      return;
    }
    try {
      await executeTriggerSession(triggerContent);
    } catch (err) {
      log.error(
        `Trigger callback failed: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  }

  return {
    cronManager,
    webhookHandler,

    start(): void {
      // Start cron tick loop (immediate tick + every 60s)
      if (cronTickId === undefined) {
        cronTick();
        cronTickId = setInterval(cronTick, 60_000);
      }

      // Start trigger if enabled
      if (config.trigger.enabled && trigger === undefined) {
        trigger = createTrigger({
          intervalMs: config.trigger.intervalMinutes * 60 * 1000,
          callback: triggerCallback,
          classificationCeiling: config.trigger.classificationCeiling,
          quietHours: config.trigger.quietHours,
        });
        trigger.start();
      }
    },

    stop(): void {
      if (cronTickId !== undefined) {
        clearInterval(cronTickId);
        cronTickId = undefined;
      }
      if (trigger !== undefined) {
        trigger.stop();
        trigger = undefined;
      }
    },

    async runTrigger(): Promise<void> {
      log.info("Forced trigger run requested");
      await triggerCallback();
    },

    async handleWebhookRequest(
      sourceId: string,
      body: string,
      signature: string,
    ): Promise<Result<void, string>> {
      const validation = await validateAndParseWebhookRequest(
        config,
        sourceId,
        body,
        signature,
      );
      if (!validation.ok) return validation;
      const { event, classification } = validation.value;

      await executeWebhookSession(sourceId, body, event, classification);
      await webhookHandler.handleWebhookEvent(event);
      return { ok: true, value: undefined };
    },
  };
}
