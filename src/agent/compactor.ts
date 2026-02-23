/**
 * Conversation compactor — manages context window usage.
 *
 * Provides token counting (via gpt-tokenizer cl100k_base), automatic
 * budget-aware compaction, and LLM-based summarization.
 *
 * Compaction strategy: the entire conversation history is summarized
 * into ONE message — a comprehensive briefing the LLM reads after its
 * system prompt to pick up exactly where it left off. No arbitrary
 * "keep last N turns" — the summary IS the context.
 *
 * - Auto-compact (fires at 70% budget): keyword-based placeholder summary
 * - /compact (explicit): LLM generates a real summary of the full history
 *
 * Both produce a single summary message. The system prompt (SPINE.md,
 * tools, platform sections) is handled by the orchestrator and is
 * always present — the compactor only manages conversation history.
 *
 * @module
 */

import type { HistoryEntry } from "./orchestrator.ts";
import type { LlmMessage, LlmProvider } from "./llm.ts";
import { extractText } from "../core/image/content.ts";
import { encode } from "gpt-tokenizer";

/** Configuration for the conversation compactor. */
export interface CompactorConfig {
  /** Maximum token budget (model context window). Default: 100000 */
  readonly contextBudget: number;
}

export type { CompactResult } from "../core/types/orchestrator.ts";

/** The compactor interface for managing conversation history size. */
export interface Compactor {
  /**
   * Auto-compact history if total context usage exceeds threshold.
   *
   * @param history - Conversation history entries
   * @param overheadTokens - Tokens already consumed by system prompt, tool
   *   definitions, and other fixed context outside the history. The compactor
   *   adds this to the history token count before comparing against the budget,
   *   ensuring compaction fires based on *total* context usage rather than
   *   history tokens alone. Defaults to 0 (backward-compatible).
   */
  compact(
    history: readonly HistoryEntry[],
    overheadTokens?: number,
  ): readonly HistoryEntry[];
  /** Force LLM-based summarization. Returns new history (single summary message). */
  summarize(
    history: readonly HistoryEntry[],
    provider: LlmProvider,
  ): Promise<readonly HistoryEntry[]>;
  /** Get token count for a history. */
  getTokenEstimate(history: readonly HistoryEntry[]): number;
  /** Update the context budget (e.g. when switching models). */
  updateBudget(budget: number): void;
}

/**
 * Count tokens in a string using cl100k_base tokenizer.
 *
 * Uses the gpt-tokenizer library which implements cl100k_base encoding.
 * Accurate within ~5% for Claude, GPT-4, and GPT-4o models.
 *
 * @param text - Text to count tokens for
 * @returns Exact token count
 */
export function countTokens(text: string): number {
  if (text.length === 0) return 0;
  return encode(text).length;
}

/**
 * Estimate token count for a string.
 *
 * @deprecated Use {@link countTokens} for accurate counts. This alias
 * remains for backward compatibility.
 */
export function estimateTokens(text: string): number {
  return countTokens(text);
}

/**
 * Count tokens for a single content entry (string or content blocks).
 * Images are estimated at ~1000 tokens each (no tokenizer for images).
 */
function countContentTokens(content: HistoryEntry["content"]): number {
  if (typeof content === "string") {
    return countTokens(content);
  }
  let tokens = 0;
  for (const block of content) {
    if (block.type === "text") {
      tokens += countTokens(block.text);
    } else if (block.type === "image") {
      tokens += 1000; // Approximate token cost per image
    }
  }
  return tokens;
}

/**
 * Count total tokens for a conversation history.
 *
 * @param history - Conversation history entries
 * @returns Sum of tokens across all entries
 */
export function estimateHistoryTokens(
  history: readonly HistoryEntry[],
): number {
  return history.reduce(
    (sum, entry) => sum + countContentTokens(entry.content),
    0,
  );
}

/** Common English stop words excluded from keyword extraction. */
const KEYWORD_STOP_WORDS = new Set([
  "the",
  "a",
  "an",
  "is",
  "are",
  "was",
  "were",
  "be",
  "been",
  "do",
  "does",
  "did",
  "will",
  "would",
  "could",
  "should",
  "can",
  "i",
  "me",
  "my",
  "you",
  "your",
  "we",
  "our",
  "it",
  "its",
  "to",
  "of",
  "in",
  "on",
  "at",
  "for",
  "with",
  "from",
  "by",
  "and",
  "or",
  "but",
  "not",
  "so",
  "if",
  "then",
  "that",
  "this",
  "what",
  "how",
  "tell",
  "about",
  "please",
]);

/** Extract significant words from a single text string, filtering stop words. */
function extractSignificantWords(text: string): readonly string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !KEYWORD_STOP_WORDS.has(w));
}

/** Collect up to `limit` unique keywords from significant words per message. */
function collectUniqueKeywords(
  messages: readonly HistoryEntry[],
  wordsPerMessage: number,
  limit: number,
): readonly string[] {
  const seen = new Set<string>();
  const keywords: string[] = [];
  for (const msg of messages) {
    if (msg.role !== "user") continue;
    const text = extractText(msg.content);
    if (text.startsWith("[")) continue;
    const words = extractSignificantWords(text);
    for (const word of words.slice(0, wordsPerMessage)) {
      if (!seen.has(word)) {
        seen.add(word);
        keywords.push(word);
      }
    }
  }
  return keywords.slice(0, limit);
}

/**
 * Extract topic keywords from user messages for the auto-compact placeholder.
 */
function extractKeywords(messages: readonly HistoryEntry[]): readonly string[] {
  return collectUniqueKeywords(messages, 3, 10);
}

/**
 * Build a brief text-only digest of the conversation for the LLM
 * summarizer prompt. Truncates individual messages to keep the prompt
 * manageable even when some entries are massive tool results.
 */
function buildDigest(
  history: readonly HistoryEntry[],
  maxTokens: number,
): string {
  const parts: string[] = [];
  let tokens = 0;

  for (const entry of history) {
    const text = extractText(entry.content);
    // Truncate individual messages — the summarizer doesn't need
    // every byte of a 50k tool result, just the gist.
    const truncated = text.length > 2000
      ? text.slice(0, 2000) + "… [truncated]"
      : text;
    const line = `${entry.role}: ${truncated}`;
    const lineTokens = countTokens(line);
    if (tokens + lineTokens > maxTokens) break;
    tokens += lineTokens;
    parts.push(line);
  }

  return parts.join("\n\n");
}

/** Find the last message text from a specific role, truncated to 500 chars. */
function findLastEntryContent(
  history: readonly HistoryEntry[],
  role: string,
  skipBracketed: boolean,
): string {
  for (let i = history.length - 1; i >= 0; i--) {
    if (history[i].role !== role) continue;
    const text = extractText(history[i].content);
    if (skipBracketed && text.startsWith("[")) continue;
    return text.length > 500 ? text.slice(0, 500) + "…" : text;
  }
  return "";
}

/** Build a keyword-based auto-compact summary entry from conversation history. */
function buildCompactSummaryEntry(
  history: readonly HistoryEntry[],
): HistoryEntry {
  const keywords = extractKeywords(history);
  const topicStr = keywords.length > 0
    ? ` Topics discussed: ${keywords.join(", ")}.`
    : "";
  const lastUserContent = findLastEntryContent(history, "user", true);
  const lastAssistantContent = findLastEntryContent(
    history,
    "assistant",
    false,
  );
  const parts = [
    `[Conversation context: ${history.length} messages were exchanged.${topicStr}`,
  ];
  if (lastUserContent) parts.push(`The user last said: "${lastUserContent}"`);
  if (lastAssistantContent) {
    parts.push(`You last responded: "${lastAssistantContent}"`);
  }
  parts.push("Continue the conversation from here.]");
  return { role: "user", content: parts.join(" ") };
}

/** Build the prompt messages for LLM-based conversation summarization. */
function buildSummarizerMessages(digest: string): LlmMessage[] {
  return [
    {
      role: "system",
      content:
        "You are a conversation summarizer. Your job is to write a concise " +
        "briefing that lets an AI assistant continue this conversation " +
        "seamlessly.\n\n" +
        "Include:\n" +
        "- Key facts, decisions, and agreements made\n" +
        "- What the user is currently working on or asking about\n" +
        "- Any pending tasks, unanswered questions, or next steps\n" +
        "- Important context the assistant needs to give a good next " +
        "response\n\n" +
        'Write in second person ("The user asked you to...", ' +
        '"You suggested...").\n' +
        "Be concise but complete — this summary replaces the entire " +
        "conversation history.\n" +
        "Maximum 300 words.",
    },
    { role: "user", content: digest },
  ];
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
  let contextBudget = config?.contextBudget ?? 100_000;
  /** Auto-compact triggers at 70% of context budget. */
  let autoTriggerThreshold = Math.floor(contextBudget * 0.7);

  function compact(
    history: readonly HistoryEntry[],
    overheadTokens = 0,
  ): readonly HistoryEntry[] {
    if (history.length === 0) return history;
    const totalTokens = estimateHistoryTokens(history) + overheadTokens;
    if (totalTokens <= autoTriggerThreshold) return history;
    if (history.length <= 2) return history;
    return [buildCompactSummaryEntry(history)];
  }

  async function summarize(
    history: readonly HistoryEntry[],
    provider: LlmProvider,
  ): Promise<readonly HistoryEntry[]> {
    if (history.length <= 2) return history;
    const digest = buildDigest(history, Math.floor(contextBudget * 0.25));
    const result = await provider.complete(
      buildSummarizerMessages(digest),
      [],
      {},
    );
    return [{
      role: "user",
      content: `[Conversation summary — continue from here]: ${result.content}`,
    }];
  }

  function getTokenEstimate(
    history: readonly HistoryEntry[],
  ): number {
    return estimateHistoryTokens(history);
  }

  function updateBudget(budget: number): void {
    contextBudget = budget;
    autoTriggerThreshold = Math.floor(contextBudget * 0.7);
  }

  return { compact, summarize, getTokenEstimate, updateBudget };
}
