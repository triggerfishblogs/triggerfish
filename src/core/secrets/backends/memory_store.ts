/**
 * In-memory secret store.
 *
 * Useful for testing and environments without an OS keychain.
 * Secrets are lost when the process exits.
 *
 * @module
 */

import type { Result } from "../../types/classification.ts";
import type { SecretStore } from "./secret_store.ts";

/** Lookup a secret from an in-memory store. */
function lookupMemorySecret(
  store: Map<string, string>,
  name: string,
): Promise<Result<string, string>> {
  const value = store.get(name);
  if (value === undefined) {
    return Promise.resolve({ ok: false, error: `Secret '${name}' not found` });
  }
  return Promise.resolve({ ok: true, value });
}

/** Store a secret in an in-memory store. */
function storeMemorySecret(
  store: Map<string, string>,
  name: string,
  value: string,
): Promise<Result<true, string>> {
  store.set(name, value);
  return Promise.resolve({ ok: true, value: true });
}

/** Delete a secret from an in-memory store. */
function deleteMemorySecret(
  store: Map<string, string>,
  name: string,
): Promise<Result<true, string>> {
  if (!store.has(name)) {
    return Promise.resolve({ ok: false, error: `Secret '${name}' not found` });
  }
  store.delete(name);
  return Promise.resolve({ ok: true, value: true });
}

/** List all secret names from an in-memory store. */
function listMemorySecrets(
  store: Map<string, string>,
): Promise<Result<string[], string>> {
  return Promise.resolve({ ok: true, value: [...store.keys()] } as const);
}

/**
 * Create an in-memory secret store.
 *
 * Useful for testing and environments without an OS keychain.
 * Secrets are lost when the process exits.
 */
export function createMemorySecretStore(): SecretStore {
  const store = new Map<string, string>();
  return {
    getSecret: (name) => lookupMemorySecret(store, name),
    setSecret: (name, value) => storeMemorySecret(store, name, value),
    deleteSecret: (name) => deleteMemorySecret(store, name),
    listSecrets: () => listMemorySecrets(store),
  };
}
