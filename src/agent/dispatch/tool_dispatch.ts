/**
 * Tool call dispatch pipeline.
 *
 * Handles plan mode tool blocking, security context evaluation,
 * taint escalation, policy hook enforcement, and batched execution
 * of tool calls during agent iterations.
 *
 * @module
 */

import type { Result } from "../../core/types/classification.ts";
import { canFlowTo } from "../../core/types/classification.ts";
import type { SessionState } from "../../core/types/session.ts";
import { createPlanToolExecutor } from "../plan/plan.ts";
import type { PlanManager } from "../plan/plan.ts";
import type {
  OrchestratorConfig,
  ParsedToolCall,
  ToolExecutor,
} from "../orchestrator/orchestrator_types.ts";
import type { OrchestratorState } from "../orchestrator/orchestrator.ts";
import {
  assembleSecurityContext,
  renderPolicyBlockExplanation,
} from "./security_context.ts";
import type { SecurityContext } from "./security_context.ts";
import { escalateToolPrefixTaint } from "./access_control.ts";
import { capToolResponse, readMoreFromCache } from "./response_cap.ts";
import { createLogger } from "../../core/logger/mod.ts";

const log = createLogger("tool-dispatch");

/** Check plan mode blocking and execute plan tools. */
async function executePlanModeToolCall(
  planManager: PlanManager,
  sessionKey: string,
  call: ParsedToolCall,
): Promise<{ resultText: string | undefined; blocked: boolean }> {
  if (planManager.isToolBlocked(sessionKey, call.name, call.args)) {
    return {
      resultText: `Tool "${call.name}" is blocked in plan mode. ` +
        `Use plan_manage(action: "exit") to present your implementation plan first.`,
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
  ) {
    log.debug("Resource-based taint escalation skipped", {
      operation: "preEscalateOwnerTriggerTaint",
      toolName: call.name,
      resourceClassification: secCtx.resourceClassification,
      isOwner: secCtx.isOwner,
      isTrigger: secCtx.isTrigger,
    });
    return;
  }
  log.warn("Resource-based taint escalation firing", {
    operation: "preEscalateOwnerTriggerTaint",
    toolName: call.name,
    resourceClassification: secCtx.resourceClassification,
  });
  config.escalateTaint(
    secCtx.resourceClassification,
    `${call.name}: ${secCtx.resourceParam}`,
  );
}

/** Check integration write-down (session taint vs integration resource classification). */
function checkIntegrationWriteDown(
  call: ParsedToolCall,
  config: OrchestratorConfig,
): { resultText: string | undefined; blocked: boolean } {
  if (!config.integrationClassifications || !config.getSessionTaint) {
    return { resultText: undefined, blocked: false };
  }
  const sessionTaint = config.getSessionTaint();
  for (const [prefix, level] of config.integrationClassifications) {
    if (call.name.startsWith(prefix)) {
      if (!canFlowTo(sessionTaint, level)) {
        log.warn("Integration write-down blocked", {
          operation: "checkIntegrationWriteDown",
          toolName: call.name,
          sessionTaint,
          integrationClassification: level,
        });
        return {
          resultText:
            `Error: Session taint ${sessionTaint} cannot flow to ${call.name} (classified ${level}). ` +
            `Accessing a lower-classified integration from a higher-tainted session risks data leakage. ` +
            `Use /clear to reset your session context and taint before using ${level}-classified integrations.`,
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
  ) {
    log.debug("Non-owner taint escalation skipped", {
      operation: "escalateNonOwnerResourceTaint",
      toolName: call.name,
      resourceClassification: secCtx.resourceClassification,
      isOwner: secCtx.isOwner,
      isTrigger: secCtx.isTrigger,
    });
    return;
  }
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

/** Check if bumpers would block a tool call based on classification. */
function checkBumpersForToolCall(
  secCtx: SecurityContext,
  config: OrchestratorConfig,
  call: ParsedToolCall,
): string | null {
  if (!config.checkBumpersBlock) return null;

  if (secCtx.resourceClassification !== null) {
    const blocked = config.checkBumpersBlock(secCtx.resourceClassification);
    if (blocked) {
      log.warn("Bumpers blocked tool call via resource classification", {
        operation: "checkBumpersForToolCall",
        toolName: call.name,
        resourceClassification: secCtx.resourceClassification,
      });
      return blocked;
    }
  }

  if (config.toolClassifications) {
    for (const [prefix, level] of config.toolClassifications) {
      if (call.name.startsWith(prefix)) {
        const blocked = config.checkBumpersBlock(level);
        if (blocked) {
          log.warn("Bumpers blocked tool call via prefix classification", {
            operation: "checkBumpersForToolCall",
            toolName: call.name,
            prefix,
            classificationLevel: level,
          });
          return blocked;
        }
        break;
      }
    }
  }
  log.debug("Bumpers allowed tool call", {
    operation: "checkBumpersForToolCall",
    toolName: call.name,
  });
  return null;
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

  const bumpersBlock = checkBumpersForToolCall(secCtx, config, call);
  if (bumpersBlock !== null) {
    return { resultText: bumpersBlock, blocked: true };
  }

  preEscalateOwnerTriggerTaint(secCtx, config, call);
  if (secCtx.resourceClassification === null) {
    log.debug(
      "Falling back to prefix-based taint escalation — resource classification is null",
      {
        operation: "escalateToolPrefixTaint",
        toolName: call.name,
      },
    );
    escalateToolPrefixTaint(
      call.name,
      config.toolClassifications,
      config.escalateTaint,
    );
  }

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

/** Determine the lineage source_type from a tool name. */
export function determineSourceType(toolName: string): string {
  if (toolName.startsWith("web_")) return "web_request";
  if (toolName.startsWith("browser_")) return "browser_session";
  if (toolName.startsWith("memory_")) return "memory_access";
  if (toolName.startsWith("google_") || toolName.startsWith("gmail_") ||
      toolName.startsWith("calendar_") || toolName.startsWith("drive_") ||
      toolName.startsWith("sheets_") || toolName.startsWith("tasks_")) {
    return "google_api";
  }
  if (toolName.startsWith("github_")) return "github_api";
  if (toolName.startsWith("obsidian_")) return "obsidian_vault";
  if (toolName.startsWith("file_") || toolName === "read_file" ||
      toolName === "write_file" || toolName === "edit_file" ||
      toolName === "list_directory" || toolName === "search_files") {
    return "filesystem";
  }
  if (toolName.startsWith("mcp_")) return "mcp_server";
  if (toolName.startsWith("skill_") || toolName === "read_skill") {
    return "skill_execution";
  }
  if (toolName.startsWith("cron_") || toolName.startsWith("trigger_")) {
    return "scheduler";
  }
  return "tool_response";
}

/** Record lineage and persist a tool_call conversation record. */
export async function recordToolCallLineageAndPersist(
  call: ParsedToolCall,
  resultText: string,
  blocked: boolean,
  config: OrchestratorConfig,
  session: SessionState,
  sessionKey: string,
): Promise<void> {
  if (blocked || call.name === "read_more") return;

  let lineageId: string | undefined;
  if (config.lineageStore) {
    const sessionTaint = config.getSessionTaint?.() ?? session.taint;
    const record = await config.lineageStore.create({
      content: resultText,
      origin: {
        source_type: determineSourceType(call.name),
        source_name: call.name,
        accessed_at: new Date().toISOString(),
        accessed_by: session.userId as string,
        access_method: call.name,
      },
      classification: {
        level: sessionTaint,
        reason: `Tool call: ${call.name}`,
      },
      sessionId: session.id,
    });
    lineageId = record.lineage_id;
  }

  if (config.messageStore) {
    const sessionTaint = config.getSessionTaint?.() ?? session.taint;
    await config.messageStore.append({
      session_id: sessionKey,
      role: "tool_call",
      content: "",
      classification: sessionTaint,
      tool_name: call.name,
      tool_args: call.args,
      lineage_id: lineageId,
    });
  }
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

  // Record lineage and persist tool_call (non-blocking for the dispatch pipeline)
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
