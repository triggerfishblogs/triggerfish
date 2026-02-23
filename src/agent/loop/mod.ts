/**
 * Agent loop — main LLM iteration cycle and turn entry point.
 *
 * @module
 */

export type { AgentLoopOptions } from "./agent_loop.ts";
export { runAgentLoop } from "./agent_loop.ts";

export { runAgentTurn } from "./agent_turn.ts";

export { callLlmAndRecordUsage, dispatchIterationOutcome } from "./loop_iteration.ts";

export type {
  AgentLoopContext,
  IterationOutcome,
  LlmCallOutcome,
  LlmIterationResult,
  NudgeState,
} from "./loop_types.ts";

export {
  buildLlmMessages,
  CANCELLED_RESULT,
  logFirstIterationDetails,
  resolveActiveToolList,
  traceLog,
} from "./loop_types.ts";
