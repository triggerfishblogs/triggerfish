/**
 * Notion token resolution from OS keychain.
 *
 * Looks up the `notion-api-key` secret via the provided SecretStore.
 * Returns an error with setup instructions if not found.
 *
 * @module
 */

import type { Result } from "../../core/types/classification.ts";
import type { SecretStore } from "../../core/secrets/keychain/keychain.ts";

/** Options for resolving a Notion token. */
export interface ResolveNotionTokenOptions {
  readonly secretStore: SecretStore;
}

/**
 * Resolve a Notion API token from the OS keychain.
 *
 * Supports both internal integration tokens (ntn_* or secret_*) and
 * OAuth2 access tokens. Returns an error with setup instructions if
 * the secret is not stored.
 */
export async function resolveNotionToken(
  options: ResolveNotionTokenOptions,
): Promise<Result<string, string>> {
  const keychainResult = await options.secretStore.getSecret("notion-api-key");
  if (keychainResult.ok) {
    return { ok: true, value: keychainResult.value };
  }

  return {
    ok: false,
    error:
      "Notion token not found in keychain. Run:\n" +
      "  triggerfish connect notion",
  };
}

/**
 * Validate that a token looks like a Notion integration token.
 *
 * Notion internal integration tokens start with `ntn_` or `secret_`.
 * Returns true if the token has a recognized prefix.
 */
export function isValidNotionTokenFormat(token: string): boolean {
  return token.startsWith("ntn_") || token.startsWith("secret_");
}
