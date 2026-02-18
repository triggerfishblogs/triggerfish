/**
 * Secrets management module.
 *
 * Provides OS keychain integration for secure secret storage
 * with Linux (libsecret), macOS (Keychain), and in-memory fallback.
 * Also supports environment variable and file-backed stores for
 * Docker and headless environments.
 *
 * @module
 */

export { createKeychain, createMemorySecretStore } from "./keychain.ts";
export type { SecretStore } from "./keychain.ts";
export { createFileSecretStore } from "./file_provider.ts";
export type { FileSecretStoreOptions } from "./file_provider.ts";
export { createEncryptedFileSecretStore } from "./encrypted_file_provider.ts";
export type { EncryptedFileSecretStoreOptions } from "./encrypted_file_provider.ts";
export { loadOrCreateMachineKey } from "./key_manager.ts";
export type { MachineKeyOptions } from "./key_manager.ts";
export { resolveSecretRefs } from "./resolver.ts";
export type { ResolveResult } from "./resolver.ts";
export {
  createSecretToolExecutor,
  getSecretToolDefinitions,
  SECRET_TOOLS_SYSTEM_PROMPT,
} from "./tools.ts";
export type { SecretPromptCallback } from "./tools.ts";
