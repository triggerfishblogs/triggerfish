/**
 * Patrol health check system.
 *
 * Runs diagnostic checks against the Triggerfish runtime and reports
 * overall health as HEALTHY, WARNING, or CRITICAL.
 *
 * @module
 */

/** Overall health status. */
export type HealthStatus = "HEALTHY" | "WARNING" | "CRITICAL";

/** Result of a single health check. */
export interface PatrolCheckResult {
  readonly name: string;
  readonly status: HealthStatus;
  readonly message: string;
}

/** Full patrol report. */
export interface PatrolReport {
  readonly overall: HealthStatus;
  readonly checks: readonly PatrolCheckResult[];
}

/** Input state for patrol diagnostics. */
export interface PatrolInput {
  readonly gatewayRunning: boolean;
  readonly llmConnected: boolean;
  readonly channelsActive: number;
  readonly policyRulesLoaded: number;
  readonly skillsInstalled: number;
}

/** A patrol check runner. */
export interface PatrolChecker {
  /** Run all health checks and return a report. */
  runHealthChecks(): Promise<PatrolReport>;
}

/** Create a single boolean-driven patrol check result. */
function buildBooleanCheck(
  name: string,
  healthy: boolean,
  failStatus: HealthStatus,
  healthyMsg: string,
  failMsg: string,
): PatrolCheckResult {
  return {
    name,
    status: healthy ? "HEALTHY" : failStatus,
    message: healthy ? healthyMsg : failMsg,
  };
}

/** Create a single count-driven patrol check result. */
function buildCountCheck(
  name: string,
  count: number,
  failStatus: HealthStatus,
  healthyMsg: string,
  failMsg: string,
): PatrolCheckResult {
  return {
    name,
    status: count > 0 ? "HEALTHY" : failStatus,
    message: count > 0 ? healthyMsg : failMsg,
  };
}

/** Evaluate critical connectivity checks (gateway, LLM). */
function evaluateCriticalChecks(input: PatrolInput): PatrolCheckResult[] {
  return [
    buildBooleanCheck(
      "gateway",
      input.gatewayRunning,
      "CRITICAL",
      "Gateway is running",
      "Gateway is not running",
    ),
    buildBooleanCheck(
      "llm",
      input.llmConnected,
      "CRITICAL",
      "LLM provider connected",
      "LLM provider not connected",
    ),
  ];
}

/** Evaluate warning-level subsystem checks (channels, policy, skills). */
function evaluateSubsystemChecks(input: PatrolInput): PatrolCheckResult[] {
  return [
    buildCountCheck(
      "channels",
      input.channelsActive,
      "WARNING",
      `${input.channelsActive} channel(s) active`,
      "No active channels",
    ),
    buildCountCheck(
      "policy",
      input.policyRulesLoaded,
      "WARNING",
      `${input.policyRulesLoaded} policy rule(s) loaded`,
      "No policy rules loaded",
    ),
    buildCountCheck(
      "skills",
      input.skillsInstalled,
      "WARNING",
      `${input.skillsInstalled} skill(s) installed`,
      "No skills installed",
    ),
  ];
}

/** Evaluate all individual patrol checks from runtime input. */
function evaluatePatrolChecks(input: PatrolInput): PatrolCheckResult[] {
  return [
    ...evaluateCriticalChecks(input),
    ...evaluateSubsystemChecks(input),
  ];
}

/** Determine the worst health status from a set of check results. */
function computeOverallStatus(
  checks: readonly PatrolCheckResult[],
): HealthStatus {
  let overall: HealthStatus = "HEALTHY";
  for (const check of checks) {
    if (check.status === "CRITICAL") return "CRITICAL";
    if (check.status === "WARNING") overall = "WARNING";
  }
  return overall;
}

/**
 * Create a patrol health checker.
 *
 * Evaluates the provided runtime state and produces a diagnostic report.
 * The overall status is the worst status among all individual checks:
 * - Any CRITICAL check → overall CRITICAL
 * - Any WARNING check (and no CRITICAL) → overall WARNING
 * - All HEALTHY → overall HEALTHY
 *
 * @param input - Current runtime state to evaluate
 * @returns A PatrolChecker instance
 */
export function createPatrolCheck(input: PatrolInput): PatrolChecker {
  return {
    // deno-lint-ignore require-await
    async runHealthChecks(): Promise<PatrolReport> {
      const checks = evaluatePatrolChecks(input);
      return { overall: computeOverallStatus(checks), checks };
    },
  };
}
