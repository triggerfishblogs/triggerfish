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
  DEFAULT_MODELS,
  type DiveResult,
  PROVIDER_LABELS,
  type ProviderChoice,
  type SearchProviderChoice,
  type ToneChoice,
  type WizardAnswers,
  type WizardSection,
} from "./wizard_types.ts";

export {
  buildToneGuidelines,
  createDirectoryTree,
  generateConfig,
  generateSpine,
  generateTrigger,
} from "./wizard_generators.ts";

export { storeWizardSecrets } from "./wizard_secrets.ts";

export { runWizard } from "./wizard.ts";
export { runWizardSelective } from "./wizard_selective.ts";
