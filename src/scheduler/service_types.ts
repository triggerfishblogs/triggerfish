/**
 * Scheduler service types and interfaces.
 *
 * Defines OrchestratorFactory, SchedulerServiceConfig, SchedulerService,
 * and related option interfaces. Separated from the service implementation
 * in `service.ts` for lighter type-only imports.
 *
 * @module
 */

import type { ClassificationLevel, Result } from "../core/types/classification.ts";
import type { UserId } from "../core/types/session.ts";
import type { Orchestrator } from "../core/types/orchestrator.ts";
import type { SessionState } from "../core/types/session.ts";
import type { NotificationService } from "../core/types/notification.ts";
import type { CronManager } from "./cron.ts";
import type { WebhookHandler } from "./webhooks.ts";
import type { TriggerStore } from "./trigger_store.ts";

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
