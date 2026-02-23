/**
 * Compactor — conversation context window management.
 *
 * @module
 */

export type { CompactorConfig, Compactor, CompactResult } from "./compactor.ts";
export { createCompactor } from "./compactor.ts";
export {
  countTokens,
  estimateTokens,
  countContentTokens,
  estimateHistoryTokens,
} from "./compactor_tokens.ts";

// Re-export for backward compatibility
export {
  countTokens as countTokensCompat,
  estimateTokens as estimateTokensCompat,
  countContentTokens as countContentTokensCompat,
  estimateHistoryTokens as estimateHistoryTokensCompat,
} from "./compactor.ts";

export { extractKeywords } from "./compactor_keywords.ts";

export { compactSessionHistory } from "./history_compaction.ts";
