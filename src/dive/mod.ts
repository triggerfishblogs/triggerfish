/**
 * Dive module — onboarding and diagnostics.
 *
 * Patrol health checks and setup wizard.
 *
 * @module
 */

export {
  createPatrolCheck,
  type HealthStatus,
  type PatrolChecker,
  type PatrolCheckResult,
  type PatrolInput,
  type PatrolReport,
} from "./patrol.ts";

export {
  type ChannelChoice,
  type ClassificationMode,
  createDirectoryTree,
  type DiveResult,
  generateConfig,
  generateSpine,
  type ProviderChoice,
  runWizard,
  type ToneChoice,
  type WizardAnswers,
} from "./wizard.ts";
