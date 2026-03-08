/**
 * Agent turn — entry point and preconditions.
 *
 * Validates preconditions, prepares context (system prompt, history,
 * vision fallback), and delegates to the agent loop. Persists user
 * messages and restores session history from MessageStore on resume.
 *
 * @module
 */

import type { Result } from "../../core/types/classification.ts";
import { canFlowTo } from "../../core/types/classification.ts";
import { createLogger } from "../../core/logger/mod.ts";
import type { SessionState } from "../../core/types/session.ts";
import type { MessageContent } from "../../core/image/content.ts";
import { extractText } from "../../core/image/content.ts";
import { countTokens } from "../compactor/compactor_tokens.ts";
import { buildFullSystemPrompt } from "../orchestrator/system_prompt.ts";
import { processVisionFallback } from "../orchestrator/vision_fallback.ts";
import { runAgentLoop } from "./agent_loop.ts";
import type {
  HistoryEntry,
  OrchestratorConfig,
  ProcessMessageOptions,
  ProcessMessageResult,
} from "../orchestrator/orchestrator_types.ts";
import type { OrchestratorState } from "../orchestrator/orchestrator.ts";
import type { ConversationRecord } from "../../core/conversation/mod.ts";

const log = createLogger("agent-turn");

/** Fire PRE_CONTEXT_INJECTION hook. */
async function firePreContextHook(
  config: OrchestratorConfig,
  session: SessionState,
  message: MessageContent,
): Promise<Result<void, string>> {
  const result = await config.hookRunner.evaluateHook(
    "PRE_CONTEXT_INJECTION",
    {
      session,
      input: { content: extractText(message), source_type: "OWNER" },
    },
  );
  if (!result.allowed) {
    return { ok: false, error: result.message ?? "Input blocked by policy" };
  }
  return { ok: true, value: undefined };
}

/** Get or create conversation history for a session. */
function ensureSessionHistory(
  histories: Map<string, HistoryEntry[]>,
  sessionKey: string,
): HistoryEntry[] {
  if (!histories.has(sessionKey)) {
    histories.set(sessionKey, []);
  }
  return histories.get(sessionKey)!;
}

/**
 * Update the compactor budget to match the provider selected for the
 * current session's taint level. This ensures auto-compaction thresholds
 * are based on the actual model's context window, not a global minimum.
 */
function alignCompactorBudgetToSession(state: OrchestratorState): void {
  const taint = state.config.getSessionTaint?.() ?? "PUBLIC";
  const override = state.config.providerRegistry.getForClassification(taint);
  const provider = override ?? state.config.providerRegistry.getDefault();
  log.debug("Compactor budget alignment for session taint", {
    operation: "alignCompactorBudgetToSession",
    taint,
    overrideFound: override !== undefined,
    providerName: provider?.name,
    contextWindow: provider?.contextWindow,
  });
  if (provider?.contextWindow) {
    state.compactor.updateBudget(provider.contextWindow);
  }
}

/** Auto-compact history if approaching context limits. */
function autoCompactHistory(
  history: HistoryEntry[],
  compactor: {
    compact(h: HistoryEntry[], t?: number): readonly HistoryEntry[];
  },
  systemPromptTokens: number,
): void {
  const compacted = compactor.compact(history, systemPromptTokens);
  if (compacted.length < history.length) {
    history.length = 0;
    history.push(...compacted);
  }
}

/** Convert a ConversationRecord to a HistoryEntry for session restoration. */
function recordToHistoryEntry(record: ConversationRecord): HistoryEntry[] {
  switch (record.role) {
    case "user":
      return [{ role: "user", content: record.content }];
    case "assistant":
      return [{ role: "assistant", content: record.content }];
    case "compaction_summary":
      return [{
        role: "user",
        content: "[CONTEXT SUMMARY]\n" + record.content,
      }];
    case "tool_call":
      return [
        {
          role: "assistant",
          content: record.tool_args
            ? JSON.stringify(record.tool_args)
            : "{}",
        },
        {
          role: "user",
          content: `[TOOL_RESULT name="${record.tool_name ?? "unknown"}"]\n` +
            `(result not available — see lineage ${record.lineage_id ?? "unknown"})\n` +
            `[/TOOL_RESULT]`,
        },
      ];
  }
}

/** Restore session history from MessageStore if history is empty. */
async function restoreSessionHistoryIfEmpty(
  config: OrchestratorConfig,
  session: SessionState,
  history: HistoryEntry[],
): Promise<void> {
  if (history.length > 0 || !config.messageStore) return;

  const records = await config.messageStore.loadActive(
    session.id as string,
  );

  if (records.length === 0) return;

  // Check for a compaction summary — if present, prefer it over raw turns
  const summaryRecord = records.find(
    (r) => r.role === "compaction_summary",
  );
  if (summaryRecord) {
    const entries = recordToHistoryEntry(summaryRecord);
    history.push(...entries);
    log.info("Session history restored from compaction summary", {
      operation: "restoreSessionHistoryIfEmpty",
      sessionId: session.id,
      recordCount: 1,
    });
    return;
  }

  // Restore from raw turns with taint gating
  let restoredCount = 0;
  for (const record of records) {
    if (!canFlowTo(record.classification, session.taint)) {
      log.warn("Skipping record above session taint on restore", {
        operation: "restoreSessionHistoryIfEmpty",
        sessionId: session.id,
        recordClassification: record.classification,
        sessionTaint: session.taint,
        sequence: record.sequence,
      });
      continue;
    }
    const entries = recordToHistoryEntry(record);
    history.push(...entries);
    restoredCount++;
  }

  if (restoredCount > 0) {
    log.info("Session history restored from persisted records", {
      operation: "restoreSessionHistoryIfEmpty",
      sessionId: session.id,
      recordCount: restoredCount,
    });
  }
}

/** Persist a user message to the MessageStore and create lineage record. */
async function persistUserMessage(
  config: OrchestratorConfig,
  session: SessionState,
  messageText: string,
): Promise<void> {
  if (!config.messageStore) return;

  let lineageId: string | undefined;
  if (config.lineageStore) {
    try {
      const lineageRecord = await config.lineageStore.create({
        content: messageText,
        origin: {
          source_type: "channel_message",
          source_name: session.channelId as string,
          accessed_at: new Date().toISOString(),
          accessed_by: session.userId as string,
          access_method: "user_input",
        },
        classification: {
          level: session.taint,
          reason: "User message",
        },
        sessionId: session.id,
      });
      lineageId = lineageRecord.lineage_id;
    } catch (err: unknown) {
      log.error("User message lineage creation failed", {
        operation: "persistUserMessage",
        sessionId: session.id,
        err,
      });
    }
  }

  try {
    await config.messageStore.append({
      session_id: session.id as string,
      role: "user",
      content: messageText,
      classification: session.taint,
      lineage_id: lineageId,
    });
  } catch (err: unknown) {
    log.error("User message persistence failed", {
      operation: "persistUserMessage",
      sessionId: session.id,
      err,
    });
  }
}

/** Prepare system prompt, history, and vision fallback for the turn. */
async function prepareAgentTurnContext(
  state: OrchestratorState,
  sessionKey: string,
  message: MessageContent,
  session: SessionState,
  signal: AbortSignal | undefined,
): Promise<{ systemPrompt: string; history: HistoryEntry[] }> {
  let systemPrompt = await buildFullSystemPrompt(state, sessionKey);
  const history = ensureSessionHistory(state.histories, sessionKey);

  // Restore persisted history on session resume (before user push)
  await restoreSessionHistoryIfEmpty(state.config, session, history);

  history.push({ role: "user", content: message });

  // Persist user message to MessageStore
  const messageText = extractText(message);
  await persistUserMessage(state.config, session, messageText);

  const visionAddendum = await processVisionFallback(
    state,
    message,
    history,
    signal,
  );
  if (visionAddendum) systemPrompt += visionAddendum;

  alignCompactorBudgetToSession(state);
  autoCompactHistory(history, state.compactor, countTokens(systemPrompt));
  return { systemPrompt, history };
}

/** Validate pre-conditions for an agent turn: run pre-context hook and verify provider. */
async function validateAgentTurnPreconditions(
  config: OrchestratorConfig,
  session: SessionState,
  message: MessageContent,
): Promise<Result<true, string>> {
  const hookResult = await firePreContextHook(config, session, message);
  if (!hookResult.ok) return hookResult;
  if (!config.providerRegistry.getDefault()) {
    return { ok: false, error: "No default LLM provider configured" };
  }
  return { ok: true, value: true };
}

/** Run the full agent turn loop. */
export async function runAgentTurn(
  state: OrchestratorState,
  options: ProcessMessageOptions,
): Promise<Result<ProcessMessageResult, string>> {
  const { session, message, targetClassification, signal } = options;
  const guard = await validateAgentTurnPreconditions(
    state.config,
    session,
    message,
  );
  if (!guard.ok) return guard;

  const sessionKey = session.id as string;
  const ctx = await prepareAgentTurnContext(
    state,
    sessionKey,
    message,
    session,
    signal,
  );
  return runAgentLoop({
    state,
    session,
    systemPrompt: ctx.systemPrompt,
    history: ctx.history,
    sessionKey,
    targetClassification,
    signal,
  });
}
