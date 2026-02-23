/**
 * Keyword extraction for conversation compaction summaries.
 *
 * Extracts significant topic words from user messages, filtering
 * common English stop words. Used by the auto-compact strategy to
 * produce keyword-based placeholder summaries.
 *
 * @module
 */

import type { HistoryEntry } from "../orchestrator/orchestrator_types.ts";
import { extractText } from "../../core/image/content.ts";

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
 *
 * Scans user messages (skipping bracketed system messages), extracts
 * up to 3 significant words per message, and returns up to 10 unique
 * keywords representing conversation topics.
 *
 * @param messages - Conversation history entries to extract keywords from
 * @returns Up to 10 unique topic keywords
 */
export function extractKeywords(
  messages: readonly HistoryEntry[],
): readonly string[] {
  return collectUniqueKeywords(messages, 3, 10);
}
