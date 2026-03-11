/**
 * Tool call dispatch pipeline.
 *
 * Orchestrates plan mode tool blocking, security context evaluation,
 * taint escalation, policy hook enforcement, and batched execution
 * of tool calls during agent iterations.
 *
 * @module
 */

import type { Result } from "../../core/types/classification.ts";
import type { SessionState } from "../../core/types/session.ts";
import type {
  OrchestratorConfig,
  ParsedToolCall,
} from "../orchestrator/orchestrator_types.ts";
import type { OrchestratorState } from "../orchestrator/orchestrator.ts";
import { capToolResponse, readMoreFromCache } from "./response_cap.ts";
import {
  executePlanModeToolCall,
  executeSecurityEnforcedToolCall,
} from "./security_pipeline.ts";
import {
  determineSourceType,
  recordToolCallLineageAndPersist,
} from "./tool_lineage.ts";

// Re-export for consumers that import from this file
export { determineSourceType, recordToolCallLineageAndPersist };

/** Dispatch a single tool call (plan mode + security). */
async function dispatchSingleToolCall(
  call: ParsedToolCall,
  orchestratorState: OrchestratorState,
  config: OrchestratorConfig,
  session: SessionState,
  sessionKey: string,
): Promise<{ resultText: string; blocked: boolean }> {
  if (call.name === "read_more") {
    const cacheId = typeof call.args.cache_id === "string"
      ? call.args.cache_id
      : undefined;
    const offset = typeof call.args.offset === "number"
      ? call.args.offset
      : undefined;
    if (!cacheId) {
      return { resultText: "Error: cache_id is required", blocked: false };
    }
    return {
      resultText: readMoreFromCache(
        orchestratorState.responseCache,
        cacheId,
        offset,
      ),
      blocked: false,
    };
  }

  if (orchestratorState.planManager) {
    const planResult = await executePlanModeToolCall(
      orchestratorState.planManager,
      sessionKey,
      call,
    );
    if (planResult.resultText !== undefined) {
      return { resultText: planResult.resultText, blocked: planResult.blocked };
    }
  }

  return executeSecurityEnforcedToolCall(
    call,
    config,
    session,
    orchestratorState.toolExecutor!,
  );
}

/** Execute a single tool call with event emission and format the result. */
async function executeAndFormatToolCall(
  call: ParsedToolCall,
  orchestratorState: OrchestratorState,
  session: SessionState,
  sessionKey: string,
): Promise<string> {
  orchestratorState.emit({
    type: "tool_call",
    name: call.name,
    args: call.args,
  });
  const { resultText, blocked } = await dispatchSingleToolCall(
    call,
    orchestratorState,
    orchestratorState.config,
    session,
    sessionKey,
  );
  const cappedText = (blocked || call.name === "read_more")
    ? resultText
    : capToolResponse(
      call.name,
      resultText,
      orchestratorState.responseCache,
      orchestratorState.config.maxToolResponseChars,
    );
  orchestratorState.emit({
    type: "tool_result",
    name: call.name,
    result: cappedText,
    blocked,
  });

  await recordToolCallLineageAndPersist(
    call,
    resultText,
    blocked,
    orchestratorState.config,
    session,
    sessionKey,
  );

  return `[TOOL_RESULT name="${call.name}"]\n${cappedText}\n[/TOOL_RESULT]`;
}

/** Process all tool calls for one iteration and return result parts. */
export async function processToolCallBatch(
  parsedCalls: readonly ParsedToolCall[],
  orchestratorState: OrchestratorState,
  session: SessionState,
  sessionKey: string,
  signal: AbortSignal | undefined,
): Promise<Result<string[], string>> {
  const resultParts: string[] = [];
  for (const call of parsedCalls) {
    if (signal?.aborted) {
      return { ok: false, error: "Operation cancelled by user" };
    }
    resultParts.push(
      await executeAndFormatToolCall(
        call,
        orchestratorState,
        session,
        sessionKey,
      ),
    );
  }
  return { ok: true, value: resultParts };
}
