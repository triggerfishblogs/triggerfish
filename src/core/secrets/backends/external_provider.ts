/**
 * External secret provider interface.
 *
 * Extends `SecretStore` with health checks, metadata retrieval, and lease
 * management for external secret management services (Vault, AWS SM, etc.).
 * Local backends (keychain, encrypted file) implement `SecretStore` only.
 *
 * @module
 */

import type {
  ClassificationLevel,
  Result,
} from "../../types/classification.ts";
import type { SecretStore } from "./secret_store.ts";

/** Metadata attached to a secret retrieved from an external provider. */
export interface SecretMetadata {
  readonly version: number;
  readonly createdAt: string;
  readonly expiresAt?: string;
  readonly classification?: ClassificationLevel;
  readonly customMetadata?: Readonly<Record<string, string>>;
}

/** Health status reported by an external provider. */
export interface HealthStatus {
  readonly healthy: boolean;
  readonly latencyMs: number;
  readonly message?: string;
}

/**
 * Extended secret store interface for external providers.
 *
 * Adds health probing, metadata retrieval, and lease lifecycle
 * management on top of the base `SecretStore` contract.
 */
export interface ExternalSecretProvider extends SecretStore {
  /** Provider identifier (e.g., "vault", "aws-sm"). */
  readonly providerId: string;

  /** Check connectivity and authentication. */
  readonly probeHealth: () => Promise<Result<HealthStatus, string>>;

  /** Retrieve secret with metadata (version, lease, classification). */
  readonly fetchSecretWithMetadata: (
    name: string,
  ) => Promise<Result<{ value: string; metadata: SecretMetadata }, string>>;

  /** Renew a leased secret. No-op for static backends. */
  readonly renewLease: (name: string) => Promise<Result<true, string>>;

  /** Revoke a leased secret. */
  readonly revokeLease: (name: string) => Promise<Result<true, string>>;
}

/**
 * Type guard to detect external providers at runtime.
 *
 * Used by the resolver and cache layers to enable extended behavior
 * (metadata retrieval, health checks) without coupling to a specific provider.
 */
export function isExternalProvider(
  store: SecretStore,
): store is ExternalSecretProvider {
  return "providerId" in store && "probeHealth" in store;
}
