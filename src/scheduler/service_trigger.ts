/**
 * Scheduler trigger execution — loads TRIGGER.md and runs it
 * in an isolated orchestrator session.
 *
 * @module
 */

import type { SchedulerServiceConfig } from "./service_types.ts";
import { createLogger } from "../core/logger/mod.ts";
import { deliverSchedulerOutput } from "./service_output.ts";
import { logSchedulerTokenUsage } from "./service_cron.ts";

const log = createLogger("scheduler");

/** Load TRIGGER.md content, returning null if not found. */
async function loadTriggerMd(path: string): Promise<string | null> {
  try {
    return await Deno.readTextFile(path);
  } catch {
    return null;
  }
}

/** Execute the trigger orchestrator with the given TRIGGER.md content. */
async function executeTriggerSession(
  config: SchedulerServiceConfig,
  message: string,
): Promise<void> {
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
  logSchedulerTokenUsage("trigger", result);
  await deliverSchedulerOutput({
    config,
    result,
    sessionTaint: session.taint,
    source: "trigger",
  });
}

/** Default message when TRIGGER.md is absent. */
const DEFAULT_TRIGGER_MESSAGE =
  "This is a scheduled trigger wakeup. Check for any pending tasks, " +
  "notifications, or proactive actions you should take.";

/**
 * Run the trigger callback: load TRIGGER.md and send it to an
 * isolated orchestrator session.
 *
 * When TRIGGER.md is absent, a default trigger message is used so that
 * the agent still performs its proactive check-in.
 *
 * Safe to call directly for forced trigger runs.
 */
export async function runTriggerCallback(
  config: SchedulerServiceConfig,
): Promise<void> {
  const triggerContent = await loadTriggerMd(config.triggerMdPath);
  const message = triggerContent ?? DEFAULT_TRIGGER_MESSAGE;
  if (!triggerContent) {
    log.debug("No TRIGGER.md found — using default trigger message");
  }
  try {
    await executeTriggerSession(config, message);
  } catch (err) {
    log.error(
      `Trigger callback failed: ${
        err instanceof Error ? err.message : String(err)
      }`,
    );
  }
}
