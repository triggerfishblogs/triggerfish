/**
 * Conversation compactor — manages context window usage.
 *
 * Provides token estimation, automatic sliding-window compaction,
 * and optional LLM-based summarization for long conversations.
 *
 * @module
 */

import type { HistoryEntry } from "./orchestrator.ts";
import type { LlmProvider, LlmMessage } from "./llm.ts";

/** Configuration for the conversation compactor. */
export interface CompactorConfig {
  /** Maximum token budget before auto-compacting. Default: 100000 */
  readonly contextBudget: number;
  /** Number of recent turns to always preserve. Default: 10 */
  readonly preserveRecentTurns: number;
}

/** The compactor interface for managing conversation history size. */
export interface Compactor {
  /** Auto-compact history if tokens exceed threshold. Returns new history. */
  compact(history: readonly HistoryEntry[]): readonly HistoryEntry[];
  /** Force LLM-based summarization. Returns new history. */
  summarize(
    history: readonly HistoryEntry[],
    provider: LlmProvider,
  ): Promise<readonly HistoryEntry[]>;
  /** Get estimated token count for a history. */
  getTokenEstimate(history: readonly HistoryEntry[]): number;
}

/**
 * Estimate token count for a string.
 *
 * Uses ~4 characters per token heuristic. Conservative for
 * English text — over-estimating is safer than under-estimating.
 *
 * @param text - Text to estimate tokens for
 * @returns Estimated token count
 */
export function estimateTokens(text: string): number {
  if (text.length === 0) return 0;
  return Math.ceil(text.length / 4);
}

/**
 * Estimate total tokens for a conversation history.
 *
 * @param history - Conversation history entries
 * @returns Sum of estimated tokens across all entries
 */
export function estimateHistoryTokens(
  history: readonly HistoryEntry[],
): number {
  return history.reduce(
    (sum, entry) => sum + estimateTokens(entry.content),
    0,
  );
}

/**
 * Extract topic keywords from user messages.
 *
 * Takes the first few meaningful words from each user message
 * to create a brief topic summary for the compaction placeholder.
 *
 * @param messages - Messages to extract keywords from
 * @returns Deduplicated keyword list
 */
function extractKeywords(messages: readonly HistoryEntry[]): readonly string[] {
  const stopWords = new Set([
    "the", "a", "an", "is", "are", "was", "were", "be", "been",
    "do", "does", "did", "will", "would", "could", "should", "can",
    "i", "me", "my", "you", "your", "we", "our", "it", "its",
    "to", "of", "in", "on", "at", "for", "with", "from", "by",
    "and", "or", "but", "not", "so", "if", "then", "that", "this",
    "what", "how", "tell", "about", "please",
  ]);

  const seen = new Set<string>();
  const keywords: string[] = [];

  for (const msg of messages) {
    if (msg.role !== "user") continue;
    // Skip system-injected messages
    if (msg.content.startsWith("[")) continue;

    const words = msg.content
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, "")
      .split(/\s+/)
      .filter((w) => w.length > 2 && !stopWords.has(w));

    for (const word of words.slice(0, 3)) {
      if (!seen.has(word)) {
        seen.add(word);
        keywords.push(word);
      }
    }
  }

  return keywords.slice(0, 10);
}

/**
 * Create a conversation compactor.
 *
 * @param config - Optional partial configuration (defaults applied)
 * @returns A Compactor instance
 */
export function createCompactor(
  config?: Partial<CompactorConfig>,
): Compactor {
  const contextBudget = config?.contextBudget ?? 100000;
  const preserveRecentTurns = config?.preserveRecentTurns ?? 10;
  const threshold = Math.floor(contextBudget * 0.7);
  const preserveMessages = preserveRecentTurns * 2;

  function compact(
    history: readonly HistoryEntry[],
  ): readonly HistoryEntry[] {
    if (history.length === 0) return history;

    const tokens = estimateHistoryTokens(history);
    if (tokens <= threshold) return history;

    // Not enough messages to compact
    if (history.length <= preserveMessages) return history;

    // Keep first 2 messages (initial context) and last N messages (recent turns)
    const keepFirst = Math.min(2, history.length);
    const keepLast = Math.min(preserveMessages, history.length - keepFirst);

    if (keepFirst + keepLast >= history.length) return history;

    const firstMessages = history.slice(0, keepFirst);
    const droppedMessages = history.slice(keepFirst, history.length - keepLast);
    const lastMessages = history.slice(history.length - keepLast);

    // Build summary placeholder with keywords
    const keywords = extractKeywords(droppedMessages);
    const topicStr = keywords.length > 0
      ? ` about ${keywords.join(", ")}`
      : "";
    const summary: HistoryEntry = {
      role: "user",
      content:
        `[Previous conversation: ${droppedMessages.length} messages were exchanged${topicStr}]`,
    };

    return [...firstMessages, summary, ...lastMessages];
  }

  async function summarize(
    history: readonly HistoryEntry[],
    provider: LlmProvider,
  ): Promise<readonly HistoryEntry[]> {
    // Need at least more messages than the preserve window to summarize
    if (history.length <= preserveMessages) return history;

    const toSummarize = history.slice(0, history.length - preserveMessages);
    const toKeep = history.slice(history.length - preserveMessages);

    // Build summarization prompt
    const conversationText = toSummarize
      .map((e) => `${e.role}: ${e.content}`)
      .join("\n\n");

    const messages: LlmMessage[] = [
      {
        role: "system",
        content:
          "You are a conversation summarizer. Summarize the key facts, decisions, and context from the following conversation in 200 words or fewer. Be concise and focus on information that would be needed to continue the conversation.",
      },
      { role: "user", content: conversationText },
    ];

    const result = await provider.complete(messages, [], {});

    const summaryEntry: HistoryEntry = {
      role: "user",
      content: `[Conversation summary]: ${result.content}`,
    };

    return [summaryEntry, ...toKeep];
  }

  function getTokenEstimate(
    history: readonly HistoryEntry[],
  ): number {
    return estimateHistoryTokens(history);
  }

  return { compact, summarize, getTokenEstimate };
}
