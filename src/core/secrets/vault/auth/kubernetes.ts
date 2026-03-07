/**
 * Kubernetes service account authentication for Vault.
 *
 * Reads the projected service account JWT and exchanges it for a
 * Vault token. Token renewal follows the same pattern as AppRole.
 *
 * @module
 */

import type { Result } from "../../../types/classification.ts";
import type { VaultAuthResponse } from "../vault_types.ts";
import { createLogger } from "../../../logger/logger.ts";

const log = createLogger("vault:kubernetes");

/** Options for Kubernetes authentication. */
export interface KubernetesAuthOptions {
  /** Vault role bound to the Kubernetes service account. */
  readonly role: string;
  /** Path to the projected service account JWT. Default: standard K8s path. */
  readonly jwtPath?: string;
  /** Auth mount path. Default: "kubernetes". */
  readonly mountPath?: string;
}

/** Default path for the Kubernetes service account token. */
const DEFAULT_JWT_PATH =
  "/var/run/secrets/kubernetes.io/serviceaccount/token";

/**
 * Create a Kubernetes service account authenticator.
 *
 * Reads the service account JWT from the projected volume,
 * exchanges it for a Vault token, and manages token lifecycle.
 */
export function createKubernetesAuth(
  options: KubernetesAuthOptions,
  vaultAddress: string,
  namespace?: string,
): {
  authenticate: () => Promise<Result<VaultAuthResponse, string>>;
  currentToken: () => string;
} {
  const jwtPath = options.jwtPath ?? DEFAULT_JWT_PATH;
  const mountPath = options.mountPath ?? "kubernetes";
  let token = "";

  async function readJwt(): Promise<Result<string, string>> {
    try {
      const jwt = await Deno.readTextFile(jwtPath);
      return { ok: true, value: jwt.trim() };
    } catch (err: unknown) {
      log.warn("Kubernetes JWT read failed", { operation: "readJwt", jwtPath, err });
      return {
        ok: false,
        error: `Kubernetes JWT read failed at ${jwtPath}: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  }

  async function authenticate(): Promise<Result<VaultAuthResponse, string>> {
    const jwtResult = await readJwt();
    if (!jwtResult.ok) return jwtResult;

    const base = vaultAddress.endsWith("/")
      ? vaultAddress.slice(0, -1)
      : vaultAddress;
    const url = `${base}/v1/auth/${mountPath}/login`;

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (namespace) {
      headers["X-Vault-Namespace"] = namespace;
    }

    try {
      const response = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify({
          role: options.role,
          jwt: jwtResult.value,
        }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        const errors = (body as { errors?: string[] }).errors ?? [];
        return {
          ok: false,
          error: `Kubernetes auth login failed (${response.status}): ${
            errors.join(", ") || "unknown error"
          }`,
        };
      }

      const body = await response.json();
      const auth = body.auth as VaultAuthResponse;
      token = auth.client_token;
      return { ok: true, value: auth };
    } catch (err: unknown) {
      log.warn("Kubernetes auth login request failed", { operation: "authenticate", err });
      return {
        ok: false,
        error: `Kubernetes auth login request failed: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  }

  return {
    authenticate,
    currentToken: () => token,
  };
}
