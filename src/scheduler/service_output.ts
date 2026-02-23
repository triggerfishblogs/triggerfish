/**
 * Scheduler output delivery — persists trigger results and delivers
 * notifications to the owner.
 *
 * @module
 */

import type {
  ClassificationLevel,
  Result,
} from "../core/types/classification.ts";
import type { SchedulerServiceConfig } from "./service_types.ts";
import { createLogger } from "../core/logger/mod.ts";

const log = createLogger("scheduler");

/** Options for delivering scheduler output. */
interface DeliverOutputOptions {
  readonly config: SchedulerServiceConfig;
  readonly result: Result<{ readonly response: string }, string>;
  readonly sessionTaint: ClassificationLevel;
  readonly source: string;
}

/** Options for persisting or notifying about a scheduler result. */
interface SourcedOutputOptions {
  readonly config: SchedulerServiceConfig;
  readonly source: string;
  readonly text: string;
  readonly classification: ClassificationLevel;
}

/** Persist a scheduler result to the trigger store. */
async function persistTriggerResult(options: SourcedOutputOptions): Promise<void> {
  const { config, source, text, classification } = options;
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
    const msg = err instanceof Error ? err.message : String(err);
    log.error(`[${source}] Trigger store persist failed: ${msg}`);
  }
}

/** Deliver a notification to the owner via NotificationService. */
async function deliverSchedulerNotification(options: SourcedOutputOptions): Promise<void> {
  const { config, source, text, classification } = options;
  if (!config.notificationService || !config.ownerId) {
    log.warn(`[${source}] No notification service or ownerId — output not delivered`);
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
    const msg = err instanceof Error ? err.message : String(err);
    log.error(`[${source}] Notification delivery failed: ${msg}`);
  }
}

/**
 * Deliver orchestrator output as a notification and persist to
 * the trigger store.
 *
 * If the LLM returned NO_ACTION, the result is persisted but no
 * notification is sent.
 */
export async function deliverSchedulerOutput(options: DeliverOutputOptions): Promise<void> {
  const { config, result, sessionTaint, source } = options;
  const text = result.ok ? result.value.response : result.error;
  if (!text || text.trim().length === 0) {
    log.debug(`[${source}] No output to deliver (empty response)`);
    return;
  }
  const outputOpts: SourcedOutputOptions = { config, source, text, classification: sessionTaint };
  if (text.trim() === "NO_ACTION") {
    log.debug(`[${source}] LLM returned NO_ACTION — nothing to report`);
    await persistTriggerResult(outputOpts);
    return;
  }
  await persistTriggerResult(outputOpts);
  await deliverSchedulerNotification(outputOpts);
}
