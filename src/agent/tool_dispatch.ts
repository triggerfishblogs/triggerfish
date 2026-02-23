/**
 * Tool call dispatch pipeline.
 *
 * Handles plan mode tool blocking, security context evaluation,
 * taint escalation, policy hook enforcement, and batched execution
 * of tool calls during agent iterations.
 *
 * @module
 */

import type { ClassificationLevel, Result } from "../core/types/classification.ts";
import { canFlowTo } from "../core/types/classification.ts";
import type { SessionState } from "../core/types/session.ts";
import { createPlanToolExecutor } from "./plan/plan.ts";
import type { PlanManager } from "./plan/plan.ts";
import type {
  OrchestratorConfig,
  ParsedToolCall,
  ToolExecutor,
} from "./orchestrator_types.ts";
import type { OrchestratorState } from "./orchestrator.ts";
import {
  assembleSecurityContext,
  renderPolicyBlockExplanation,
} from "./security_context.ts";
import type { SecurityContext } from "./security_context.ts";

/** Check plan mode blocking and execute plan tools. */
async function executePlanModeToolCall(
  planManager: PlanManager,
  sessionKey: string,
  call: ParsedToolCall,
): Promise<{ resultText: string | undefined; blocked: boolean }> {
  if (planManager.isToolBlocked(sessionKey, call.name)) {
    return {
      resultText: `Tool "${call.name}" is blocked in plan mode. ` +
        `Use plan.exit to present your implementation plan first.`,
      blocked: true,
    };
  }
  const planExecutor = createPlanToolExecutor(planManager, sessionKey);
  const planResult = await planExecutor(call.name, call.args);
  if (planResult !== null) {
    return { resultText: planResult, blocked: false };
  }
  return { resultText: undefined, blocked: false };
}

/** Pre-escalate taint for owner/trigger resource access. */
function preEscalateOwnerTriggerTaint(
  secCtx: SecurityContext,
  config: OrchestratorConfig,
  call: ParsedToolCall,
): void {
  if (
    secCtx.resourceClassification === null ||
    (!secCtx.isOwner && !secCtx.isTrigger) ||
    !config.escalateTaint
  ) return;
  config.escalateTaint(
    secCtx.resourceClassification,
    `${call.name}: ${secCtx.resourceParam}`,
  );
}

/** Check integration write-down (session taint vs tool classification). */
function checkIntegrationWriteDown(
  call: ParsedToolCall,
  config: OrchestratorConfig,
): { resultText: string | undefined; blocked: boolean } {
  if (!config.toolClassifications || !config.getSessionTaint) {
    return { resultText: undefined, blocked: false };
  }
  const integrationTaint = config.getSessionTaint();
  for (const [prefix, level] of config.toolClassifications) {
    if (call.name.startsWith(prefix)) {
      if (!canFlowTo(integrationTaint, level)) {
        return {
          resultText:
            `Error: Session taint ${integrationTaint} cannot flow to ${call.name} (classified ${level}). ` +
            `Accessing a lower-classified tool from a higher-tainted session risks data leakage. ` +
            `Use /clear to reset your session context and taint before using ${level}-classified tools.`,
          blocked: true,
        };
      }
      break;
    }
  }
  return { resultText: undefined, blocked: false };
}

/** Post-hook escalation for non-owner sessions. */
function escalateNonOwnerResourceTaint(
  secCtx: SecurityContext,
  config: OrchestratorConfig,
  call: ParsedToolCall,
): void {
  if (
    secCtx.resourceClassification === null || secCtx.isOwner ||
    secCtx.isTrigger || !config.escalateTaint
  ) return;
  config.escalateTaint(
    secCtx.resourceClassification,
    `${call.name}: ${secCtx.resourceParam}`,
  );
}

/** Evaluate PRE_TOOL_CALL hook with real-time session taint. */
async function evaluatePreToolCallHook(
  config: OrchestratorConfig,
  session: SessionState,
  secInput: Record<string, unknown>,
) {
  const currentTaint = config.getSessionTaint?.() ?? session.taint;
  const hookSession = currentTaint !== session.taint
    ? { ...session, taint: currentTaint }
    : session;
  const result = await config.hookRunner.evaluateHook("PRE_TOOL_CALL", {
    session: hookSession,
    input: secInput,
  });
  return { result, currentTaint };
}

/** Execute the tool after policy approval (write-down + escalation + dispatch). */
async function executeAfterPolicyApproval(
  call: ParsedToolCall,
  config: OrchestratorConfig,
  secCtx: SecurityContext,
  toolExecutor: ToolExecutor,
): Promise<{ resultText: string; blocked: boolean }> {
  const writeDown = checkIntegrationWriteDown(call, config);
  if (writeDown.resultText !== undefined) {
    return { resultText: writeDown.resultText, blocked: writeDown.blocked };
  }
  escalateNonOwnerResourceTaint(secCtx, config, call);
  return {
    resultText: await toolExecutor(call.name, call.args),
    blocked: false,
  };
}

/** Execute a single tool call through the full security pipeline. */
async function executeSecurityEnforcedToolCall(
  call: ParsedToolCall,
  config: OrchestratorConfig,
  session: SessionState,
  toolExecutor: ToolExecutor,
): Promise<{ resultText: string; blocked: boolean }> {
  const { input: secInput, ctx: secCtx } = assembleSecurityContext(
    call,
    config,
  );
  preEscalateOwnerTriggerTaint(secCtx, config, call);

  const { result: preToolResult, currentTaint } = await evaluatePreToolCallHook(
    config,
    session,
    secInput,
  );

  if (!preToolResult.allowed) {
    return {
      resultText: renderPolicyBlockExplanation(
        preToolResult.ruleId,
        secCtx,
        currentTaint,
      ),
      blocked: true,
    };
  }
  return executeAfterPolicyApproval(call, config, secCtx, toolExecutor);
}

/** Dispatch a single tool call (plan mode + security). */
async function dispatchSingleToolCall(
  call: ParsedToolCall,
  orchestratorState: OrchestratorState,
  config: OrchestratorConfig,
  session: SessionState,
  sessionKey: string,
): Promise<{ resultText: string; blocked: boolean }> {
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
  orchestratorState.emit({
    type: "tool_result",
    name: call.name,
    result: resultText,
    blocked,
  });
  return `[TOOL_RESULT name="${call.name}"]\n${resultText}\n[/TOOL_RESULT]`;
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
