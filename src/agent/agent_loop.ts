/**
 * Agent loop — main LLM iteration cycle.
 *
 * Manages the iterative call-LLM -> parse-tool-calls -> execute -> repeat
 * cycle. Delegates debug logging and types to loop_types.ts, and
 * single-iteration mechanics to loop_iteration.ts.
 *
 * @module
 */

import type { ClassificationLevel, Result } from "../core/types/classification.ts";
import type { SessionState } from "../core/types/session.ts";
import type { HistoryEntry, ProcessMessageResult } from "./orchestrator_types.ts";
import { MAX_TOOL_ITERATIONS } from "./orchestrator_types.ts";
import type { OrchestratorState } from "./orchestrator.ts";
import type { AgentLoopContext } from "./loop_types.ts";
import { callLlmAndRecordUsage, dispatchIterationOutcome } from "./loop_iteration.ts";

/** Options for running the agent loop. */
export interface AgentLoopOptions {
  readonly state: OrchestratorState;
  readonly session: SessionState;
  readonly systemPrompt: string;
  readonly history: HistoryEntry[];
  readonly sessionKey: string;
  readonly targetClassification: ClassificationLevel;
  readonly signal: AbortSignal | undefined;
}

/** Build the agent loop context from options. */
function buildAgentLoopContext(opts: AgentLoopOptions): AgentLoopContext {
  return {
    ...opts,
    tokens: { inputTokens: 0, outputTokens: 0 },
    nudge: { count: 0 },
  };
}

/** Execute a single iteration: call LLM, dispatch outcome. */
async function executeIteration(
  ctx: AgentLoopContext,
  iteration: number,
): Promise<{ done: true; result: Result<ProcessMessageResult, string> } | { done: false }> {
  const llmResult = await callLlmAndRecordUsage(ctx, iteration);
  if (!llmResult.ok) return { done: true, result: llmResult.result };
  const outcome = await dispatchIterationOutcome(ctx, {
    completion: llmResult.completion,
    tools: llmResult.tools,
    iteration,
  });
  if (outcome.action === "continue") return { done: false };
  return { done: true, result: outcome.result };
}

/** The main agent loop: call LLM, parse tool calls, execute, repeat. */
export async function runAgentLoop(
  opts: AgentLoopOptions,
): Promise<Result<ProcessMessageResult, string>> {
  const ctx = buildAgentLoopContext(opts);
  for (let i = 1; i <= MAX_TOOL_ITERATIONS; i++) {
    if (opts.signal?.aborted) {
      return { ok: false, error: "Operation cancelled by user" };
    }
    const step = await executeIteration(ctx, i);
    if (step.done) return step.result;
  }
  return {
    ok: false,
    error: "Agent loop exceeded maximum tool call iterations",
  };
}
