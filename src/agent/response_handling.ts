/**
 * Response quality classification, recovery nudges, and final response handling.
 *
 * Detects empty/junk responses, builds recovery nudge messages,
 * evaluates the PRE_OUTPUT hook, and assembles the final ProcessMessageResult.
 *
 * @module
 */

import type { ClassificationLevel, Result } from "../core/types/classification.ts";
import type { SessionState } from "../core/types/session.ts";
import type {
  HistoryEntry,
  OrchestratorConfig,
  ProcessMessageResult,
} from "./orchestrator_types.ts";
import { LEAKED_INTENT_PATTERN } from "./orchestrator_types.ts";
import type { OrchestratorState, TokenAccumulator } from "./orchestrator.ts";

// ─── Response quality ────────────────────────────────────────────────────────

/** Detect whether the final text is empty, bare JSON junk, or leaked intent. */
export function classifyResponseQuality(
  finalText: string,
  hasTools: boolean,
): { isEmptyOrJunk: boolean; isLeakedIntent: boolean } {
  const isEmptyOrJunk = finalText.length === 0 ||
    (finalText.length < 200 && finalText.startsWith("{") &&
      finalText.endsWith("}"));
  const isLeakedIntent = hasTools && finalText.length < 300 &&
    LEAKED_INTENT_PATTERN.test(finalText);
  return { isEmptyOrJunk, isLeakedIntent };
}

/** Build the nudge message for empty/junk or leaked-intent responses. */
export function buildRecoveryNudge(
  isLeakedIntent: boolean,
  nudgeCount: number,
): string {
  if (isLeakedIntent) {
    return "[SYSTEM] You described your intent but didn't use a tool. Use the tools provided to you directly instead of narrating what you plan to do.";
  }
  if (nudgeCount === 1) {
    return "[SYSTEM] Your response was empty. Please respond to the user's message with a helpful answer. If the user asked you to search or look something up, use the web_search tool.";
  }
  return "[SYSTEM] Your previous response was still empty. You MUST write a natural language response. Summarize what you know and answer the user directly.";
}

/** The fallback response when the model returns empty/junk after all nudges. */
export const FALLBACK_RESPONSE =
  "I'm sorry, I wasn't able to generate a response. The language model returned empty or malformed output. " +
  "This may be a temporary issue — please try again, or consider switching to a more capable model (e.g. google/gemini-2.0-flash-001).";

// ─── PRE_OUTPUT hook ─────────────────────────────────────────────────────────

/** Fire PRE_OUTPUT hook and return the result. */
export async function evaluatePreOutputHook(
  config: OrchestratorConfig,
  session: SessionState,
  responseText: string,
  targetClassification: ClassificationLevel,
): Promise<Result<void, string>> {
  const outputTaint = config.getSessionTaint?.() ?? session.taint;
  const outputSession = outputTaint !== session.taint
    ? { ...session, taint: outputTaint }
    : session;
  const isOwnerOutput = config.isOwnerSession !== undefined &&
    config.isOwnerSession();
  const effectiveTarget = isOwnerOutput ? outputTaint : targetClassification;

  const result = await config.hookRunner.evaluateHook("PRE_OUTPUT", {
    session: outputSession,
    input: {
      content: responseText,
      target_classification: effectiveTarget,
    },
  });
  if (!result.allowed) {
    return { ok: false, error: result.message ?? "Output blocked by policy" };
  }
  return { ok: true, value: undefined };
}

// ─── Final response handling ─────────────────────────────────────────────────

/** Handle the final text response (no tool calls). */
export async function handleFinalResponse(
  finalText: string,
  completion: { content: string },
  hasTools: boolean,
  emptyNudgeCount: number,
  state: OrchestratorState,
  session: SessionState,
  history: HistoryEntry[],
  targetClassification: ClassificationLevel,
  tokens: TokenAccumulator,
): Promise<Result<ProcessMessageResult, string> | null> {
  const { isEmptyOrJunk, isLeakedIntent } = classifyResponseQuality(
    finalText,
    hasTools,
  );
  const isJunkFinal = finalText.length === 0 || isEmptyOrJunk || isLeakedIntent;
  const responseText = isJunkFinal && emptyNudgeCount >= 2
    ? FALLBACK_RESPONSE
    : finalText;

  const hookResult = await evaluatePreOutputHook(
    state.config,
    session,
    responseText,
    targetClassification,
  );
  if (!hookResult.ok) {
    return { ok: false, error: hookResult.error };
  }

  state.emit({ type: "response", text: responseText });
  history.push({
    role: "assistant",
    content: responseText.length > 0 ? responseText : completion.content,
  });

  return {
    ok: true,
    value: {
      response: responseText,
      tokenUsage: {
        inputTokens: tokens.inputTokens,
        outputTokens: tokens.outputTokens,
      },
    },
  };
}
