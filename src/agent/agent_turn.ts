/**
 * Agent turn — entry point and preconditions.
 *
 * Validates preconditions, prepares context (system prompt, history,
 * vision fallback), and delegates to the agent loop.
 *
 * @module
 */

import type { Result } from "../core/types/classification.ts";
import type { SessionState } from "../core/types/session.ts";
import type { MessageContent } from "../core/image/content.ts";
import { extractText } from "../core/image/content.ts";
import { countTokens } from "./compactor.ts";
import { buildFullSystemPrompt } from "./system_prompt.ts";
import { processVisionFallback } from "./vision_fallback.ts";
import { runAgentLoop } from "./agent_loop.ts";
import type {
  HistoryEntry,
  OrchestratorConfig,
  ProcessMessageOptions,
  ProcessMessageResult,
} from "./orchestrator_types.ts";
import type { OrchestratorState } from "./orchestrator.ts";

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

/** Auto-compact history if approaching context limits. */
function autoCompactHistory(
  history: HistoryEntry[],
  compactor: { compact(h: HistoryEntry[], t?: number): readonly HistoryEntry[] },
  systemPromptTokens: number,
): void {
  const compacted = compactor.compact(history, systemPromptTokens);
  if (compacted.length < history.length) {
    history.length = 0;
    history.push(...compacted);
  }
}

/** Prepare system prompt, history, and vision fallback for the turn. */
async function prepareAgentTurnContext(
  state: OrchestratorState,
  sessionKey: string,
  message: MessageContent,
  signal: AbortSignal | undefined,
): Promise<{ systemPrompt: string; history: HistoryEntry[] }> {
  let systemPrompt = await buildFullSystemPrompt(state, sessionKey);
  const history = ensureSessionHistory(state.histories, sessionKey);
  history.push({ role: "user", content: message });

  const visionAddendum = await processVisionFallback(
    state,
    message,
    history,
    signal,
  );
  if (visionAddendum) systemPrompt += visionAddendum;

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
  const ctx = await prepareAgentTurnContext(state, sessionKey, message, signal);
  return runAgentLoop(
    state,
    session,
    ctx.systemPrompt,
    ctx.history,
    sessionKey,
    targetClassification,
    signal,
  );
}
