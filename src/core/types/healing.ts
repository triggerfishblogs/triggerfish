/**
 * Shared self-healing workflow types — used by both workflow/ and gateway/.
 *
 * These types define the configuration surface, event taxonomy, and
 * intervention categories for the self-healing workflow feature.
 * @module
 */

/** Event types emitted by the workflow engine during execution. */
export type HealingEventType =
  | "STEP_STARTED"
  | "STEP_COMPLETED"
  | "STEP_FAILED"
  | "STEP_SKIPPED"
  | "BRANCH_TAKEN"
  | "WORKFLOW_PAUSED"
  | "WORKFLOW_RESUMED"
  | "WORKFLOW_COMPLETED"
  | "WORKFLOW_FAULTED";

/** Triage category assigned by the lead agent to each intervention. */
export type InterventionCategory =
  | "transient_retry"
  | "runtime_workaround"
  | "structural_fix"
  | "plugin_gap"
  | "unresolvable";

/** Pause behavior when the lead requests an intervention pause. */
export type PauseOnIntervention = "always" | "never" | "blocking_only";

/** Policy applied when a pause timeout expires. */
export type PauseTimeoutPolicy =
  | "escalate_and_halt"
  | "escalate_and_skip"
  | "escalate_and_fail";

/** Notification event types. */
export type HealingNotifyEvent =
  | "intervention"
  | "escalation"
  | "approval_required";

/** Soft signal thresholds for lead agent evaluation. */
export interface SoftSignalConfig {
  /** Alert when a step returns empty but prior successful runs had data. */
  readonly empty_output_from_prior_success?: boolean;
  /** Alert when step duration exceeds N times historical average. */
  readonly duration_multiplier_threshold?: number;
  /** Alert when output shape differs from prior successful runs. */
  readonly schema_drift?: boolean;
}

/** Self-healing configuration block from workflow metadata. */
export interface SelfHealingConfig {
  readonly enabled: boolean;
  readonly pause_on_intervention: PauseOnIntervention;
  readonly pause_timeout_seconds: number;
  readonly pause_timeout_policy: PauseTimeoutPolicy;
  readonly retry_budget: number;
  readonly approval_required: boolean;
  readonly notify_on: readonly HealingNotifyEvent[];
  readonly run_history_window: number;
  readonly soft_signals?: SoftSignalConfig;
}

/** Overall health assessment of a workflow. */
export type WorkflowHealth = "healthy" | "degraded" | "failing" | "unknown";

/** Current phase of the healing lead agent. */
export type HealingPhase =
  | "WATCHING"
  | "TRIAGING"
  | "RETRYING"
  | "APPLYING_WORKAROUND"
  | "PROPOSING_FIX"
  | "AUTHORING_PLUGIN"
  | "ESCALATING";
