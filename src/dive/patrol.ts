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
      const checks: PatrolCheckResult[] = [];

      // Gateway check
      checks.push({
        name: "gateway",
        status: input.gatewayRunning ? "HEALTHY" : "CRITICAL",
        message: input.gatewayRunning
          ? "Gateway is running"
          : "Gateway is not running",
      });

      // LLM connectivity check
      checks.push({
        name: "llm",
        status: input.llmConnected ? "HEALTHY" : "CRITICAL",
        message: input.llmConnected
          ? "LLM provider connected"
          : "LLM provider not connected",
      });

      // Channels check
      checks.push({
        name: "channels",
        status: input.channelsActive > 0 ? "HEALTHY" : "WARNING",
        message: input.channelsActive > 0
          ? `${input.channelsActive} channel(s) active`
          : "No active channels",
      });

      // Policy rules check
      checks.push({
        name: "policy",
        status: input.policyRulesLoaded > 0 ? "HEALTHY" : "WARNING",
        message: input.policyRulesLoaded > 0
          ? `${input.policyRulesLoaded} policy rule(s) loaded`
          : "No policy rules loaded",
      });

      // Skills check
      checks.push({
        name: "skills",
        status: input.skillsInstalled > 0 ? "HEALTHY" : "WARNING",
        message: input.skillsInstalled > 0
          ? `${input.skillsInstalled} skill(s) installed`
          : "No skills installed",
      });

      // Determine overall status (worst wins)
      let overall: HealthStatus = "HEALTHY";
      for (const check of checks) {
        if (check.status === "CRITICAL") {
          overall = "CRITICAL";
          break;
        }
        if (check.status === "WARNING") {
          overall = "WARNING";
        }
      }

      return { overall, checks };
    },
  };
}
