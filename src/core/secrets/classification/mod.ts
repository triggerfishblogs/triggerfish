/**
 * Secret classification module.
 *
 * Maps secret paths to classification levels and enforces
 * access controls via the SECRET_ACCESS hook.
 *
 * @module
 */

export { createSecretClassifier } from "./secret_classifier.ts";
export type {
  ClassificationMapping,
  SecretClassifier,
  SecretClassifierConfig,
} from "./secret_classifier.ts";

export { createSecretAccessGate } from "./secret_access_gate.ts";
export type {
  SecretAccessGate,
  SecretAccessGateOptions,
  SecretAccessHookDispatcher,
  SecretAccessHookInput,
  SecretAccessHookResult,
} from "./secret_access_gate.ts";

export { createGatedKeychain } from "./gated_keychain.ts";
export type { GatedKeychainOptions } from "./gated_keychain.ts";
