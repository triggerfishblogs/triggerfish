/**
 * Default system policy rules.
 *
 * These rules enforce core security invariants that cannot be disabled:
 * write-down prevention, untrusted input blocking, tool floor enforcement,
 * resource classification gating, and rate limiting placeholders.
 *
 * @module
 */

import type { PolicyRule } from "../rules.ts";

/** Build the no-write-down enforcement rule for PRE_OUTPUT. */
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

/** Build the untrusted input blocking rule for PRE_CONTEXT_INJECTION. */
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

/** Build the tool floor enforcement rule for PRE_TOOL_CALL. */
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

/** Build the resource write-down prevention rule for PRE_TOOL_CALL. */
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

/** Build the resource read ceiling enforcement rule for PRE_TOOL_CALL. */
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

/** Build the rate limit placeholder rule for PRE_TOOL_CALL. */
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
