/**
 * Session history compaction strategies.
 *
 * Provides sliding-window (keyword-based placeholder) and
 * LLM-based summarization compaction for conversation history.
 *
 * @module
 */

import type { SessionId } from "../../core/types/session.ts";
import type { LlmProvider } from "../llm.ts";
import type { Compactor, CompactResult } from "./compactor.ts";
import { estimateHistoryTokens } from "./compactor.ts";
import type { HistoryEntry, OrchestratorConfig } from "../orchestrator/orchestrator_types.ts";

/** Compact history using sliding-window strategy (no LLM). */
function compactHistoryWithSlidingWindow(
  history: HistoryEntry[],
  compactor: Compactor,
  messagesBefore: number,
  tokensBefore: number,
): CompactResult {
  const compacted = [...compactor.compact(history)];
  history.length = 0;
  history.push(...compacted);
  return {
    messagesBefore,
    messagesAfter: history.length,
    tokensBefore,
    tokensAfter: estimateHistoryTokens(history),
  };
}

/** Compact history using LLM-based summarization. */
async function compactHistoryWithSummarization(
  history: HistoryEntry[],
  compactor: Compactor,
  provider: LlmProvider,
  messagesBefore: number,
  tokensBefore: number,
): Promise<CompactResult> {
  const summarized = [...await compactor.summarize(history, provider)];
  history.length = 0;
  history.push(...summarized);
  return {
    messagesBefore,
    messagesAfter: history.length,
    tokensBefore,
    tokensAfter: estimateHistoryTokens(history),
  };
}

/** Sentinel result for empty conversation history. */
const EMPTY_COMPACT_RESULT: CompactResult = {
  messagesBefore: 0,
  messagesAfter: 0,
  tokensBefore: 0,
  tokensAfter: 0,
};

/** Compact a session's history using summarization or sliding-window fallback. */
export async function compactSessionHistory(
  sessionId: SessionId,
  histories: Map<string, HistoryEntry[]>,
  providerRegistry: OrchestratorConfig["providerRegistry"],
  compactor: Compactor,
): Promise<CompactResult> {
  const history = histories.get(sessionId as string) ?? [];
  if (history.length === 0) return EMPTY_COMPACT_RESULT;

  const messagesBefore = history.length;
  const tokensBefore = estimateHistoryTokens(history);
  const provider = providerRegistry.getDefault();

  if (!provider) {
    return compactHistoryWithSlidingWindow(
      history,
      compactor,
      messagesBefore,
      tokensBefore,
    );
  }
  return await compactHistoryWithSummarization(
    history,
    compactor,
    provider,
    messagesBefore,
    tokensBefore,
  );
}
