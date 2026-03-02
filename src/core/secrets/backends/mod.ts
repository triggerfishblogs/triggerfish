/**
 * Secret storage backends: interface, key management, file, and memory stores.
 *
 * @module
 */

export type { PermissionStrictness, SecretStore } from "./secret_store.ts";
export {
  resolvePermissionStrictness,
  SECRET_SERVICE_NAME,
} from "./secret_store.ts";
export { createMemorySecretStore } from "./memory_store.ts";
export { createFileSecretStore } from "./file_provider.ts";
export type { FileSecretStoreOptions } from "./file_provider.ts";
export { loadOrCreateMachineKey } from "./key_manager.ts";
export type { MachineKeyOptions } from "./key_manager.ts";
