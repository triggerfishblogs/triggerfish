/**
 * Enforcement hooks — deterministic policy decision points in the data flow.
 *
 * Hooks are the enforcement layer between the LLM and external actions.
 * Every hook execution is:
 * - DETERMINISTIC: Same input → same decision, no randomness, no LLM calls
 * - SYNCHRONOUS: Completes before action proceeds; timeout = rejection
 * - LOGGED: Every execution recorded with full context
 * - UNFORGEABLE: Cannot be bypassed by LLM output
 *
 * @module
 */

import type { SessionId, SessionState, UserId } from "../types/session.ts";
import type { HookType, PolicyAction, PolicyRule } from "./rules.ts";
import type { PolicyEngine } from "./engine.ts";
import { canFlowTo, CLASSIFICATION_ORDER } from "../types/classification.ts";
import type { ClassificationLevel } from "../types/classification.ts";
import { createLogger } from "../logger/logger.ts";

const log = createLogger("policy");

/** Context provided to a hook for evaluation. */
export interface HookContext {
  readonly session: SessionState;
  readonly input: Record<string, unknown>;
}

/** Result of a hook evaluation. */
export interface HookResult {
  readonly allowed: boolean;
  readonly action: PolicyAction;
  readonly ruleId: string | null;
  readonly message?: string;
  readonly duration: number;
}

/** Logger interface for recording hook decisions. */
export interface HookLogger {
  /** Log a hook execution entry. */
  log(entry: HookLogEntry): void;
}

/** Structured log entry for a hook execution. */
export interface HookLogEntry {
  readonly timestamp: Date;
  readonly hook: HookType;
  readonly sessionId: SessionId;
  readonly userId: UserId;
  readonly input: Record<string, unknown>;
  readonly result: HookResult;
  readonly rulesEvaluated: readonly string[];
}

/** Options for configuring a hook runner. */
export interface HookRunnerOptions {
  readonly logger?: HookLogger;
  readonly timeoutMs?: number;
}

/** Runner that evaluates hooks against the policy engine. */
export interface HookRunner {
  /** Evaluate a hook against the policy engine. Returns a promise resolving to the decision. */
  evaluateHook(hook: HookType, context: HookContext): Promise<HookResult>;
}

/** Default timeout for hook evaluation in milliseconds. */
const DEFAULT_TIMEOUT_MS = 5000;

/** Check if session taint cannot flow to the target classification. */
function detectWriteDownViolation(
  input: Record<string, unknown>,
  sessionTaint: ClassificationLevel,
): boolean {
  const target = input.target_classification as ClassificationLevel | undefined;
  return target !== undefined &&
    target in CLASSIFICATION_ORDER &&
    !canFlowTo(sessionTaint, target);
}

/** Check if session taint is below the tool's required minimum floor. */
function detectToolFloorViolation(
  input: Record<string, unknown>,
  sessionTaint: ClassificationLevel,
): boolean {
  const toolFloor = input.tool_floor as ClassificationLevel | undefined;
  return toolFloor !== undefined &&
    toolFloor in CLASSIFICATION_ORDER &&
    CLASSIFICATION_ORDER[sessionTaint] < CLASSIFICATION_ORDER[toolFloor];
}

/** Check if session taint exceeds a resource's classification level. */
function detectResourceWriteDownViolation(
  input: Record<string, unknown>,
  sessionTaint: ClassificationLevel,
): boolean {
  const rc = input.resource_classification as ClassificationLevel | undefined;
  return rc !== undefined &&
    rc in CLASSIFICATION_ORDER &&
    !canFlowTo(sessionTaint, rc);
}

/** Check if a non-owner read exceeds the user's classification ceiling. */
function detectResourceReadCeilingViolation(
  input: Record<string, unknown>,
): boolean {
  const rc = input.resource_classification as ClassificationLevel | undefined;
  const ceiling = input.non_owner_ceiling as ClassificationLevel | undefined;
  return rc !== undefined &&
    input.operation_type === "read" &&
    input.is_owner === false &&
    ceiling !== undefined &&
    ceiling in CLASSIFICATION_ORDER &&
    !canFlowTo(rc, ceiling);
}

/**
 * Build the evaluation context by merging session state fields into the input.
 *
 * Injects session_id, user_id, channel_id, session_taint, write-down
 * violation flags, tool floor violation, and path classification violations
 * for use in policy condition evaluation.
 */
function buildEvaluationContext(
  context: HookContext,
): Record<string, unknown> {
  const { session, input } = context;

  return {
    ...input,
    session_id: session.id,
    user_id: session.userId,
    channel_id: session.channelId,
    session_taint: session.taint,
    write_down_violation: detectWriteDownViolation(input, session.taint)
      ? "true"
      : "false",
    tool_floor_violation: detectToolFloorViolation(input, session.taint)
      ? "true"
      : "false",
    resource_write_down_violation:
      detectResourceWriteDownViolation(input, session.taint) ? "true" : "false",
    resource_read_ceiling_violation: detectResourceReadCeilingViolation(input)
      ? "true"
      : "false",
  };
}

/** Build a structured log entry for a hook evaluation. */
function buildHookLogEntry(
  engine: PolicyEngine,
  hook: HookType,
  context: HookContext,
  result: HookResult,
): HookLogEntry {
  return {
    timestamp: new Date(),
    hook,
    sessionId: context.session.id,
    userId: context.session.userId,
    input: context.input,
    result,
    rulesEvaluated: engine.getRules(hook).map((r) => r.id),
  };
}

/** Build a BLOCK result for error/timeout cases. */
function buildTimeoutBlockResult(duration: number): HookResult {
  return {
    allowed: false,
    action: "BLOCK",
    ruleId: null,
    message: "Hook evaluation timed out",
    duration,
  };
}

/**
 * Create an enforcement hook runner bound to a policy engine.
 *
 * The runner evaluates policy rules at each hook point, enforcing
 * deterministic decisions with timeout protection and optional logging.
 *
 * @param engine - The policy engine containing rules to evaluate
 * @param options - Optional logger and timeout configuration
 * @returns A HookRunner instance
 */
export function createHookRunner(
  engine: PolicyEngine,
  options?: HookRunnerOptions,
): HookRunner {
  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const hookLogger = options?.logger;

  return {
    async evaluateHook(hook, context) {
      const start = performance.now();

      try {
        const result = await evaluateWithTimeout(
          engine,
          hook,
          context,
          timeoutMs,
        );
        const hookResult: HookResult = {
          ...result,
          duration: performance.now() - start,
        };
        hookLogger?.log(buildHookLogEntry(engine, hook, context, hookResult));
        return hookResult;
      } catch (err: unknown) {
        const duration = performance.now() - start;
        log.warn("Hook evaluation failed, defaulting to BLOCK", {
          hook,
          sessionId: context.session.id,
          error: err instanceof Error ? err.message : String(err),
          durationMs: Math.round(duration),
        });
        const blockResult = buildTimeoutBlockResult(duration);
        hookLogger?.log(buildHookLogEntry(engine, hook, context, blockResult));
        return blockResult;
      }
    },
  };
}

/**
 * Evaluate the policy engine with a timeout guard.
 *
 * If evaluation does not complete within timeoutMs, rejects with BLOCK.
 */
function evaluateWithTimeout(
  engine: PolicyEngine,
  hook: HookType,
  context: HookContext,
  timeoutMs: number,
): Promise<Omit<HookResult, "duration">> {
  return new Promise((resolve, reject) => {
    // If timeout is 0, reject immediately
    if (timeoutMs <= 0) {
      reject(new Error("Hook evaluation timed out"));
      return;
    }

    const timer = setTimeout(() => {
      reject(new Error("Hook evaluation timed out"));
    }, timeoutMs);

    try {
      const evalContext = buildEvaluationContext(context);
      const result = engine.evaluate(hook, evalContext);

      clearTimeout(timer);
      resolve({
        allowed: result.action === "ALLOW",
        action: result.action,
        ruleId: result.ruleId ?? null,
        message: result.message,
      });
    } catch (err) {
      clearTimeout(timer);
      reject(err);
    }
  });
}

function buildNoWriteDownRule(): PolicyRule {
  return {
    id: "no-write-down",
    priority: 1000,
    hook: "PRE_OUTPUT",
    conditions: [{
      field: "write_down_violation",
      operator: "equals",
      value: "true",
    }],
    action: "BLOCK",
    message:
      "Write-down violation: session taint exceeds target classification",
  };
}

function buildUntrustedInputRule(): PolicyRule {
  return {
    id: "untrusted-input",
    priority: 1000,
    hook: "PRE_CONTEXT_INJECTION",
    conditions: [{
      field: "source_type",
      operator: "equals",
      value: "UNTRUSTED",
    }],
    action: "BLOCK",
    message: "Untrusted input source blocked",
  };
}

function buildToolFloorRule(): PolicyRule {
  return {
    id: "tool-floor-enforcement",
    priority: 1000,
    hook: "PRE_TOOL_CALL",
    conditions: [{
      field: "tool_floor_violation",
      operator: "equals",
      value: "true",
    }],
    action: "BLOCK",
    message: "Tool requires minimum classification level",
  };
}

function buildResourceWriteDownRule(): PolicyRule {
  return {
    id: "resource-write-down",
    priority: 1000,
    hook: "PRE_TOOL_CALL",
    conditions: [{
      field: "resource_write_down_violation",
      operator: "equals",
      value: "true",
    }],
    action: "BLOCK",
    message: "Write-down: session taint exceeds target resource classification",
  };
}

function buildResourceReadCeilingRule(): PolicyRule {
  return {
    id: "resource-read-ceiling",
    priority: 1000,
    hook: "PRE_TOOL_CALL",
    conditions: [{
      field: "resource_read_ceiling_violation",
      operator: "equals",
      value: "true",
    }],
    action: "BLOCK",
    message: "Resource classification exceeds session ceiling",
  };
}

function buildRateLimitBaseRule(): PolicyRule {
  return {
    id: "rate-limit-base",
    priority: 500,
    hook: "PRE_TOOL_CALL",
    conditions: [],
    action: "ALLOW",
    message: "Rate limit placeholder",
  };
}

/**
 * Create the default system policy rules.
 *
 * These rules enforce core security invariants that cannot be disabled.
 *
 * @returns Array of default PolicyRule objects
 */
export function createDefaultRules(): PolicyRule[] {
  return [
    buildNoWriteDownRule(),
    buildUntrustedInputRule(),
    buildToolFloorRule(),
    buildResourceWriteDownRule(),
    buildResourceReadCeilingRule(),
    buildRateLimitBaseRule(),
  ];
}
