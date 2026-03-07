/**
 * ExternalSecretProvider interface and type guard tests.
 *
 * @module
 */

import { assertEquals } from "@std/assert";
import { isExternalProvider } from "../../../src/core/secrets/backends/external_provider.ts";
import { createMemorySecretStore } from "../../../src/core/secrets/backends/memory_store.ts";
import type { ExternalSecretProvider } from "../../../src/core/secrets/backends/external_provider.ts";


function createMockExternalProvider(): ExternalSecretProvider {
  const store = createMemorySecretStore();
  return {
    ...store,
    providerId: "mock",
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

Deno.test("isExternalProvider: returns false for a plain SecretStore", () => {
  const store = createMemorySecretStore();
  assertEquals(isExternalProvider(store), false);
});

Deno.test("isExternalProvider: returns true for an ExternalSecretProvider", () => {
  const provider = createMockExternalProvider();
  assertEquals(isExternalProvider(provider), true);
});

Deno.test("ExternalSecretProvider: implements full SecretStore contract", async () => {
  const provider = createMockExternalProvider();

  const setResult = await provider.setSecret("test-key", "test-value");
  assertEquals(setResult.ok, true);

  const getResult = await provider.getSecret("test-key");
  assertEquals(getResult.ok, true);
  if (getResult.ok) assertEquals(getResult.value, "test-value");

  const listResult = await provider.listSecrets();
  assertEquals(listResult.ok, true);
  if (listResult.ok) assertEquals(listResult.value.includes("test-key"), true);

  const deleteResult = await provider.deleteSecret("test-key");
  assertEquals(deleteResult.ok, true);
});

Deno.test("ExternalSecretProvider: probeHealth returns status", async () => {
  const provider = createMockExternalProvider();
  const result = await provider.probeHealth();
  assertEquals(result.ok, true);
  if (result.ok) {
    assertEquals(result.value.healthy, true);
    assertEquals(typeof result.value.latencyMs, "number");
  }
});

Deno.test("ExternalSecretProvider: fetchSecretWithMetadata returns value and metadata", async () => {
  const provider = createMockExternalProvider();
  await provider.setSecret("meta-key", "meta-value");

  const result = await provider.fetchSecretWithMetadata("meta-key");
  assertEquals(result.ok, true);
  if (result.ok) {
    assertEquals(result.value.value, "meta-value");
    assertEquals(result.value.metadata.version, 1);
    assertEquals(typeof result.value.metadata.createdAt, "string");
  }
});

Deno.test("ExternalSecretProvider: providerId is accessible", () => {
  const provider = createMockExternalProvider();
  assertEquals(provider.providerId, "mock");
});
