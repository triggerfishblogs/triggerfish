/**
 * Vault authentication methods.
 *
 * Provides factory for creating the appropriate auth handler
 * based on configuration (token, approle, kubernetes).
 *
 * @module
 */

import type { Result } from "../../../types/classification.ts";
import type { SsrfChecker } from "../../../security/safe_fetch.ts";
import type { VaultAuthMethod, VaultAuthResponse } from "../vault_types.ts";
import { createAppRoleAuth } from "./approle.ts";
import { createKubernetesAuth } from "./kubernetes.ts";
import { createTokenAuth } from "./token.ts";

export type { AppRoleAuthOptions } from "./approle.ts";
export type { KubernetesAuthOptions } from "./kubernetes.ts";
export type { TokenAuthOptions } from "./token.ts";

/** Unified auth handler interface. */
export interface VaultAuth {
  readonly authenticate: () => Promise<Result<VaultAuthResponse, string>>;
  readonly currentToken: () => string;
  readonly scheduleRenewal?: (
    onRenewFailed: () => void,
    initialTtlSeconds?: number,
  ) => void;
  readonly cancelRenewal?: () => void;
}

/**
 * Create a Vault auth handler based on the configured method.
 *
 * @param authConfig - Authentication method configuration
 * @param vaultAddress - Vault server address for auth endpoints
 * @param namespace - Optional Vault Enterprise namespace
 */
export function createVaultAuth(
  authConfig: VaultAuthMethod,
  vaultAddress: string,
  namespace?: string,
  ssrfChecker?: SsrfChecker,
): VaultAuth {
  switch (authConfig.method) {
    case "token":
      return createTokenAuth({ token: authConfig.token });

    case "approle": {
      const auth = createAppRoleAuth(
        {
          roleId: authConfig.roleId,
          secretId: authConfig.secretId,
          mountPath: authConfig.mountPath,
        },
        vaultAddress,
        namespace,
        ssrfChecker,
      );
      return {
        authenticate: auth.authenticate,
        currentToken: auth.currentToken,
        scheduleRenewal: auth.scheduleRenewal,
        cancelRenewal: auth.cancelRenewal,
      };
    }

    case "kubernetes": {
      const auth = createKubernetesAuth(
        {
          role: authConfig.role,
          jwtPath: authConfig.jwtPath,
          mountPath: authConfig.mountPath,
        },
        vaultAddress,
        namespace,
        ssrfChecker,
      );
      return {
        authenticate: auth.authenticate,
        currentToken: auth.currentToken,
      };
    }
  }
}
