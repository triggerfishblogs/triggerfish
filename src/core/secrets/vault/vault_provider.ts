/**
 * Vault secret provider — implements ExternalSecretProvider.
 *
 * Wraps the Vault HTTP client and auth layer into a complete
 * `ExternalSecretProvider` implementation for the KV v2 engine.
 *
 * @module
 */

import type { Result } from "../../types/classification.ts";
import { createLogger } from "../../logger/logger.ts";
import type {
  ExternalSecretProvider,
  HealthStatus,
  SecretMetadata,
} from "../backends/external_provider.ts";
import type { VaultClient } from "./vault_client.ts";
import type { VaultAuth } from "./auth/mod.ts";

const log = createLogger("vault:provider");

/** Options for creating a Vault secret provider. */
export interface VaultProviderOptions {
  /** Vault HTTP client instance. */
  readonly client: VaultClient;
  /** Authentication handler. */
  readonly auth: VaultAuth;
  /** Default KV v2 mount point. Default: "secret". */
  readonly defaultMount: string;
  /** Optional path prefix prepended to all lookups. */
  readonly pathPrefix?: string;
}

/** Separator for key extraction from Vault path: `path#key`. */
const KEY_SEPARATOR = "#";

/** Parse a secret name into mount, path, and optional key. */
function parseSecretPath(
  name: string,
  defaultMount: string,
  pathPrefix?: string,
): { mount: string; path: string; key?: string } {
  let remaining = name;
  let key: string | undefined;

  const hashIdx = remaining.indexOf(KEY_SEPARATOR);
  if (hashIdx !== -1) {
    key = remaining.slice(hashIdx + 1);
    remaining = remaining.slice(0, hashIdx);
  }

  const prefix = pathPrefix ?? "";
  const fullPath = prefix + remaining;

  return { mount: defaultMount, path: fullPath, key };
}

/**
 * Create a Vault-backed ExternalSecretProvider.
 *
 * Authenticates on first use and manages the Vault token lifecycle.
 * Secrets are addressed as `path#key` where `key` selects a field
 * from the KV v2 data map. Without `#key`, returns the `value` field
 * or the first available field.
 */
export function createVaultProvider(
  options: VaultProviderOptions,
): ExternalSecretProvider {
  const { client, auth, defaultMount, pathPrefix } = options;
  let authenticated = false;

  let authInFlight: Promise<Result<true, string>> | undefined;

  async function doAuthenticate(): Promise<Result<true, string>> {
    log.info("Vault authentication attempt", { operation: "ensureAuthenticated" });
    const result = await auth.authenticate();
    if (!result.ok) {
      log.warn("Vault authentication failed", { operation: "ensureAuthenticated", err: result.error });
      return result;
    }
    authenticated = true;
    log.info("Vault authentication succeeded", { operation: "ensureAuthenticated" });
    if (auth.scheduleRenewal) {
      auth.scheduleRenewal(
        () => { authenticated = false; },
        result.value.lease_duration,
      );
    }
    return { ok: true, value: true };
  }

  function ensureAuthenticated(): Promise<Result<true, string>> {
    if (authenticated && auth.currentToken()) {
      return Promise.resolve({ ok: true as const, value: true as const });
    }
    if (authInFlight) return authInFlight;
    authInFlight = doAuthenticate().finally(() => { authInFlight = undefined; });
    return authInFlight;
  }

  function extractValue(
    data: Readonly<Record<string, string>>,
    key?: string,
  ): Result<string, string> {
    if (key) {
      const value = data[key];
      if (value === undefined) {
        return {
          ok: false,
          error: `Secret key '${key}' not found in Vault response`,
        };
      }
      return { ok: true, value };
    }

    if ("value" in data) {
      return { ok: true, value: data["value"] };
    }

    const keys = Object.keys(data);
    if (keys.length === 0) {
      return { ok: false, error: "Vault secret contains no data fields" };
    }
    return { ok: true, value: data[keys[0]] };
  }

  const getSecret = async (name: string): Promise<Result<string, string>> => {
    const authResult = await ensureAuthenticated();
    if (!authResult.ok) return authResult;

    const { mount, path, key } = parseSecretPath(
      name,
      defaultMount,
      pathPrefix,
    );
    const readResult = await client.kvRead(mount, path);
    if (!readResult.ok) return readResult;

    return extractValue(readResult.value.data, key);
  };

  const setSecret = async (
    name: string,
    value: string,
  ): Promise<Result<true, string>> => {
    const authResult = await ensureAuthenticated();
    if (!authResult.ok) return authResult;

    const { mount, path, key } = parseSecretPath(
      name,
      defaultMount,
      pathPrefix,
    );
    const dataKey = key ?? "value";
    const putResult = await client.kvPut(mount, path, { [dataKey]: value });
    if (!putResult.ok) return putResult;
    return { ok: true, value: true };
  };

  const deleteSecret = async (
    name: string,
  ): Promise<Result<true, string>> => {
    const authResult = await ensureAuthenticated();
    if (!authResult.ok) return authResult;

    const { mount, path } = parseSecretPath(name, defaultMount, pathPrefix);
    return client.kvDelete(mount, path);
  };

  const listSecrets = async (): Promise<Result<string[], string>> => {
    const authResult = await ensureAuthenticated();
    if (!authResult.ok) return authResult;

    const listPath = pathPrefix ?? "";
    return client.kvList(defaultMount, listPath);
  };

  const probeHealth = async (): Promise<Result<HealthStatus, string>> => {
    const start = Date.now();
    const result = await client.healthCheck();
    const latencyMs = Date.now() - start;

    if (!result.ok) {
      return {
        ok: true,
        value: {
          healthy: false,
          latencyMs,
          message: result.error,
        },
      };
    }

    const health = result.value;
    return {
      ok: true,
      value: {
        healthy: health.initialized && !health.sealed,
        latencyMs,
        message: health.sealed
          ? "Vault is sealed"
          : health.initialized
          ? "Vault is healthy"
          : "Vault is not initialized",
      },
    };
  };

  const fetchSecretWithMetadata: ExternalSecretProvider["fetchSecretWithMetadata"] =
    async (name) => {
      const authResult = await ensureAuthenticated();
      if (!authResult.ok) return authResult;

      const { mount, path, key } = parseSecretPath(
        name,
        defaultMount,
        pathPrefix,
      );
      const readResult = await client.kvRead(mount, path);
      if (!readResult.ok) return readResult;

      const valueResult = extractValue(readResult.value.data, key);
      if (!valueResult.ok) return valueResult;

      const vaultMeta = readResult.value.metadata;
      const metadata: SecretMetadata = {
        version: vaultMeta.version,
        createdAt: vaultMeta.created_time,
        customMetadata: vaultMeta.custom_metadata,
      };

      return {
        ok: true,
        value: { value: valueResult.value, metadata },
      };
    };

  // KV v2 secrets are versioned, not leased — no lease renewal or revocation needed.
  // These no-ops satisfy the ExternalSecretProvider interface for lease-based backends.
  const renewLease = (
    _name: string,
  ): Promise<Result<true, string>> => {
    return Promise.resolve({ ok: true, value: true });
  };

  const revokeLease = (
    _name: string,
  ): Promise<Result<true, string>> => {
    return Promise.resolve({ ok: true, value: true });
  };

  return {
    providerId: "vault",
    getSecret,
    setSecret,
    deleteSecret,
    listSecrets,
    probeHealth,
    fetchSecretWithMetadata,
    renewLease,
    revokeLease,
  };
}
