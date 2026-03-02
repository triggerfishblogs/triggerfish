/**
 * Compactor — conversation context window management.
 *
 * @module
 */

export type { Compactor, CompactorConfig, CompactResult } from "./compactor.ts";
export { createCompactor } from "./compactor.ts";
export {
  countContentTokens,
  countTokens,
  estimateHistoryTokens,
  estimateTokens,
} from "./compactor_tokens.ts";

// Re-export for backward compatibility
export {
  countContentTokens as countContentTokensCompat,
  countTokens as countTokensCompat,
  estimateHistoryTokens as estimateHistoryTokensCompat,
  estimateTokens as estimateTokensCompat,
} from "./compactor.ts";

export { extractKeywords } from "./compactor_keywords.ts";

export { compactSessionHistory } from "./history_compaction.ts";
