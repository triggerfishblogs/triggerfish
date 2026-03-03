/**
 * Tool dispatch — format conversion, access control, security, and response handling.
 *
 * @module
 */

export { processToolCallBatch } from "./tool_dispatch.ts";

export {
  convertToolsToNativeFormat,
  parseNativeToolCalls,
} from "./tool_format.ts";

export {
  enforceNonOwnerToolCeiling,
  enforceTriggerToolCeiling,
  escalateResponseClassification,
  escalateToolPrefixTaint,
  wrapToolExecutorWithEnforcement,
} from "./access_control.ts";

export type { SecurityContext } from "./security_context.ts";
export {
  assembleSecurityContext,
  renderPolicyBlockExplanation,
} from "./security_context.ts";

export {
  buildRecoveryNudge,
  classifyResponseQuality,
  detectRepetition,
  evaluatePreOutputHook,
  FALLBACK_RESPONSE,
  handleFinalResponse,
} from "./response_handling.ts";

export {
  capToolResponse,
  DEFAULT_RESPONSE_BUDGET,
  getReadMoreToolDefinition,
  MAX_CACHE_ENTRIES,
  readMoreFromCache,
  ResponseCache,
  TOOL_RESPONSE_BUDGETS,
  truncateAtLineBoundary,
} from "./response_cap.ts";
export type { CachedToolResponse } from "./response_cap.ts";
