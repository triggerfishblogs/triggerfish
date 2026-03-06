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
import { TRIGGER_INSTRUCTIONS_MEMORY_KEY } from "../core/security/constants.ts";
import { deliverSchedulerOutput } from "./service_output.ts";
import { logSchedulerTokenUsage } from "./service_cron.ts";

const log = createLogger("scheduler");

/** Memory key used to persist trigger run history. */
const TRIGGER_HISTORY_MEMORY_KEY = "trigger:run-history";

/** Maximum character length for injected history (roughly ~375 tokens). */
const MAX_HISTORY_CHARS = 1500;

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
  const capped = truncateToCharBudget(historyContent, MAX_HISTORY_CHARS);
  return `## Prior Trigger Results

Do NOT repeat findings listed below. Only report NEW or CHANGED information.

${capped}

---
`;
}

/** Truncate text to a character budget, appending an ellipsis marker. */
function truncateToCharBudget(text: string, budget: number): string {
  if (text.length <= budget) return text;
  return text.slice(0, budget) + "\n… (truncated)";
}

/** Persist the latest trigger result to memory (1 entry, char-capped). */
async function persistTriggerHistory(
  toolExecutor: ToolExecutor,
  resultText: string,
): Promise<void> {
  const timestamp = new Date().toISOString();
  const content = truncateToCharBudget(
    `### Run at ${timestamp}\n${resultText}`,
    MAX_HISTORY_CHARS,
  );
  try {
    await toolExecutor("memory_save", {
      key: TRIGGER_HISTORY_MEMORY_KEY,
      content,
      tags: ["trigger", "history"],
    });
    log.info("Trigger history persisted to memory", {
      operation: "persistTriggerHistory",
      contentLength: content.length,
    });
  } catch (err) {
    log.error("Trigger history memory_save failed", {
      operation: "persistTriggerHistory",
      err,
    });
  }
}

/** Execute the trigger with a pre-created orchestrator, session, and tool executor. */
async function executeTriggerSessionWithOrchestrator(
  config: SchedulerServiceConfig,
  triggerContent: string,
  orchestrator: import("../core/types/orchestrator.ts").Orchestrator,
  session: import("../core/types/session.ts").SessionState,
  toolExecutor: ToolExecutor,
): Promise<void> {
  const existingHistory = await loadTriggerHistory(toolExecutor);
  log.info("Trigger history loaded from memory", {
    operation: "executeTriggerSession",
    hasHistory: existingHistory !== null,
  });

  const historyContext = existingHistory
    ? buildHistoryContext(existingHistory)
    : "";
  const message = historyContext + triggerContent;

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
    await persistTriggerHistory(toolExecutor, resultText);
  }

  await deliverSchedulerOutput({
    config,
    result,
    sessionTaint: session.taint,
    source: "trigger",
  });
}

/** Load trigger instructions from memory (agent-managed override). */
async function loadMemoryInstructions(
  toolExecutor: ToolExecutor,
): Promise<string | null> {
  try {
    const raw = await toolExecutor("memory_get", {
      key: TRIGGER_INSTRUCTIONS_MEMORY_KEY,
    });
    const parsed: { found: boolean; content?: string } = JSON.parse(raw);
    if (!parsed.found || !parsed.content || parsed.content.trim().length === 0) {
      return null;
    }
    return parsed.content;
  } catch (err) {
    log.debug("Memory instructions lookup failed", {
      operation: "loadMemoryInstructions",
      err,
    });
    return null;
  }
}

/**
 * Create the trigger orchestrator session.
 *
 * Extracted so callers can defer creation until instructions are confirmed.
 */
function createTriggerSession(config: SchedulerServiceConfig) {
  return config.orchestratorFactory.create(
    "trigger",
    { isTrigger: true, ceiling: config.trigger.classificationCeiling },
  );
}

/**
 * Run the trigger callback: resolve instructions and send them to an
 * isolated orchestrator session.
 *
 * The TRIGGER.md file is checked first (cheap I/O). If present, the
 * orchestrator is created and memory override is checked (takes
 * precedence). If no file exists, the orchestrator is still created
 * to check memory — but only on the first call after which the
 * absence is cached for the session lifetime.
 *
 * Safe to call directly for forced trigger runs.
 */
export async function runTriggerCallback(
  config: SchedulerServiceConfig,
): Promise<void> {
  const fileContent = await loadTriggerMd(config.triggerMdPath);

  if (!fileContent && !triggerMemoryEverSet) {
    log.debug("Trigger skipped — no TRIGGER.md and no prior memory override", {
      operation: "runTriggerCallback",
      path: config.triggerMdPath,
    });
    return;
  }

  const { orchestrator, session, toolExecutor } =
    await createTriggerSession(config);

  // Memory override takes precedence over file
  const memoryContent = await loadMemoryInstructions(toolExecutor);
  if (memoryContent) {
    triggerMemoryEverSet = true;
  }
  const resolved = memoryContent
    ? { content: memoryContent, source: "memory" as const }
    : fileContent
      ? { content: fileContent, source: "file" as const }
      : null;

  if (!resolved) {
    log.debug("Trigger skipped — no instructions found", {
      operation: "runTriggerCallback",
      path: config.triggerMdPath,
    });
    return;
  }

  log.info(`Trigger instructions loaded from ${resolved.source}`, {
    operation: "runTriggerCallback",
    contentLength: resolved.content.length,
  });

  try {
    await executeTriggerSessionWithOrchestrator(
      config,
      resolved.content,
      orchestrator,
      session,
      toolExecutor,
    );
  } catch (err) {
    log.error("Trigger callback failed", {
      operation: "runTriggerCallback",
      err,
    });
  }
}

/**
 * Tracks whether a memory override has ever been found.
 *
 * When no TRIGGER.md file exists and this flag is false, we skip
 * orchestrator creation entirely. Once memory instructions are found
 * (or set via trigger_manage), this flips to true and subsequent
 * calls always check memory.
 */
let triggerMemoryEverSet = false;
