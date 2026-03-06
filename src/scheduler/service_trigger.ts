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

/** Memory key for agent-managed trigger instructions (set via trigger_manage). */
const TRIGGER_INSTRUCTIONS_MEMORY_KEY = "trigger:instructions";

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
  } catch {
    return null;
  }
}

/**
 * Resolve trigger instructions: memory override first, then TRIGGER.md file.
 *
 * Memory instructions are set via the trigger_manage tool and take
 * precedence over the file. This allows the agent to update trigger
 * behavior without filesystem writes (which would be a write-down
 * from classified sessions into the trigger's PUBLIC context).
 */
async function resolveTriggerInstructions(
  config: SchedulerServiceConfig,
  toolExecutor: ToolExecutor,
): Promise<{ content: string; source: "memory" | "file" } | null> {
  const memoryContent = await loadMemoryInstructions(toolExecutor);
  if (memoryContent) {
    log.info("Trigger instructions loaded from memory override", {
      operation: "resolveTriggerInstructions",
      contentLength: memoryContent.length,
    });
    return { content: memoryContent, source: "memory" };
  }
  const fileContent = await loadTriggerMd(config.triggerMdPath);
  if (fileContent) {
    return { content: fileContent, source: "file" };
  }
  return null;
}

/**
 * Run the trigger callback: resolve instructions and send them to an
 * isolated orchestrator session.
 *
 * Instructions are resolved from memory first (agent-managed via
 * trigger_manage), falling back to the TRIGGER.md file. When neither
 * source has instructions, the trigger is skipped entirely.
 *
 * Safe to call directly for forced trigger runs.
 */
export async function runTriggerCallback(
  config: SchedulerServiceConfig,
): Promise<void> {
  // Create a temporary orchestrator to access memory for instruction lookup
  const { orchestrator, session, toolExecutor } =
    await config.orchestratorFactory.create(
      "trigger",
      { isTrigger: true, ceiling: config.trigger.classificationCeiling },
    );

  const resolved = await resolveTriggerInstructions(config, toolExecutor);
  if (!resolved) {
    log.debug("Trigger skipped — no instructions found", {
      operation: "runTriggerCallback",
      path: config.triggerMdPath,
    });
    return;
  }
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
