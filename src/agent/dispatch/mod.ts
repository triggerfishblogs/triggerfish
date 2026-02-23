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
  enforceTriggerToolCeiling,
  enforceNonOwnerToolCeiling,
  escalateToolPrefixTaint,
  escalateResponseClassification,
  wrapToolExecutorWithEnforcement,
} from "./access_control.ts";

export type { SecurityContext } from "./security_context.ts";
export {
  assembleSecurityContext,
  renderPolicyBlockExplanation,
} from "./security_context.ts";

export {
  classifyResponseQuality,
  buildRecoveryNudge,
  FALLBACK_RESPONSE,
  evaluatePreOutputHook,
  handleFinalResponse,
} from "./response_handling.ts";
