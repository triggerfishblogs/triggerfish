/**
 * Composite secret store tests — prefix routing and default fallback.
 *
 * @module
 */

import { assertEquals } from "@std/assert";
import { createCompositeSecretStore } from "../../../src/core/secrets/composite_store.ts";
import { createMemorySecretStore } from "../../../src/core/secrets/backends/memory_store.ts";
import type { ExternalSecretProvider } from "../../../src/core/secrets/backends/external_provider.ts";

function createMockProvider(
  id: string,
): ExternalSecretProvider {
  const store = createMemorySecretStore();
  return {
    ...store,
    providerId: id,
    probeHealth: () =>
      Promise.resolve({
        ok: true as const,
        value: { healthy: true, latencyMs: 1 },
      }),
    fetchSecretWithMetadata: async (name: string) => {
      const result = await store.getSecret(name);
      if (!result.ok) return result;
      return {
        ok: true as const,
        value: {
          value: result.value,
          metadata: { version: 1, createdAt: new Date().toISOString() },
        },
      };
    },
    renewLease: () =>
      Promise.resolve({ ok: true as const, value: true as const }),
    revokeLease: () =>
      Promise.resolve({ ok: true as const, value: true as const }),
  };
}

Deno.test("composite: routes unprefixed names to default store", async () => {
  const defaultStore = createMemorySecretStore();
  await defaultStore.setSecret("api-key", "default-value");

  const composite = createCompositeSecretStore({
    defaultStore,
    providers: new Map(),
  });

  const result = await composite.getSecret("api-key");
  assertEquals(result.ok, true);
  if (result.ok) assertEquals(result.value, "default-value");
});

Deno.test("composite: routes prefixed names to matching provider", async () => {
  const defaultStore = createMemorySecretStore();
  const vaultProvider = createMockProvider("vault");
  await vaultProvider.setSecret("database/creds", "vault-secret");

  const composite = createCompositeSecretStore({
    defaultStore,
    providers: new Map([["vault", vaultProvider]]),
  });

  const result = await composite.getSecret("vault:database/creds");
  assertEquals(result.ok, true);
  if (result.ok) assertEquals(result.value, "vault-secret");
});

Deno.test("composite: default store not affected by prefixed writes", async () => {
  const defaultStore = createMemorySecretStore();
  const vaultProvider = createMockProvider("vault");

  const composite = createCompositeSecretStore({
    defaultStore,
    providers: new Map([["vault", vaultProvider]]),
  });

  await composite.setSecret("vault:my-secret", "vault-value");
  await composite.setSecret("local-secret", "local-value");

  const vaultResult = await vaultProvider.getSecret("my-secret");
  assertEquals(vaultResult.ok, true);
  if (vaultResult.ok) assertEquals(vaultResult.value, "vault-value");

  const localResult = await defaultStore.getSecret("local-secret");
  assertEquals(localResult.ok, true);
  if (localResult.ok) assertEquals(localResult.value, "local-value");
});

Deno.test("composite: listSecrets aggregates from all stores", async () => {
  const defaultStore = createMemorySecretStore();
  await defaultStore.setSecret("local-a", "a");

  const vaultProvider = createMockProvider("vault");
  await vaultProvider.setSecret("remote-b", "b");

  const composite = createCompositeSecretStore({
    defaultStore,
    providers: new Map([["vault", vaultProvider]]),
  });

  const result = await composite.listSecrets();
  assertEquals(result.ok, true);
  if (result.ok) {
    assertEquals(result.value.includes("local-a"), true);
    assertEquals(result.value.includes("vault:remote-b"), true);
  }
});

Deno.test("composite: delete routes to correct provider", async () => {
  const defaultStore = createMemorySecretStore();
  const vaultProvider = createMockProvider("vault");
  await vaultProvider.setSecret("to-delete", "value");

  const composite = createCompositeSecretStore({
    defaultStore,
    providers: new Map([["vault", vaultProvider]]),
  });

  const result = await composite.deleteSecret("vault:to-delete");
  assertEquals(result.ok, true);

  const getResult = await vaultProvider.getSecret("to-delete");
  assertEquals(getResult.ok, false);
});

Deno.test("composite: returns error for missing prefixed secret", async () => {
  const defaultStore = createMemorySecretStore();
  const vaultProvider = createMockProvider("vault");

  const composite = createCompositeSecretStore({
    defaultStore,
    providers: new Map([["vault", vaultProvider]]),
  });

  const result = await composite.getSecret("vault:nonexistent");
  assertEquals(result.ok, false);
});
