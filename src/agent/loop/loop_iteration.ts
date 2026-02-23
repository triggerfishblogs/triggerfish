/**
 * Agent loop iteration — single-iteration LLM call, tool parsing, and dispatch.
 *
 * Handles the mechanics of one LLM round-trip: calling the provider,
 * accumulating token usage, parsing tool calls from the response,
 * and dispatching to either tool execution or final-response handling.
 *
 * @module
 */

import type { Result } from "../../core/types/classification.ts";
import { convertToolsToNativeFormat, parseNativeToolCalls } from "../dispatch/tool_format.ts";
import { processToolCallBatch } from "../dispatch/tool_dispatch.ts";
import {
  buildRecoveryNudge,
  classifyResponseQuality,
  handleFinalResponse,
} from "../dispatch/response_handling.ts";
import type {
  HistoryEntry,
  ParsedToolCall,
  ToolDefinition,
} from "../orchestrator/orchestrator_types.ts";
import {
  MAX_TOOL_ITERATIONS,
  SOFT_LIMIT_ITERATIONS,
} from "../orchestrator/orchestrator_types.ts";
import type { OrchestratorState } from "../orchestrator/orchestrator.ts";
import type {
  AgentLoopContext,
  IterationOutcome,
  LlmCallOutcome,
} from "./loop_types.ts";
import {
  buildLlmMessages,
  CANCELLED_RESULT,
  logFirstIterationDetails,
  resolveActiveToolList,
  traceLog,
} from "./loop_types.ts";

// ─── Per-iteration data ─────────────────────────────────────────────────────

/** Data produced by a single LLM call, passed to dispatch functions. */
interface IterationData {
  readonly completion: { content: string; toolCalls?: readonly unknown[] };
  readonly tools: readonly ToolDefinition[];
  readonly iteration: number;
}

// ─── Token and soft-limit helpers ────────────────────────────────────────────

/** Inject soft limit warning into history when approaching max iterations. */
function injectSoftLimitWarning(
  history: HistoryEntry[],
  iterations: number,
): void {
  if (iterations !== SOFT_LIMIT_ITERATIONS) return;
  history.push({
    role: "user",
    content:
      `[SYSTEM] You have used many tool calls (${iterations}/${MAX_TOOL_ITERATIONS}). ` +
      `You have ${MAX_TOOL_ITERATIONS - iterations} remaining iterations. ` +
      "Please provide your best answer now based on the information gathered so far. " +
      "If you cannot find what you're looking for, say so rather than continuing to search.",
  });
}

/** Accumulate token usage and log iteration stats. */
function accumulateTokenUsage(
  ctx: AgentLoopContext,
  completion: { usage: { inputTokens: number; outputTokens: number } },
  iterations: number,
): void {
  ctx.tokens.inputTokens += completion.usage.inputTokens;
  ctx.tokens.outputTokens += completion.usage.outputTokens;
  ctx.state.orchLog.debug(
    `iter${iterations} tokens — input: ${completion.usage.inputTokens}, output: ${completion.usage.outputTokens}, cumulative: ${ctx.tokens.inputTokens}+${ctx.tokens.outputTokens}`,
  );
}

// ─── Tool call parsing ──────────────────────────────────────────────────────

/** Parse tool calls from completion and determine tool availability. */
function parseCompletionToolCalls(
  completion: { toolCalls?: readonly unknown[] },
  tools: readonly ToolDefinition[],
  state: OrchestratorState,
): { parsedCalls: readonly ParsedToolCall[]; hasTools: boolean } {
  const hasTools = !!(tools.length > 0 && state.toolExecutor) ||
    !!state.planManager;
  let parsedCalls: readonly ParsedToolCall[] = [];
  if (
    hasTools && Array.isArray(completion.toolCalls) &&
    completion.toolCalls.length > 0
  ) {
    parsedCalls = parseNativeToolCalls(completion.toolCalls, state.orchLog);
  }
  return { parsedCalls, hasTools };
}

// ─── LLM call ────────────────────────────────────────────────────────────────

/** Run a single LLM provider call and return the raw completion. */
async function runLlmProviderCall(
  ctx: AgentLoopContext,
  iterations: number,
) {
  const provider = ctx.state.config.providerRegistry.getDefault()!;
  const messages = buildLlmMessages(ctx.systemPrompt, ctx.history);
  traceLog(
    ctx.state, `iter${iterations} sending`,
    `${messages.length} msgs, sysPrompt=${ctx.systemPrompt.length}chars, history=${ctx.history.length} entries`,
  );
  if (iterations === 1) {
    logFirstIterationDetails(ctx.state, ctx.systemPrompt, ctx.history);
  }
  const tools = resolveActiveToolList(ctx.state);
  const nativeTools = (tools.length > 0 && ctx.state.toolExecutor)
    ? convertToolsToNativeFormat(tools)
    : [];
  const completion = await provider.complete(messages, nativeTools, {
    ...(ctx.signal ? { signal: ctx.signal } : {}),
  });
  return { completion, tools };
}

/** Emit event, call LLM, accumulate tokens, and check abort. */
export async function callLlmAndRecordUsage(
  ctx: AgentLoopContext,
  iterations: number,
): Promise<LlmCallOutcome> {
  ctx.state.emit({
    type: "llm_start",
    iteration: iterations,
    maxIterations: MAX_TOOL_ITERATIONS,
  });
  const { completion, tools } = await runLlmProviderCall(ctx, iterations);
  accumulateTokenUsage(ctx, completion, iterations);
  if (ctx.signal?.aborted) return CANCELLED_RESULT;
  traceLog(ctx.state, `iter${iterations} raw`, completion.content);
  return { ok: true, completion, tools };
}

// ─── No-tool-call recovery ──────────────────────────────────────────────────

/** Attempt recovery nudge for empty/junk or leaked-intent responses. */
function attemptRecoveryNudge(
  ctx: AgentLoopContext,
  completion: { content: string },
  isLeakedIntent: boolean,
): IterationOutcome | null {
  if (ctx.nudge.count >= 2) return null;
  ctx.nudge.count++;
  if (completion.content.trim().length > 0) {
    ctx.history.push({ role: "assistant", content: completion.content });
  }
  ctx.history.push({
    role: "user",
    content: buildRecoveryNudge(isLeakedIntent, ctx.nudge.count),
  });
  return { action: "continue" };
}

/** Handle the case when no tool calls were returned. */
async function handleNoToolCallsIteration(
  ctx: AgentLoopContext,
  iter: IterationData & { hasTools: boolean },
): Promise<IterationOutcome> {
  const finalText = iter.completion.content.trim();
  traceLog(ctx.state, `iter${iter.iteration} finalText`, finalText || "(EMPTY)");

  const { isEmptyOrJunk, isLeakedIntent } = classifyResponseQuality(finalText, iter.hasTools);
  if ((isEmptyOrJunk || isLeakedIntent) && iter.iteration < MAX_TOOL_ITERATIONS) {
    const nudgeResult = attemptRecoveryNudge(ctx, iter.completion, isLeakedIntent);
    if (nudgeResult) return nudgeResult;
  }

  const result = await handleFinalResponse(
    finalText, iter.completion, iter.hasTools, ctx.nudge.count,
    ctx.state, ctx.session, ctx.history, ctx.targetClassification, ctx.tokens,
  );
  if (result) return { action: "return", result };
  return { action: "return", result: { ok: false, error: "No response generated" } };
}

// ─── Tool-call iteration ────────────────────────────────────────────────────

/** Append tool call results to history and return early on abort. */
async function handleToolCallsIteration(
  ctx: AgentLoopContext,
  iter: IterationData & { parsedCalls: readonly ParsedToolCall[] },
): Promise<Result<void, string>> {
  const assistantContent = iter.completion.content.trim().length > 0
    ? iter.completion.content
    : `[Used tools: ${iter.parsedCalls.map((c) => c.name).join(", ")}]`;
  ctx.history.push({ role: "assistant", content: assistantContent });
  injectSoftLimitWarning(ctx.history, iter.iteration);

  const batchResult = await processToolCallBatch(
    iter.parsedCalls, ctx.state, ctx.session, ctx.sessionKey, ctx.signal,
  );
  if (!batchResult.ok) return batchResult;
  ctx.history.push({ role: "user", content: batchResult.value.join("\n\n") });
  return { ok: true, value: undefined };
}

// ─── Iteration dispatch ──────────────────────────────────────────────────────

/** Emit completion event and trace parsed tool call count. */
function emitToolCallParseResult(
  ctx: AgentLoopContext,
  parsedCalls: readonly ParsedToolCall[],
  iterations: number,
): void {
  traceLog(ctx.state, `iter${iterations} parsedCalls`, parsedCalls.length);
  ctx.state.emit({
    type: "llm_complete",
    iteration: iterations,
    hasToolCalls: parsedCalls.length > 0,
  });
}

/** Parse tool calls from LLM output and dispatch to appropriate handler. */
export async function dispatchIterationOutcome(
  ctx: AgentLoopContext,
  iter: IterationData,
): Promise<IterationOutcome> {
  const { parsedCalls, hasTools } = parseCompletionToolCalls(
    iter.completion, iter.tools, ctx.state,
  );
  emitToolCallParseResult(ctx, parsedCalls, iter.iteration);

  if (parsedCalls.length === 0) {
    return await handleNoToolCallsIteration(ctx, { ...iter, hasTools });
  }

  const toolResult = await handleToolCallsIteration(ctx, { ...iter, parsedCalls });
  if (!toolResult.ok) return { action: "return", result: toolResult };
  return { action: "continue" };
}
