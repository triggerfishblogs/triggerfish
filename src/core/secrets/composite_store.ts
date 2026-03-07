/**
 * Composite secret store — multi-backend dispatcher.
 *
 * Routes secret lookups to the correct backend based on a configurable
 * prefix map. Unprefixed names go to the default store.
 *
 * Prefix format: `"vault:"` maps `vault:secret/path` to the Vault provider
 * with path `secret/path`. Unprefixed names route to the default store.
 *
 * @module
 */

import type { Result } from "../types/classification.ts";
import type { ExternalSecretProvider } from "./backends/external_provider.ts";
import type { SecretStore } from "./backends/secret_store.ts";
import type { SecretCache, SecretFetcher } from "./cache/secret_cache.ts";

/** Options for constructing a composite store. */
export interface CompositeSecretStoreOptions {
  /** Default backend for unprefixed secret names. */
  readonly defaultStore: SecretStore;
  /** Prefix-routed external providers: "vault" -> VaultProvider. */
  readonly providers: ReadonlyMap<string, ExternalSecretProvider>;
  /** Optional cache for external providers. */
  readonly cache?: SecretCache;
}

/** Parse a prefixed secret name into provider key and path. */
function parsePrefixedName(
  name: string,
  providers: ReadonlyMap<string, ExternalSecretProvider>,
): { provider: ExternalSecretProvider; path: string } | undefined {
  for (const [prefix, provider] of providers) {
    const prefixWithColon = `${prefix}:`;
    if (name.startsWith(prefixWithColon)) {
      return { provider, path: name.slice(prefixWithColon.length) };
    }
  }
  return undefined;
}

/**
 * Create a composite secret store that routes lookups by prefix.
 *
 * - `vault:secret/path` routes to the Vault provider.
 * - Unprefixed names route to the default store.
 * - External providers use the optional cache layer.
 */
export function createCompositeSecretStore(
  options: CompositeSecretStoreOptions,
): SecretStore {
  const { defaultStore, providers, cache } = options;

  const getSecret = async (name: string): Promise<Result<string, string>> => {
    const parsed = parsePrefixedName(name, providers);
    if (!parsed) {
      return defaultStore.getSecret(name);
    }

    if (cache) {
      const fetcher: SecretFetcher = async (path) => {
        const result = await parsed.provider.getSecret(path);
        if (!result.ok) return result;
        return { ok: true, value: { value: result.value } };
      };
      const result = await cache.get(parsed.path, fetcher);
      if (!result.ok) return result;
      return { ok: true, value: result.value.value };
    }

    return parsed.provider.getSecret(parsed.path);
  };

  const setSecret = async (
    name: string,
    value: string,
  ): Promise<Result<true, string>> => {
    const parsed = parsePrefixedName(name, providers);
    if (!parsed) {
      return defaultStore.setSecret(name, value);
    }
    const result = await parsed.provider.setSecret(parsed.path, value);
    if (result.ok && cache) {
      cache.invalidate(parsed.path);
    }
    return result;
  };

  const deleteSecret = async (
    name: string,
  ): Promise<Result<true, string>> => {
    const parsed = parsePrefixedName(name, providers);
    if (!parsed) {
      return defaultStore.deleteSecret(name);
    }
    const result = await parsed.provider.deleteSecret(parsed.path);
    if (result.ok && cache) {
      cache.invalidate(parsed.path);
    }
    return result;
  };

  const listSecrets = async (): Promise<Result<string[], string>> => {
    const defaultResult = await defaultStore.listSecrets();
    if (!defaultResult.ok) return defaultResult;

    const allNames = [...defaultResult.value];

    for (const [prefix, provider] of providers) {
      const providerResult = await provider.listSecrets();
      if (providerResult.ok) {
        for (const name of providerResult.value) {
          allNames.push(`${prefix}:${name}`);
        }
      }
    }

    return { ok: true, value: allNames };
  };

  return { getSecret, setSecret, deleteSecret, listSecrets };
}
