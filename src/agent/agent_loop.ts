/**
 * Agent loop — main LLM iteration cycle.
 *
 * Manages the iterative call-LLM → parse-tool-calls → execute → repeat
 * cycle with debug logging, soft-limit warnings, and response recovery.
 *
 * @module
 */

import { createLogger } from "../core/logger/mod.ts";
import type { ClassificationLevel, Result } from "../core/types/classification.ts";
import type { SessionState } from "../core/types/session.ts";
import type { LlmProvider } from "./llm.ts";
import { convertToolsToNativeFormat } from "./tool_format.ts";
import { parseNativeToolCalls } from "./tool_format.ts";
import { processToolCallBatch } from "./tool_dispatch.ts";
import {
  buildRecoveryNudge,
  classifyResponseQuality,
  handleFinalResponse,
} from "./response_handling.ts";
import type {
  HistoryEntry,
  ParsedToolCall,
  ProcessMessageResult,
  ToolDefinition,
} from "./orchestrator_types.ts";
import {
  MAX_TOOL_ITERATIONS,
  SOFT_LIMIT_ITERATIONS,
} from "./orchestrator_types.ts";
import type { OrchestratorState, TokenAccumulator } from "./orchestrator.ts";
import type { LlmMessage } from "./llm.ts";

// ─── Debug logging ───────────────────────────────────────────────────────────

/** Log to the structured logger at TRACE level. */
function traceLog(
  orchLog: ReturnType<typeof createLogger>,
  debug: boolean,
  label: string,
  data: unknown,
): void {
  if (!debug) return;
  const str = typeof data === "string" ? data : JSON.stringify(data, null, 2);
  const preview = str.length > 500
    ? str.slice(0, 500) + `... [${str.length} chars]`
    : str;
  orchLog.trace(`${label}: ${preview}`);
}

/** Log first-iteration debug details (system prompt + history preview). */
function logFirstIterationDetails(
  orchLog: ReturnType<typeof createLogger>,
  debug: boolean,
  systemPrompt: string,
  history: readonly HistoryEntry[],
): void {
  if (!debug) return;
  orchLog.trace(
    `=== SYSTEM PROMPT ===\n${systemPrompt}\n=== END SYSTEM PROMPT ===`,
  );
  for (const h of history) {
    const preview = typeof h.content === "string"
      ? h.content.slice(0, 100)
      : "(non-string)";
    orchLog.trace(`history ${h.role}: ${preview}`);
  }
}

// ─── LLM iteration helpers ──────────────────────────────────────────────────

/** Build the LLM messages array from system prompt and history. */
function buildLlmMessages(
  systemPrompt: string,
  history: readonly HistoryEntry[],
): LlmMessage[] {
  return [{ role: "system", content: systemPrompt }, ...history];
}

/** Resolve the live tool list for this iteration. */
function resolveActiveToolList(
  state: OrchestratorState,
): readonly ToolDefinition[] {
  return state.getExtraTools
    ? [...state.baseTools, ...state.getExtraTools()]
    : state.baseTools;
}

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
  tokens: TokenAccumulator,
  completion: { usage: { inputTokens: number; outputTokens: number } },
  iterations: number,
  orchLog: ReturnType<typeof createLogger>,
): void {
  tokens.inputTokens += completion.usage.inputTokens;
  tokens.outputTokens += completion.usage.outputTokens;
  orchLog.debug(
    `iter${iterations} tokens — input: ${completion.usage.inputTokens}, output: ${completion.usage.outputTokens}, cumulative: ${tokens.inputTokens}+${tokens.outputTokens}`,
  );
}

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

// ─── Agent loop types ────────────────────────────────────────────────────────

/** Mutable nudge counter passed between iterations. */
interface NudgeState {
  count: number;
}

/** Bundled context for a single agent loop iteration. */
interface AgentLoopContext {
  readonly state: OrchestratorState;
  readonly session: SessionState;
  readonly systemPrompt: string;
  readonly history: HistoryEntry[];
  readonly sessionKey: string;
  readonly targetClassification: ClassificationLevel;
  readonly signal: AbortSignal | undefined;
  readonly tokens: TokenAccumulator;
  readonly nudge: NudgeState;
}

/** Result of a single agent loop iteration. */
type IterationOutcome =
  | { action: "continue" }
  | { action: "return"; result: Result<ProcessMessageResult, string> };

/** Successful LLM iteration result. */
type LlmIterationResult = {
  completion: Awaited<ReturnType<LlmProvider["complete"]>>;
  tools: readonly ToolDefinition[];
};

/** Result of calling the LLM in the agent loop: success with completion, or abort. */
type LlmCallOutcome =
  | {
    ok: true;
    completion: LlmIterationResult["completion"];
    tools: LlmIterationResult["tools"];
  }
  | { ok: false; result: Result<ProcessMessageResult, string> };

/** Abort sentinel for cancelled operations. */
const CANCELLED_RESULT: LlmCallOutcome = {
  ok: false,
  result: { ok: false, error: "Operation cancelled by user" },
};

// ─── LLM iteration ──────────────────────────────────────────────────────────

/** Run a single LLM iteration and return the completion. */
async function runLlmIteration(
  state: OrchestratorState,
  systemPrompt: string,
  history: readonly HistoryEntry[],
  iterations: number,
  signal: AbortSignal | undefined,
) {
  const provider = state.config.providerRegistry.getDefault()!;
  const messages = buildLlmMessages(systemPrompt, history);

  traceLog(
    state.orchLog,
    state.debug,
    `iter${iterations} sending`,
    `${messages.length} msgs, sysPrompt=${systemPrompt.length}chars, history=${history.length} entries`,
  );
  if (iterations === 1) {
    logFirstIterationDetails(state.orchLog, state.debug, systemPrompt, history);
  }

  const tools = resolveActiveToolList(state);
  const nativeTools = (tools.length > 0 && state.toolExecutor)
    ? convertToolsToNativeFormat(tools)
    : [];

  const completion = await provider.complete(messages, nativeTools, {
    ...(signal ? { signal } : {}),
  });
  return { completion, tools };
}

/** Emit event, call LLM, accumulate tokens, and check abort. */
async function callLlmAndRecordUsage(
  ctx: AgentLoopContext,
  iterations: number,
): Promise<LlmCallOutcome> {
  ctx.state.emit({
    type: "llm_start",
    iteration: iterations,
    maxIterations: MAX_TOOL_ITERATIONS,
  });
  const { completion, tools } = await runLlmIteration(
    ctx.state,
    ctx.systemPrompt,
    ctx.history,
    iterations,
    ctx.signal,
  );
  accumulateTokenUsage(ctx.tokens, completion, iterations, ctx.state.orchLog);
  if (ctx.signal?.aborted) return CANCELLED_RESULT;
  traceLog(
    ctx.state.orchLog,
    ctx.state.debug,
    `iter${iterations} raw`,
    completion.content,
  );
  return { ok: true, completion, tools };
}

// ─── Iteration dispatch ──────────────────────────────────────────────────────

/** Emit completion event and trace parsed tool call count. */
function emitToolCallParseResult(
  ctx: AgentLoopContext,
  parsedCalls: readonly ParsedToolCall[],
  iterations: number,
): void {
  traceLog(
    ctx.state.orchLog,
    ctx.state.debug,
    `iter${iterations} parsedCalls`,
    parsedCalls.length,
  );
  ctx.state.emit({
    type: "llm_complete",
    iteration: iterations,
    hasToolCalls: parsedCalls.length > 0,
  });
}

/** Handle the case when no tool calls were returned. */
async function handleNoToolCallsIteration(
  completion: { content: string },
  hasTools: boolean,
  nudge: NudgeState,
  iterations: number,
  state: OrchestratorState,
  session: SessionState,
  history: HistoryEntry[],
  targetClassification: ClassificationLevel,
  tokens: TokenAccumulator,
): Promise<IterationOutcome> {
  const finalText = completion.content.trim();
  traceLog(
    state.orchLog,
    state.debug,
    `iter${iterations} finalText`,
    finalText || "(EMPTY)",
  );

  const { isEmptyOrJunk, isLeakedIntent } = classifyResponseQuality(
    finalText,
    hasTools,
  );
  if (
    (isEmptyOrJunk || isLeakedIntent) &&
    nudge.count < 2 && iterations < MAX_TOOL_ITERATIONS
  ) {
    nudge.count++;
    if (completion.content.trim().length > 0) {
      history.push({ role: "assistant", content: completion.content });
    }
    history.push({
      role: "user",
      content: buildRecoveryNudge(isLeakedIntent, nudge.count),
    });
    return { action: "continue" };
  }

  const result = await handleFinalResponse(
    finalText,
    completion,
    hasTools,
    nudge.count,
    state,
    session,
    history,
    targetClassification,
    tokens,
  );
  if (result) return { action: "return", result };
  return {
    action: "return",
    result: { ok: false, error: "No response generated" },
  };
}

/** Append tool call results to history and return early on abort. */
async function handleToolCallsIteration(
  parsedCalls: readonly ParsedToolCall[],
  completion: { content: string },
  state: OrchestratorState,
  session: SessionState,
  history: HistoryEntry[],
  sessionKey: string,
  iterations: number,
  signal: AbortSignal | undefined,
): Promise<Result<void, string>> {
  const assistantContent = completion.content.trim().length > 0
    ? completion.content
    : `[Used tools: ${parsedCalls.map((c) => c.name).join(", ")}]`;
  history.push({ role: "assistant", content: assistantContent });

  injectSoftLimitWarning(history, iterations);

  const batchResult = await processToolCallBatch(
    parsedCalls,
    state,
    session,
    sessionKey,
    signal,
  );
  if (!batchResult.ok) return batchResult;

  history.push({ role: "user", content: batchResult.value.join("\n\n") });
  return { ok: true, value: undefined };
}

/** Dispatch tool call execution and convert result to iteration outcome. */
async function dispatchToolCallExecution(
  ctx: AgentLoopContext,
  parsedCalls: readonly ParsedToolCall[],
  completion: { content: string },
  iterations: number,
): Promise<IterationOutcome> {
  const toolResult = await handleToolCallsIteration(
    parsedCalls,
    completion,
    ctx.state,
    ctx.session,
    ctx.history,
    ctx.sessionKey,
    iterations,
    ctx.signal,
  );
  if (!toolResult.ok) {
    return { action: "return", result: toolResult };
  }
  return { action: "continue" };
}

/** Parse tool calls from LLM output, trace results, and dispatch to appropriate handler. */
async function dispatchIterationOutcome(
  ctx: AgentLoopContext,
  completion: { content: string; toolCalls?: readonly unknown[] },
  tools: readonly ToolDefinition[],
  iterations: number,
): Promise<IterationOutcome> {
  const { parsedCalls, hasTools } = parseCompletionToolCalls(
    completion,
    tools,
    ctx.state,
  );
  emitToolCallParseResult(ctx, parsedCalls, iterations);

  if (parsedCalls.length === 0) {
    return await handleNoToolCallsIteration(
      completion,
      hasTools,
      ctx.nudge,
      iterations,
      ctx.state,
      ctx.session,
      ctx.history,
      ctx.targetClassification,
      ctx.tokens,
    );
  }

  return await dispatchToolCallExecution(
    ctx,
    parsedCalls,
    completion,
    iterations,
  );
}

// ─── Main agent loop ─────────────────────────────────────────────────────────

/** Build the agent loop context from turn parameters. */
function buildAgentLoopContext(
  state: OrchestratorState,
  session: SessionState,
  systemPrompt: string,
  history: HistoryEntry[],
  sessionKey: string,
  targetClassification: ClassificationLevel,
  signal: AbortSignal | undefined,
): AgentLoopContext {
  return {
    state,
    session,
    systemPrompt,
    history,
    sessionKey,
    targetClassification,
    signal,
    tokens: { inputTokens: 0, outputTokens: 0 },
    nudge: { count: 0 },
  };
}

/** The main agent loop: call LLM, parse tool calls, execute, repeat. */
export async function runAgentLoop(
  state: OrchestratorState,
  session: SessionState,
  systemPrompt: string,
  history: HistoryEntry[],
  sessionKey: string,
  targetClassification: ClassificationLevel,
  signal: AbortSignal | undefined,
): Promise<Result<ProcessMessageResult, string>> {
  const ctx = buildAgentLoopContext(
    state,
    session,
    systemPrompt,
    history,
    sessionKey,
    targetClassification,
    signal,
  );
  for (let i = 1; i <= MAX_TOOL_ITERATIONS; i++) {
    if (signal?.aborted) {
      return { ok: false, error: "Operation cancelled by user" };
    }
    const llmResult = await callLlmAndRecordUsage(ctx, i);
    if (!llmResult.ok) return llmResult.result;
    const outcome = await dispatchIterationOutcome(
      ctx,
      llmResult.completion,
      llmResult.tools,
      i,
    );
    if (outcome.action === "continue") continue;
    return outcome.result;
  }
  return {
    ok: false,
    error: "Agent loop exceeded maximum tool call iterations",
  };
}
