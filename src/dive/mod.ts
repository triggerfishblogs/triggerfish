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

export { type VerifyResult, verifyProvider } from "./verify.ts";

export {
  type ChannelChoice,
  createDirectoryTree,
  type DiveResult,
  generateConfig,
  generateSpine,
  generateTrigger,
  type ProviderChoice,
  runWizard,
  runWizardSelective,
  type ToneChoice,
  type WizardAnswers,
} from "./wizard.ts";
