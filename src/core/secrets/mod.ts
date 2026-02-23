/**
 * Core secrets management module.
 *
 * Provides OS keychain integration for secure secret storage
 * with Linux (libsecret), macOS (Keychain), and in-memory fallback.
 * Also supports environment variable and file-backed stores for
 * Docker and headless environments.
 *
 * @module
 */

export { createKeychain } from "./keychain.ts";
export { createMemorySecretStore } from "./memory_store.ts";
export type { SecretStore } from "./secret_store.ts";
export { SECRET_SERVICE_NAME } from "./secret_store.ts";
export { createLinuxKeychain } from "./linux_keychain.ts";
export { createMacKeychain } from "./mac_keychain.ts";
export { runCommand } from "./command_runner.ts";
export { createFileSecretStore } from "./file_provider.ts";
export type { FileSecretStoreOptions } from "./file_provider.ts";
export { createEncryptedFileSecretStore } from "./encrypted_file_provider.ts";
export type { EncryptedFileSecretStoreOptions } from "./encrypted_file_provider.ts";
export { loadOrCreateMachineKey } from "./key_manager.ts";
export type { MachineKeyOptions } from "./key_manager.ts";
export {
  findSecretRefs,
  resolveConfigSecrets,
  resolveSecretRef,
  resolveSecretRefs,
} from "./resolver.ts";
export type { ResolveResult } from "./resolver.ts";
