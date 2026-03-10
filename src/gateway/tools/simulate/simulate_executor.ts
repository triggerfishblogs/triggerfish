/**
 * Simulate tool executor — dry-run security pipeline for tool calls.
 *
 * Runs the security context assembly and taint escalation computation
 * without executing the tool. Returns predicted taint, escalation,
 * and blocked status so the LLM can make informed decisions.
 *
 * @module
 */

import type { ClassificationLevel } from "../../../core/types/classification.ts";
import {
  canFlowTo,
  maxClassification,
} from "../../../core/types/classification.ts";
import type { PathClassifier } from "../../../core/security/path_classification.ts";
import type { ToolFloorRegistry } from "../../../core/security/tool_floors.ts";
import type { DomainClassifier } from "../../../core/types/domain.ts";
import {
  detectResourceReadCeilingViolation,
  detectResourceWriteDownViolation,
  detectToolFloorViolation,
} from "../../../core/policy/hooks/hook_violations.ts";
import { assembleSecurityContext } from "../../../agent/dispatch/security_context.ts";
import type { SecurityContextConfig } from "../../../agent/dispatch/security_context.ts";
import type { SubsystemExecutor } from "../executor/executor_types.ts";
import { createLogger } from "../../../core/logger/mod.ts";

const log = createLogger("simulate-tool");

// ─── Types ───────────────────────────────────────────────────────────────────

/** Injected dependencies for the simulate tool executor. */
export interface SimulateToolContext {
  readonly getSessionTaint: () => ClassificationLevel;
  readonly isOwner: () => boolean;
  readonly isTrigger: () => boolean;
  readonly toolClassifications?: ReadonlyMap<string, ClassificationLevel>;
  readonly integrationClassifications?: ReadonlyMap<
    string,
    ClassificationLevel
  >;
  readonly pathClassifier?: PathClassifier;
  readonly domainClassifier?: DomainClassifier;
  readonly toolFloorRegistry?: ToolFloorRegistry;
  readonly getWorkspacePath?: () => string | null;
  readonly getNonOwnerCeiling?: () => ClassificationLevel | null;
}

/** Simulation result returned as tool output. */
interface SimulationResult {
  readonly currentTaint: ClassificationLevel;
  readonly resultingTaint: ClassificationLevel;
  readonly escalation: boolean;
  readonly blocked: boolean;
  readonly blockReason?: string;
}

// ─── Input validation ────────────────────────────────────────────────────────

/** Validate simulate_tool_call input. Returns error string or null. */
function validateSimulateInput(
  input: Record<string, unknown>,
): string | null {
  if (typeof input.tool_name !== "string" || input.tool_name.length === 0) {
    return "Error: simulate_tool_call requires a non-empty 'tool_name' argument (string).";
  }
  if (input.tool_args === undefined || input.tool_args === null) {
    return "Error: simulate_tool_call requires a 'tool_args' argument (object).";
  }
  if (typeof input.tool_args !== "object" || Array.isArray(input.tool_args)) {
    return "Error: simulate_tool_call 'tool_args' must be an object, not an array or primitive.";
  }
  return null;
}

// ─── Taint computation ──────────────────────────────────────────────────────

/** Resolve the prefix-based classification for a tool name. */
function resolveToolPrefixClassification(
  toolName: string,
  toolClassifications?: ReadonlyMap<string, ClassificationLevel>,
): ClassificationLevel | null {
  if (!toolClassifications) return null;
  for (const [prefix, level] of toolClassifications) {
    if (toolName.startsWith(prefix)) return level;
  }
  return null;
}

/**
 * Compute the taint that would result from executing a tool call.
 *
 * Mirrors the escalation logic in `tool_dispatch.ts`:
 * 1. If resource classification is available, use it (pre-escalation for owner/trigger).
 * 2. Otherwise, fall back to tool prefix classification.
 */
export function computeSimulatedTaint(
  currentTaint: ClassificationLevel,
  resourceClassification: ClassificationLevel | null,
  toolName: string,
  toolClassifications?: ReadonlyMap<string, ClassificationLevel>,
): ClassificationLevel {
  if (resourceClassification !== null) {
    return maxClassification(currentTaint, resourceClassification);
  }
  const prefixLevel = resolveToolPrefixClassification(
    toolName,
    toolClassifications,
  );
  if (prefixLevel !== null) {
    return maxClassification(currentTaint, prefixLevel);
  }
  return currentTaint;
}

// ─── Blocked evaluation ──────────────────────────────────────────────────────

/** Block result for a detected violation. */
interface BlockResult {
  readonly blocked: boolean;
  readonly reason?: string;
}

const NOT_BLOCKED: BlockResult = { blocked: false };

/** Check tool floor violation. */
function checkToolFloorBlock(
  hookInput: Record<string, unknown>,
  resultingTaint: ClassificationLevel,
  toolName: string,
): BlockResult | null {
  if (!detectToolFloorViolation(hookInput, resultingTaint)) return null;
  const floor = hookInput.tool_floor as ClassificationLevel;
  return {
    blocked: true,
    reason:
      `Tool floor: ${toolName} requires ${floor}, session would be at ${resultingTaint}.`,
  };
}

/** Check resource write-down violation. */
function checkResourceWriteDownBlock(
  hookInput: Record<string, unknown>,
  resultingTaint: ClassificationLevel,
): BlockResult | null {
  if (!detectResourceWriteDownViolation(hookInput, resultingTaint)) return null;
  const rc = hookInput.resource_classification as ClassificationLevel;
  return {
    blocked: true,
    reason:
      `Write-down: session taint ${resultingTaint} cannot write to ${rc} resource.`,
  };
}

/** Check non-owner read ceiling violation. */
function checkReadCeilingBlock(
  hookInput: Record<string, unknown>,
): BlockResult | null {
  if (!detectResourceReadCeilingViolation(hookInput)) return null;
  const rc = hookInput.resource_classification as ClassificationLevel;
  const ceiling = hookInput.non_owner_ceiling as ClassificationLevel;
  return {
    blocked: true,
    reason: `Read ceiling: resource ${rc} exceeds session ceiling ${ceiling}.`,
  };
}

/** Check integration write-down (session taint vs integration classification). */
function checkIntegrationWriteDownBlock(
  resultingTaint: ClassificationLevel,
  toolName: string,
  integrationClassifications?: ReadonlyMap<string, ClassificationLevel>,
): BlockResult | null {
  if (!integrationClassifications) return null;
  for (const [prefix, level] of integrationClassifications) {
    if (!toolName.startsWith(prefix)) continue;
    if (!canFlowTo(resultingTaint, level)) {
      return {
        blocked: true,
        reason:
          `Integration write-down: session taint ${resultingTaint} cannot flow to ${toolName} (classified ${level}).`,
      };
    }
    break;
  }
  return null;
}

/**
 * Check whether the tool call would be blocked by policy.
 *
 * Evaluates: tool floor violation, resource write-down, read ceiling,
 * and integration write-down — all without side effects.
 */
export function evaluateSimulatedBlocked(
  hookInput: Record<string, unknown>,
  resultingTaint: ClassificationLevel,
  toolName: string,
  integrationClassifications?: ReadonlyMap<string, ClassificationLevel>,
): BlockResult {
  return checkToolFloorBlock(hookInput, resultingTaint, toolName) ??
    checkResourceWriteDownBlock(hookInput, resultingTaint) ??
    checkReadCeilingBlock(hookInput) ??
    checkIntegrationWriteDownBlock(
      resultingTaint,
      toolName,
      integrationClassifications,
    ) ??
    NOT_BLOCKED;
}

// ─── Executor factory ────────────────────────────────────────────────────────

/** Build the config subset consumed by assembleSecurityContext. */
function buildSecurityConfigProxy(
  ctx: SimulateToolContext,
): SecurityContextConfig {
  return {
    pathClassifier: ctx.pathClassifier,
    domainClassifier: ctx.domainClassifier,
    toolFloorRegistry: ctx.toolFloorRegistry,
    isOwnerSession: ctx.isOwner,
    isTriggerSession: ctx.isTrigger,
    getNonOwnerCeiling: ctx.getNonOwnerCeiling,
    getWorkspacePath: ctx.getWorkspacePath,
  };
}

/** Run the full simulation pipeline and return the result. */
function executeSimulation(
  ctx: SimulateToolContext,
  toolName: string,
  toolArgs: Record<string, unknown>,
): SimulationResult {
  const currentTaint = ctx.getSessionTaint();
  const fakeCall = { name: toolName, args: toolArgs };

  const { input: hookInput, ctx: secCtx } = assembleSecurityContext(
    fakeCall,
    buildSecurityConfigProxy(ctx),
  );
  log.info("Simulation security context assembled", {
    operation: "assembleSecurityContext",
    toolName,
    resourceClassification: secCtx.resourceClassification,
    toolFloor: secCtx.toolFloor,
    currentTaint,
  });

  const resultingTaint = computeSimulatedTaint(
    currentTaint,
    secCtx.resourceClassification,
    toolName,
    ctx.toolClassifications,
  );
  const hookInputWithTaint = { ...hookInput, session_taint: resultingTaint };

  const { blocked, reason } = evaluateSimulatedBlocked(
    hookInputWithTaint,
    resultingTaint,
    toolName,
    ctx.integrationClassifications,
  );
  log.info("Simulation evaluation complete", {
    operation: "evaluateSimulatedBlocked",
    toolName,
    currentTaint,
    resultingTaint,
    escalation: resultingTaint !== currentTaint,
    blocked,
    blockReason: reason,
  });

  return {
    currentTaint,
    resultingTaint,
    escalation: resultingTaint !== currentTaint,
    blocked,
    ...(reason ? { blockReason: reason } : {}),
  };
}

/**
 * Create a SubsystemExecutor for the simulate_tool_call tool.
 *
 * Returns null for any tool name other than `simulate_tool_call`.
 */
export function createSimulateToolExecutor(
  ctx: SimulateToolContext,
): SubsystemExecutor {
  return (
    name: string,
    input: Record<string, unknown>,
  ): Promise<string | null> => {
    if (name !== "simulate_tool_call") return Promise.resolve(null);

    const validationError = validateSimulateInput(input);
    if (validationError) return Promise.resolve(validationError);

    const toolName = input.tool_name as string;
    const toolArgs = input.tool_args as Record<string, unknown>;
    const result = executeSimulation(ctx, toolName, toolArgs);
    return Promise.resolve(JSON.stringify(result, null, 2));
  };
}
