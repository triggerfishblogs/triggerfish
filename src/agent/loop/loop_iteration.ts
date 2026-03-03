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
import {
  convertToolsToNativeFormat,
  parseNativeToolCalls,
} from "../dispatch/tool_format.ts";
import { processToolCallBatch } from "../dispatch/tool_dispatch.ts";
import {
  buildRecoveryNudge,
  classifyResponseQuality,
  handleFinalResponse,
  type ResponseQuality,
} from "../dispatch/response_handling.ts";
import type {
  HistoryEntry,
  ParsedToolCall,
  ToolDefinition,
} from "../orchestrator/orchestrator_types.ts";
import { MAX_TOOL_ITERATIONS } from "../orchestrator/orchestrator_types.ts";
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
  recordToolCallsAndDetectLoop,
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

/** Compute the soft limit iteration from max iterations (80% of max). */
function computeSoftLimit(maxIter: number): number {
  return Math.floor(maxIter * 0.8);
}

/** Inject soft limit warning into history when approaching max iterations. */
function injectSoftLimitWarning(
  history: HistoryEntry[],
  iterations: number,
  maxIter: number,
): void {
  if (iterations !== computeSoftLimit(maxIter)) return;
  history.push({
    role: "user",
    content:
      `[SYSTEM] You have used many tool calls (${iterations}/${maxIter}). ` +
      `You have ${maxIter - iterations} remaining iterations. ` +
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
  const taint = ctx.state.config.getSessionTaint?.() ?? "PUBLIC";
  const classificationProvider = ctx.state.config.providerRegistry
    .getForClassification(taint);
  const provider = classificationProvider ??
    ctx.state.config.providerRegistry.getDefault()!;
  ctx.state.orchLog.debug("Provider selected for LLM call", {
    operation: "runLlmProviderCall",
    iteration: iterations,
    taint,
    provider: provider.name,
    usedClassificationOverride: classificationProvider !== undefined,
  });
  traceLog(
    ctx.state,
    `iter${iterations} provider`,
    `taint=${taint} provider=${provider.name}`,
  );
  const messages = buildLlmMessages(ctx.systemPrompt, ctx.history);
  traceLog(
    ctx.state,
    `iter${iterations} sending`,
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
    sessionId: ctx.sessionKey,
  });
  return { completion, tools };
}

/** Emit event, call LLM, accumulate tokens, and check abort. */
export async function callLlmAndRecordUsage(
  ctx: AgentLoopContext,
  iterations: number,
): Promise<LlmCallOutcome> {
  const maxIter = ctx.state.config.maxIterations ?? MAX_TOOL_ITERATIONS;
  ctx.state.emit({
    type: "llm_start",
    iteration: iterations,
    maxIterations: maxIter,
  });
  const { completion, tools } = await runLlmProviderCall(ctx, iterations);
  accumulateTokenUsage(ctx, completion, iterations);
  if (ctx.signal?.aborted) return CANCELLED_RESULT;
  traceLog(ctx.state, `iter${iterations} raw`, completion.content);
  return { ok: true, completion, tools };
}

// ─── No-tool-call recovery ──────────────────────────────────────────────────

/** Attempt recovery nudge for empty/junk, leaked-intent, or trailing-intent responses. */
function attemptRecoveryNudge(
  ctx: AgentLoopContext,
  completion: { content: string },
  quality: ResponseQuality,
): IterationOutcome | null {
  if (ctx.nudge.count >= 2) return null;
  ctx.nudge.count++;
  if (completion.content.trim().length > 0) {
    ctx.history.push({ role: "assistant", content: completion.content });
  }
  ctx.history.push({
    role: "user",
    content: buildRecoveryNudge(quality, ctx.nudge.count),
  });
  return { action: "continue" };
}

/** Handle the case when no tool calls were returned. */
async function handleNoToolCallsIteration(
  ctx: AgentLoopContext,
  iter: IterationData & { hasTools: boolean },
): Promise<IterationOutcome> {
  const finalText = iter.completion.content.trim();
  traceLog(
    ctx.state,
    `iter${iter.iteration} finalText`,
    finalText || "(EMPTY)",
  );

  const quality = classifyResponseQuality(finalText, iter.hasTools);
  const needsRecovery = quality.isEmptyOrJunk || quality.isLeakedIntent ||
    quality.hasTrailingIntent;
  const maxIter = ctx.state.config.maxIterations ?? MAX_TOOL_ITERATIONS;
  if (needsRecovery && iter.iteration < maxIter) {
    const nudgeResult = attemptRecoveryNudge(ctx, iter.completion, quality);
    if (nudgeResult) return nudgeResult;
  }

  const result = await handleFinalResponse(
    finalText,
    iter.completion,
    iter.hasTools,
    ctx.nudge.count,
    ctx.state,
    ctx.session,
    ctx.history,
    ctx.targetClassification,
    ctx.tokens,
  );
  if (result) return { action: "return", result };
  return {
    action: "return",
    result: { ok: false, error: "No response generated" },
  };
}

// ─── Tool-call iteration ────────────────────────────────────────────────────

/** Append tool call results to history and return early on abort. */
async function handleToolCallsIteration(
  ctx: AgentLoopContext,
  iter: IterationData & { parsedCalls: readonly ParsedToolCall[] },
): Promise<Result<void, string>> {
  const assistantContent = iter.completion.content.trim().length > 0
    ? iter.completion.content
    : `(${iter.parsedCalls.length} tool call(s) executed — see results below)`;
  ctx.history.push({ role: "assistant", content: assistantContent });
  const maxIter = ctx.state.config.maxIterations ?? MAX_TOOL_ITERATIONS;
  injectSoftLimitWarning(ctx.history, iter.iteration, maxIter);

  const batchResult = await processToolCallBatch(
    iter.parsedCalls,
    ctx.state,
    ctx.session,
    ctx.sessionKey,
    ctx.signal,
  );
  if (!batchResult.ok) return batchResult;
  ctx.history.push({ role: "user", content: batchResult.value.join("\n\n") });

  if (recordToolCallsAndDetectLoop(ctx.toolCallHistory, iter.parsedCalls)) {
    ctx.history.push({
      role: "user",
      content:
        "[SYSTEM] You are calling the same tool with the same arguments repeatedly. " +
        "This is not making progress. Try a different approach or provide your best answer now.",
    });
  }

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
    iter.completion,
    iter.tools,
    ctx.state,
  );
  emitToolCallParseResult(ctx, parsedCalls, iter.iteration);

  if (parsedCalls.length === 0) {
    return await handleNoToolCallsIteration(ctx, { ...iter, hasTools });
  }

  const toolResult = await handleToolCallsIteration(ctx, {
    ...iter,
    parsedCalls,
  });
  if (!toolResult.ok) return { action: "return", result: toolResult };
  return { action: "continue" };
}
