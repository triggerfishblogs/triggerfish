/**
 * Vault-specific type definitions.
 *
 * Types for Vault KV v2 API responses, health checks, token info,
 * and authentication configuration.
 *
 * @module
 */

import type { SsrfChecker } from "../../security/safe_fetch.ts";

/** Vault KV v2 read response data. */
export interface KvReadResponse {
  readonly data: Readonly<Record<string, string>>;
  readonly metadata: KvMetadata;
}

/** Vault KV v2 metadata for a secret version. */
export interface KvMetadata {
  readonly version: number;
  readonly created_time: string;
  readonly deletion_time: string;
  readonly destroyed: boolean;
  readonly custom_metadata?: Readonly<Record<string, string>>;
}

/** Vault KV v2 write response. */
export interface KvWriteResponse {
  readonly version: number;
  readonly created_time: string;
}

/** Vault system health response. */
export interface VaultHealth {
  readonly initialized: boolean;
  readonly sealed: boolean;
  readonly standby: boolean;
  readonly server_time_utc: number;
  readonly version: string;
  readonly cluster_name?: string;
}

/** Vault token lookup-self response. */
export interface TokenInfo {
  readonly accessor: string;
  readonly creation_time: number;
  readonly creation_ttl: number;
  readonly display_name: string;
  readonly expire_time: string | null;
  readonly explicit_max_ttl: number;
  readonly id: string;
  readonly num_uses: number;
  readonly orphan: boolean;
  readonly path: string;
  readonly policies: readonly string[];
  readonly renewable: boolean;
  readonly ttl: number;
  readonly type: string;
}

/** Vault auth login response (common shape for all auth methods). */
export interface VaultAuthResponse {
  readonly client_token: string;
  readonly accessor: string;
  readonly policies: readonly string[];
  readonly token_policies: readonly string[];
  readonly lease_duration: number;
  readonly renewable: boolean;
}

/** Vault client configuration. */
export interface VaultClientOptions {
  /** Vault server address (e.g., "https://vault.example.com:8200"). */
  readonly address: string;
  /** Vault Enterprise namespace. */
  readonly namespace?: string;
  /** Request timeout in milliseconds. Default: 10_000. */
  readonly requestTimeoutMs: number;
  /** Override SSRF checker for testing. Default: resolveAndCheck. */
  readonly ssrfChecker?: SsrfChecker;
}

/** Union type for authentication methods. */
export type VaultAuthMethod =
  | { readonly method: "token"; readonly token: string }
  | {
    readonly method: "approle";
    readonly roleId: string;
    readonly secretId: string;
    readonly mountPath?: string;
  }
  | {
    readonly method: "kubernetes";
    readonly role: string;
    readonly jwtPath?: string;
    readonly mountPath?: string;
  };

/** Vault provider configuration. */
export interface VaultProviderConfig {
  readonly client: VaultClientOptions;
  readonly auth: VaultAuthMethod;
  readonly defaultMount: string;
  readonly pathPrefix?: string;
}
