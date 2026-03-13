/**
 * Workflow healing subsystem — types, validation, versioning, and pause control.
 * @module
 */

export type {
  BranchTakenEvent,
  LastRunOutcome,
  PendingApprovalSummary,
  RichWorkflowEvent,
  RuntimeDeviation,
  StepCompletedEvent,
  StepFailedEvent,
  StepMetadata,
  StepSkippedEvent,
  StepStartedEvent,
  VersionStatus,
  WorkflowCompletedEvent,
  WorkflowFaultedEvent,
  WorkflowPausedEvent,
  WorkflowResumedEvent,
  WorkflowState,
  WorkflowStatusDetail,
  WorkflowStatusEvent,
  WorkflowVersion,
} from "./types.ts";

export {
  enforceStepMetadataRequirements,
  parseSelfHealingConfig,
  validateStepMetadata,
} from "./metadata_validator.ts";

export { createWorkflowVersionStore } from "./version_store.ts";
export type { WorkflowVersionStore } from "./version_store.ts";

export { createScopedPauseController } from "./scoped_pause.ts";
export type { ScopedPauseController } from "./scoped_pause.ts";
