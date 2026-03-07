/**
 * AppRole authentication for Vault.
 *
 * Recommended for production deployments. Authenticates with role_id +
 * secret_id, receives a token with TTL, and schedules renewal at 75% TTL.
 *
 * @module
 */

import type { Result } from "../../../types/classification.ts";
import type { VaultAuthResponse } from "../vault_types.ts";
import { createLogger } from "../../../logger/logger.ts";

const log = createLogger("vault:approle");

/** Options for AppRole authentication. */
export interface AppRoleAuthOptions {
  /** AppRole role ID, typically from VAULT_ROLE_ID env var. */
  readonly roleId: string;
  /** AppRole secret ID, typically from VAULT_SECRET_ID env var. */
  readonly secretId: string;
  /** Auth mount path. Default: "approle". */
  readonly mountPath?: string;
}

/** Renewal threshold as fraction of TTL. */
const RENEWAL_THRESHOLD = 0.75;

/**
 * Create an AppRole authenticator.
 *
 * Performs login against Vault's AppRole auth method and manages
 * token lifecycle with automatic renewal at 75% of TTL.
 */
export function createAppRoleAuth(
  options: AppRoleAuthOptions,
  vaultAddress: string,
  namespace?: string,
): {
  authenticate: () => Promise<Result<VaultAuthResponse, string>>;
  currentToken: () => string;
  scheduleRenewal: (
    onRenewFailed: () => void,
    initialTtlSeconds?: number,
  ) => void;
  cancelRenewal: () => void;
} {
  const mountPath = options.mountPath ?? "approle";
  let token = "";
  let renewalTimer: ReturnType<typeof setTimeout> | undefined;

  function buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (namespace) {
      headers["X-Vault-Namespace"] = namespace;
    }
    if (token) {
      headers["X-Vault-Token"] = token;
    }
    return headers;
  }

  async function login(): Promise<Result<VaultAuthResponse, string>> {
    const base = vaultAddress.endsWith("/")
      ? vaultAddress.slice(0, -1)
      : vaultAddress;
    const url = `${base}/v1/auth/${mountPath}/login`;

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: buildHeaders(),
        body: JSON.stringify({
          role_id: options.roleId,
          secret_id: options.secretId,
        }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        const errors = (body as { errors?: string[] }).errors ?? [];
        return {
          ok: false,
          error: `AppRole login failed (${response.status}): ${
            errors.join(", ") || "unknown error"
          }`,
        };
      }

      const body = await response.json();
      const auth = body.auth as VaultAuthResponse;
      token = auth.client_token;
      return { ok: true, value: auth };
    } catch (err: unknown) {
      log.warn("AppRole login request failed", { operation: "login", err });
      return {
        ok: false,
        error: `AppRole login request failed: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  }

  async function renewToken(): Promise<Result<VaultAuthResponse, string>> {
    const base = vaultAddress.endsWith("/")
      ? vaultAddress.slice(0, -1)
      : vaultAddress;
    const url = `${base}/v1/auth/token/renew-self`;

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: buildHeaders(),
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        return {
          ok: false,
          error: `Token renewal failed with status ${response.status}`,
        };
      }

      const body = await response.json();
      const auth = body.auth as VaultAuthResponse;
      token = auth.client_token;
      return { ok: true, value: auth };
    } catch (err: unknown) {
      log.warn("Token renewal request failed", { operation: "renewToken", err });
      return {
        ok: false,
        error: `Token renewal request failed: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  }

  function scheduleRenewal(
    onRenewFailed: () => void,
    initialTtlSeconds?: number,
  ): void {
    cancelRenewal();

    const renewalFn = async () => {
      const renewResult = await renewToken();
      if (renewResult.ok) {
        const ttlMs = renewResult.value.lease_duration * 1000;
        const delayMs = ttlMs * RENEWAL_THRESHOLD;
        if (delayMs > 0) {
          renewalTimer = setTimeout(renewalFn, delayMs);
        }
        return;
      }

      const reAuthResult = await login();
      if (reAuthResult.ok) {
        const ttlMs = reAuthResult.value.lease_duration * 1000;
        const delayMs = ttlMs * RENEWAL_THRESHOLD;
        if (delayMs > 0) {
          renewalTimer = setTimeout(renewalFn, delayMs);
        }
        return;
      }

      onRenewFailed();
    };

    const initialDelayMs = initialTtlSeconds
      ? initialTtlSeconds * 1000 * RENEWAL_THRESHOLD
      : 0;
    renewalTimer = setTimeout(renewalFn, initialDelayMs);
  }

  function cancelRenewal(): void {
    if (renewalTimer !== undefined) {
      clearTimeout(renewalTimer);
      renewalTimer = undefined;
    }
  }

  return {
    authenticate: login,
    currentToken: () => token,
    scheduleRenewal,
    cancelRenewal,
  };
}
