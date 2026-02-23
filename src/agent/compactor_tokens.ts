/**
 * Token counting utilities for conversation context management.
 *
 * Uses gpt-tokenizer cl100k_base encoding for accurate token counts.
 * Accurate within ~5% for Claude, GPT-4, and GPT-4o models.
 *
 * @module
 */

import type { HistoryEntry } from "./orchestrator.ts";
import { encode } from "gpt-tokenizer";

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
export function countContentTokens(
  content: HistoryEntry["content"],
): number {
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
