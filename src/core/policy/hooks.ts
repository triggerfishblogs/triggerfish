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

import type { SessionState, SessionId, UserId } from "../types/session.ts";
import type { PolicyAction, HookType, PolicyRule } from "./rules.ts";
import type { PolicyEngine } from "./engine.ts";
import { CLASSIFICATION_ORDER, canFlowTo } from "../types/classification.ts";
import type { ClassificationLevel } from "../types/classification.ts";

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
  /** Run a hook evaluation. Returns a promise resolving to the decision. */
  run(hook: HookType, context: HookContext): Promise<HookResult>;
}

/** Default timeout for hook evaluation in milliseconds. */
const DEFAULT_TIMEOUT_MS = 5000;

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

  const targetClassification = input.target_classification as
    | ClassificationLevel
    | undefined;

  // Compute write-down violation flag: true if session taint cannot flow to target
  const writeDownViolation =
    targetClassification !== undefined &&
    targetClassification in CLASSIFICATION_ORDER &&
    !canFlowTo(session.taint, targetClassification);

  // Tool floor violation: session taint is below the tool's required floor
  const toolFloor = input.tool_floor as ClassificationLevel | undefined;
  const toolFloorViolation =
    toolFloor !== undefined &&
    toolFloor in CLASSIFICATION_ORDER &&
    CLASSIFICATION_ORDER[session.taint] < CLASSIFICATION_ORDER[toolFloor];

  // Resource classification violations (filesystem paths and URL domains)
  const resourceClassification = input.resource_classification as
    | ClassificationLevel
    | undefined;
  const operationType = input.operation_type as "read" | "write" | undefined;
  const isOwner = input.is_owner as boolean | undefined;
  const nonOwnerCeiling = input.non_owner_ceiling as
    | ClassificationLevel
    | undefined;

  // Resource taint violation: session taint exceeds resource classification.
  // Applies to ALL tools (read, write, fetch) — once tainted, the session
  // cannot interact with any lower-classified resource.
  const resourceWriteDownViolation =
    resourceClassification !== undefined &&
    resourceClassification in CLASSIFICATION_ORDER &&
    !canFlowTo(session.taint, resourceClassification);

  // Read ceiling: non-owner resource classification exceeds ceiling
  const resourceReadCeilingViolation =
    resourceClassification !== undefined &&
    operationType === "read" &&
    isOwner === false &&
    nonOwnerCeiling !== undefined &&
    nonOwnerCeiling in CLASSIFICATION_ORDER &&
    !canFlowTo(resourceClassification, nonOwnerCeiling);

  return {
    ...input,
    session_id: session.id,
    user_id: session.userId,
    channel_id: session.channelId,
    session_taint: session.taint,
    write_down_violation: writeDownViolation ? "true" : "false",
    tool_floor_violation: toolFloorViolation ? "true" : "false",
    resource_write_down_violation: resourceWriteDownViolation ? "true" : "false",
    resource_read_ceiling_violation: resourceReadCeilingViolation ? "true" : "false",
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
  const logger = options?.logger;

  async function run(hook: HookType, context: HookContext): Promise<HookResult> {
    const start = performance.now();

    try {
      const result = await evaluateWithTimeout(engine, hook, context, timeoutMs);
      const duration = performance.now() - start;
      const hookResult: HookResult = { ...result, duration };

      if (logger) {
        const rules = engine.getRules(hook);
        const entry: HookLogEntry = {
          timestamp: new Date(),
          hook,
          sessionId: context.session.id,
          userId: context.session.userId,
          input: context.input,
          result: hookResult,
          rulesEvaluated: rules.map((r) => r.id),
        };
        logger.log(entry);
      }

      return hookResult;
    } catch {
      // Any error (including timeout) results in BLOCK
      const duration = performance.now() - start;
      const blockResult: HookResult = {
        allowed: false,
        action: "BLOCK",
        ruleId: null,
        message: "Hook evaluation timed out",
        duration,
      };

      if (logger) {
        const rules = engine.getRules(hook);
        const entry: HookLogEntry = {
          timestamp: new Date(),
          hook,
          sessionId: context.session.id,
          userId: context.session.userId,
          input: context.input,
          result: blockResult,
          rulesEvaluated: rules.map((r) => r.id),
        };
        logger.log(entry);
      }

      return blockResult;
    }
  }

  return { run };
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

/**
 * Create the default system policy rules.
 *
 * These rules enforce core security invariants that cannot be disabled:
 * - **no-write-down** (priority 1000): PRE_OUTPUT hook, blocks when session
 *   taint is higher than the target classification level.
 * - **untrusted-input** (priority 1000): PRE_CONTEXT_INJECTION hook, blocks
 *   input from UNTRUSTED sources.
 * - **tool-floor-enforcement** (priority 1000): PRE_TOOL_CALL hook, blocks
 *   tool calls when session taint is below the tool's minimum floor.
 * - **resource-write-down** (priority 1000): PRE_TOOL_CALL hook, blocks resource
 *   writes when session taint exceeds target resource classification.
 * - **resource-read-ceiling** (priority 1000): PRE_TOOL_CALL hook, blocks non-owner
 *   reads when resource classification exceeds user ceiling.
 * - **rate-limit-base** (priority 500): Basic rate limiting placeholder.
 *
 * @returns Array of default PolicyRule objects
 */
export function createDefaultRules(): PolicyRule[] {
  return [
    {
      id: "no-write-down",
      priority: 1000,
      hook: "PRE_OUTPUT",
      conditions: [
        {
          field: "write_down_violation",
          operator: "equals",
          value: "true",
        },
      ],
      action: "BLOCK",
      message: "Write-down violation: session taint exceeds target classification",
    },
    {
      id: "untrusted-input",
      priority: 1000,
      hook: "PRE_CONTEXT_INJECTION",
      conditions: [
        {
          field: "source_type",
          operator: "equals",
          value: "UNTRUSTED",
        },
      ],
      action: "BLOCK",
      message: "Untrusted input source blocked",
    },
    {
      id: "tool-floor-enforcement",
      priority: 1000,
      hook: "PRE_TOOL_CALL",
      conditions: [
        {
          field: "tool_floor_violation",
          operator: "equals",
          value: "true",
        },
      ],
      action: "BLOCK",
      message: "Tool requires minimum classification level",
    },
    {
      id: "resource-write-down",
      priority: 1000,
      hook: "PRE_TOOL_CALL",
      conditions: [
        {
          field: "resource_write_down_violation",
          operator: "equals",
          value: "true",
        },
      ],
      action: "BLOCK",
      message: "Write-down: session taint exceeds target resource classification",
    },
    {
      id: "resource-read-ceiling",
      priority: 1000,
      hook: "PRE_TOOL_CALL",
      conditions: [
        {
          field: "resource_read_ceiling_violation",
          operator: "equals",
          value: "true",
        },
      ],
      action: "BLOCK",
      message: "Resource classification exceeds session ceiling",
    },
    {
      id: "rate-limit-base",
      priority: 500,
      hook: "PRE_TOOL_CALL",
      conditions: [],
      action: "ALLOW",
      message: "Rate limit placeholder",
    },
  ];
}
