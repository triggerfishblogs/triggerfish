/**
 * Scheduler trigger execution — loads TRIGGER.md and runs it
 * in an isolated orchestrator session.
 *
 * Before each run, prior trigger results are loaded from memory via
 * `memory_search` and injected into the prompt so the agent avoids
 * repeating the same findings. After each run, the result is persisted
 * via `memory_save` for future runs.
 *
 * @module
 */

import type { ToolExecutor } from "../core/types/tool.ts";
import type { SchedulerServiceConfig } from "./service_types.ts";
import { createLogger } from "../core/logger/mod.ts";
import { deliverSchedulerOutput } from "./service_output.ts";
import { logSchedulerTokenUsage } from "./service_cron.ts";

const log = createLogger("scheduler");

/** Memory key used to persist trigger run history. */
const TRIGGER_HISTORY_MEMORY_KEY = "trigger:run-history";

/** Maximum number of prior results to keep in memory. */
const MAX_HISTORY_ENTRIES = 2;

/** Load TRIGGER.md content, returning null if not found. */
async function loadTriggerMd(path: string): Promise<string | null> {
  try {
    return await Deno.readTextFile(path);
  } catch {
    return null;
  }
}

/** Load prior trigger results from memory via the tool executor. */
async function loadTriggerHistory(
  toolExecutor: ToolExecutor,
): Promise<string | null> {
  try {
    const raw = await toolExecutor("memory_get", {
      key: TRIGGER_HISTORY_MEMORY_KEY,
    });
    const parsed: { found: boolean; content?: string } = JSON.parse(raw);
    if (!parsed.found || !parsed.content || parsed.content.trim().length === 0) {
      return null;
    }
    return parsed.content;
  } catch (err) {
    log.debug("No prior trigger history found in memory", {
      operation: "loadTriggerHistory",
      err,
    });
    return null;
  }
}

/** Build a history block to inject into the trigger prompt. */
function buildHistoryContext(historyContent: string): string {
  return `## Prior Trigger Results

The following are your most recent trigger run results. Do NOT repeat findings that are already listed here. Only report NEW or CHANGED information.

${historyContent}

---
`;
}

/** Persist the trigger result to memory, rolling off old entries. */
async function persistTriggerHistory(
  toolExecutor: ToolExecutor,
  resultText: string,
  existingHistory: string | null,
): Promise<void> {
  const timestamp = new Date().toISOString();
  const newEntry = `### Run at ${timestamp}\n${resultText}`;

  let entries: string[];
  if (existingHistory) {
    entries = existingHistory
      .split(/^### Run at /m)
      .filter((e) => e.trim().length > 0)
      .map((e) => `### Run at ${e}`);
  } else {
    entries = [];
  }

  entries.push(newEntry);
  if (entries.length > MAX_HISTORY_ENTRIES) {
    entries = entries.slice(entries.length - MAX_HISTORY_ENTRIES);
  }

  const content = entries.join("\n\n");
  try {
    await toolExecutor("memory_save", {
      key: TRIGGER_HISTORY_MEMORY_KEY,
      content,
      tags: ["trigger", "history"],
    });
    log.info("Trigger history persisted to memory", {
      operation: "persistTriggerHistory",
      entryCount: entries.length,
    });
  } catch (err) {
    log.error("Trigger history memory_save failed", {
      operation: "persistTriggerHistory",
      err,
    });
  }
}

/** Execute the trigger orchestrator with the given TRIGGER.md content. */
async function executeTriggerSession(
  config: SchedulerServiceConfig,
  triggerMdContent: string,
): Promise<void> {
  log.info("Creating trigger orchestrator session");
  const { orchestrator, session, toolExecutor } =
    await config.orchestratorFactory.create(
      "trigger",
      { isTrigger: true, ceiling: config.trigger.classificationCeiling },
    );

  const existingHistory = await loadTriggerHistory(toolExecutor);
  log.info("Trigger history loaded from memory", {
    operation: "executeTriggerSession",
    hasHistory: existingHistory !== null,
  });

  const historyContext = existingHistory
    ? buildHistoryContext(existingHistory)
    : "";
  const message = historyContext + triggerMdContent;

  log.info("Trigger orchestrator processing TRIGGER.md");
  const result = await orchestrator.executeAgentTurn({
    session,
    message,
    targetClassification: config.trigger.classificationCeiling,
  });
  log.info(`Trigger completed (ok: ${result.ok}, taint: ${session.taint})`);
  logSchedulerTokenUsage("trigger", result);

  const resultText = result.ok ? result.value.response : result.error;
  if (resultText && resultText.trim().length > 0) {
    await persistTriggerHistory(toolExecutor, resultText, existingHistory);
  }

  await deliverSchedulerOutput({
    config,
    result,
    sessionTaint: session.taint,
    source: "trigger",
  });
}

/**
 * Run the trigger callback: load TRIGGER.md and send it to an
 * isolated orchestrator session.
 *
 * When TRIGGER.md is absent, the trigger is skipped entirely — there are
 * no instructions for the agent to follow, so running it would just cause
 * the LLM to hallucinate tasks.
 *
 * Safe to call directly for forced trigger runs.
 */
export async function runTriggerCallback(
  config: SchedulerServiceConfig,
): Promise<void> {
  const triggerContent = await loadTriggerMd(config.triggerMdPath);
  if (!triggerContent) {
    log.debug("Trigger skipped — no TRIGGER.md found", {
      operation: "runTriggerCallback",
      path: config.triggerMdPath,
    });
    return;
  }
  try {
    await executeTriggerSession(config, triggerContent);
  } catch (err) {
    log.error("Trigger callback failed", {
      operation: "runTriggerCallback",
      err,
    });
  }
}
