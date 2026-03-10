/**
 * HashiCorp Vault secret provider module.
 *
 * Provides a complete Vault KV v2 integration including HTTP client,
 * multi-method authentication, and ExternalSecretProvider implementation.
 *
 * @module
 */

export { createVaultClient } from "./vault_client.ts";
export type { TokenAccessor, VaultClient } from "./vault_client.ts";

export { createVaultProvider } from "./vault_provider.ts";
export type { VaultProviderOptions } from "./vault_provider.ts";

export { createVaultAuth } from "./auth/mod.ts";
export type { VaultAuth } from "./auth/mod.ts";

export {
  collectVaultPatrolChecks,
  generateVaultHealthReport,
} from "./health.ts";
export type {
  PatrolCheckResult,
  VaultHealthCheckOptions,
  VaultHealthReport,
} from "./health.ts";

export { createLeaseManager } from "./lease_manager.ts";
export type {
  LeaseEntry,
  LeaseManager,
  LeaseManagerOptions,
} from "./lease_manager.ts";

export type {
  KvMetadata,
  KvReadResponse,
  KvWriteResponse,
  TokenInfo,
  VaultAuthMethod,
  VaultAuthResponse,
  VaultClientOptions,
  VaultHealth,
  VaultProviderConfig,
} from "./vault_types.ts";
