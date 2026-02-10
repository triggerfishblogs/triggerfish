/**
 * Secrets management module.
 *
 * Provides OS keychain integration for secure secret storage
 * with Linux (libsecret), macOS (Keychain), and in-memory fallback.
 *
 * @module
 */

export { createKeychain, createMemorySecretStore } from "./keychain.ts";
export type { SecretStore } from "./keychain.ts";
