/**
 * Scheduler service — ties together cron jobs, triggers, and webhooks.
 *
 * Runs a cron tick loop (every 60s), a periodic trigger that reads
 * TRIGGER.md, and handles inbound webhook HTTP requests. Each scheduled
 * execution spawns an isolated orchestrator session via the injected
 * OrchestratorFactory.
 *
 * @module
 */

import type { ClassificationLevel, Result } from "../core/types/classification.ts";
import type { SessionState, UserId } from "../core/types/session.ts";
import type { Orchestrator } from "../agent/orchestrator.ts";
import type { NotificationService } from "../gateway/notifications.ts";
import {
  createCronManager,
  matchesNow,
  parseCronExpression,
} from "./cron.ts";
import type { CronJob, CronManager } from "./cron.ts";
import { createTrigger } from "./trigger.ts";
import type { Trigger } from "./trigger.ts";
import { createWebhookHandler, verifyHmacAsync } from "./webhooks.ts";
import type { WebhookEvent, WebhookHandler } from "./webhooks.ts";
import type { TriggerStore } from "./trigger_store.ts";
import { createLogger } from "../core/logger/mod.ts";

const log = createLogger("scheduler");

/** Options passed to OrchestratorFactory.create() to configure the session type. */
export interface OrchestratorCreateOptions {
  /**
   * When true, the orchestrator is configured as a trigger session.
   * Trigger sessions may call all built-in tools and integration tools
   * classified at or below the ceiling. They are never owner sessions.
   */
  readonly isTrigger?: boolean;
  /**
   * Classification ceiling for this session.
   * Integration tools classified above this level are blocked.
   * Ignored unless isTrigger is true (owner sessions have no ceiling).
   */
  readonly ceiling?: ClassificationLevel;
}

/**
 * Factory that creates an isolated orchestrator + session per execution.
 *
 * The factory captures shared infrastructure (provider registry, policy
 * engine, hook runner, tools) and creates a fresh workspace, session,
 * and orchestrator for each call.
 */
export interface OrchestratorFactory {
  /** Create a new orchestrator and session for a scheduled task. */
  create(channelId: string, options?: OrchestratorCreateOptions): Promise<{
    readonly orchestrator: Orchestrator;
    readonly session: SessionState;
  }>;
}

/** Per-source webhook configuration. */
export interface WebhookSourceConfig {
  readonly secret: string;
  readonly classification: ClassificationLevel;
}

/** Configuration for the scheduler service. */
export interface SchedulerServiceConfig {
  /** Factory for creating orchestrators per execution. */
  readonly orchestratorFactory: OrchestratorFactory;
  /** Path to TRIGGER.md (typically ~/.triggerfish/TRIGGER.md). */
  readonly triggerMdPath: string;
  /** Trigger configuration. */
  readonly trigger: {
    readonly enabled: boolean;
    readonly intervalMinutes: number;
    readonly quietHours?: {
      readonly start: number;
      readonly end: number;
    };
    readonly classificationCeiling: ClassificationLevel;
  };
  /** Webhook configuration. */
  readonly webhooks: {
    readonly enabled: boolean;
    readonly sources: Readonly<Record<string, WebhookSourceConfig>>;
  };
  /** Optional pre-created CronManager (e.g. persistent). */
  readonly cronManager?: CronManager;
  /** Optional notification service for delivering scheduler output. */
  readonly notificationService?: NotificationService;
  /** Owner user ID for notification delivery. */
  readonly ownerId?: UserId;
  /** Optional store for persisting the last result of each trigger source. */
  readonly triggerStore?: TriggerStore;
}

/** The scheduler service interface. */
export interface SchedulerService {
  /** Start the cron tick loop and trigger. */
  start(): void;
  /** Stop all scheduled activities. */
  stop(): void;
  /** The cron job manager for creating/listing/deleting jobs. */
  readonly cronManager: CronManager;
  /** The webhook event router for registering handlers. */
  readonly webhookHandler: WebhookHandler;
  /** Handle an inbound webhook HTTP request. */
  handleWebhookRequest(
    sourceId: string,
    body: string,
    signature: string,
  ): Promise<Result<void, string>>;
  /**
   * Force an immediate trigger run, bypassing the interval timer.
   * Used for debugging via `triggerfish run-triggers`.
   */
  runTrigger(): Promise<void>;
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

    // The LLM responds with NO_ACTION when there is nothing worth reporting.
    // Persist to trigger store (for trigger_add_to_context) but do NOT notify.
    if (text.trim() === "NO_ACTION") {
      log.debug(`[${source}] LLM returned NO_ACTION — nothing to report`);
      if (config.triggerStore) {
        try {
          await config.triggerStore.save({
            id: crypto.randomUUID(),
            source,
            message: text,
            classification: sessionTaint,
            firedAt: new Date().toISOString(),
          });
        } catch { /* non-fatal */ }
      }
      return;
    }

    // Persist result to trigger store (if configured) regardless of notification delivery
    if (config.triggerStore) {
      try {
        await config.triggerStore.save({
          id: crypto.randomUUID(),
          source,
          message: text,
          classification: sessionTaint,
          firedAt: new Date().toISOString(),
        });
        log.info(`[${source}] Result persisted to trigger store`);
      } catch (err) {
        log.error(`[${source}] Failed to persist to trigger store: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    if (!config.notificationService || !config.ownerId) {
      log.warn(`[${source}] No notification service or ownerId — output not delivered`);
      return;
    }
    try {
      await config.notificationService.deliver({
        userId: config.ownerId,
        message: `[${source}] ${text}`,
        priority: "normal",
        classification: sessionTaint,
      });
      log.info(`[${source}] Notification delivered`);
    } catch (err) {
      log.error(`[${source}] Notification delivery failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  /** Load TRIGGER.md content, returning null if not found. */
  async function loadTriggerMd(): Promise<string | null> {
    try {
      return await Deno.readTextFile(config.triggerMdPath);
    } catch {
      return null;
    }
  }

  /** Execute a cron job in an isolated session. */
  async function executeCronJob(job: CronJob): Promise<void> {
    log.info(`Executing cron job: ${job.id}`);
    const startTime = performance.now();
    try {
      const { orchestrator, session } =
        await config.orchestratorFactory.create("cron");

      const result = await orchestrator.processMessage({
        session,
        message: job.task,
        targetClassification: job.classificationCeiling,
      });

      if (result.ok) {
        const { inputTokens, outputTokens } = result.value.tokenUsage;
        log.info(`[cron:${job.id}] Token usage — input: ${inputTokens}, output: ${outputTokens}, total: ${inputTokens + outputTokens}`);
      }
      await deliverOutput(result, session.taint, `cron:${job.id}`);

      cronManager.recordExecution({
        jobId: job.id,
        executedAt: new Date(),
        durationMs: performance.now() - startTime,
        success: result.ok,
        error: result.ok ? undefined : result.error,
      });
    } catch (err) {
      cronManager.recordExecution({
        jobId: job.id,
        executedAt: new Date(),
        durationMs: performance.now() - startTime,
        success: false,
        error: err instanceof Error ? err.message : String(err),
      });
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

  /** Trigger callback: load TRIGGER.md and send to orchestrator. */
  async function triggerCallback(): Promise<void> {
    const triggerContent = await loadTriggerMd();
    const message = triggerContent ??
      "You are waking up on a periodic trigger. " +
        "Check for anything worth reporting to the owner. " +
        "If there is nothing to report, simply respond with a brief status.";

    try {
      log.info("Creating trigger orchestrator session");
      const { orchestrator, session } =
        await config.orchestratorFactory.create("trigger", {
          isTrigger: true,
          ceiling: config.trigger.classificationCeiling,
        });

      log.info("Trigger orchestrator processing TRIGGER.md");
      const result = await orchestrator.processMessage({
        session,
        message,
        targetClassification: config.trigger.classificationCeiling,
      });

      log.info(`Trigger completed (ok: ${result.ok}, taint: ${session.taint})`);
      if (result.ok) {
        const { inputTokens, outputTokens } = result.value.tokenUsage;
        log.info(`[trigger] Token usage — input: ${inputTokens}, output: ${outputTokens}, total: ${inputTokens + outputTokens}`);
      }
      await deliverOutput(result, session.taint, "trigger");
    } catch (err) {
      log.error(`Trigger callback failed: ${err instanceof Error ? err.message : String(err)}`);
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
      if (!config.webhooks.enabled) {
        return { ok: false, error: "Webhooks are disabled" };
      }

      const source = config.webhooks.sources[sourceId];
      if (!source) {
        return { ok: false, error: `Unknown webhook source: ${sourceId}` };
      }

      // Verify HMAC signature
      const valid = await verifyHmacAsync(body, signature, source.secret);
      if (!valid) {
        return { ok: false, error: "Invalid HMAC signature" };
      }

      // Parse event from body
      let event: WebhookEvent;
      try {
        const parsed = JSON.parse(body);
        event = {
          event: parsed.event ?? "unknown",
          data: parsed.data ?? parsed,
        };
      } catch {
        return { ok: false, error: "Invalid JSON body" };
      }

      // Spawn isolated session and process
      try {
        const { orchestrator, session } =
          await config.orchestratorFactory.create(`webhook-${sourceId}`);

        const message =
          `Webhook event from ${sourceId}: ${event.event}\n\nPayload:\n${body}`;
        const result = await orchestrator.processMessage({
          session,
          message,
          targetClassification: source.classification,
        });

        if (result.ok) {
          const { inputTokens, outputTokens } = result.value.tokenUsage;
          log.info(`[webhook:${sourceId}] Token usage — input: ${inputTokens}, output: ${outputTokens}, total: ${inputTokens + outputTokens}`);
        }
        await deliverOutput(result, session.taint, `webhook:${sourceId}`);
      } catch {
        // Webhook processing failures are logged but don't fail the HTTP response
      }

      // Also dispatch through the event handler for registered listeners
      await webhookHandler.handle(event);

      return { ok: true, value: undefined };
    },
  };
}
