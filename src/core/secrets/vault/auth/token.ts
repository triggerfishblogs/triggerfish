/**
 * Static token authentication for Vault.
 *
 * Simple auth method suitable for development and CI environments
 * where tokens are short-lived and injected via environment.
 *
 * @module
 */

import type { Result } from "../../../types/classification.ts";
import type { VaultAuthResponse } from "../vault_types.ts";

/** Options for static token authentication. */
export interface TokenAuthOptions {
  /** Vault token, typically from VAULT_TOKEN env var. */
  readonly token: string;
}

/**
 * Create a static token authenticator.
 *
 * No renewal logic — the token is used as-is.
 */
export function createTokenAuth(
  options: TokenAuthOptions,
): {
  authenticate: () => Promise<Result<VaultAuthResponse, string>>;
  currentToken: () => string;
} {
  return {
    authenticate: () =>
      Promise.resolve({
        ok: true as const,
        value: {
          client_token: options.token,
          accessor: "",
          policies: [],
          token_policies: [],
          lease_duration: 0,
          renewable: false,
        },
      }),
    currentToken: () => options.token,
  };
}
