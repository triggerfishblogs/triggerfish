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

// keychain/ — OS keychain integration
export {
  createKeychain,
  createLinuxKeychain,
  createMacKeychain,
  resolveDockerKeyPath,
  runCommand,
} from "./keychain/mod.ts";

// backends/ — storage backends and interfaces
export {
  createFileSecretStore,
  createMemorySecretStore,
  loadOrCreateMachineKey,
  SECRET_SERVICE_NAME,
} from "./backends/mod.ts";
export type {
  FileSecretStoreOptions,
  MachineKeyOptions,
  SecretStore,
} from "./backends/mod.ts";

// encrypted/ — AES-256-GCM encrypted file store
export { createEncryptedFileSecretStore } from "./encrypted/mod.ts";
export type { EncryptedFileSecretStoreOptions } from "./encrypted/mod.ts";

// validation/ — Docker secret store hardening checks
export {
  isPermissionSecure,
  parseMountPoints,
  verifyKeyFilePermissions,
  verifyMountPoint,
} from "./validation/mod.ts";
export type {
  MountCheckResult,
  PermissionCheckResult,
} from "./validation/mod.ts";

// resolver — secret reference resolution
export {
  findSecretRefs,
  resolveConfigSecrets,
  resolveSecretRef,
  resolveSecretRefs,
} from "./resolver.ts";
export type { ResolveResult } from "./resolver.ts";
