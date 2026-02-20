/**
 * GitHub PAT resolution from OS keychain.
 *
 * Looks up the `github-pat` secret via the provided SecretStore.
 * Returns an error with setup instructions if not found.
 *
 * @module
 */

import type { Result } from "../../core/types/classification.ts";
import type { SecretStore } from "../../secrets/keychain.ts";

/** Options for resolving a GitHub token. */
export interface ResolveGitHubTokenOptions {
  readonly secretStore: SecretStore;
}

/**
 * Resolve a GitHub Personal Access Token from the OS keychain.
 *
 * Returns an error with setup instructions if the secret is not stored.
 */
export async function resolveGitHubToken(
  options: ResolveGitHubTokenOptions,
): Promise<Result<string, string>> {
  const keychainResult = await options.secretStore.getSecret("github-pat");
  if (keychainResult.ok) {
    return { ok: true, value: keychainResult.value };
  }

  return {
    ok: false,
    error:
      "GitHub token not found in keychain. Run:\n" +
      "  triggerfish connect github",
  };
}
