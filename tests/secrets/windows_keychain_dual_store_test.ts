/**
 * @module
 * Windows DPAPI keychain — dual-store fallback tests.
 *
 * Verifies that when DPAPI getSecret fails (cross-user context, e.g.
 * Windows service running as LocalSystem), the encrypted-file backend
 * is used as a fallback. Also tests dual-write and merged listing.
 */

import { assertEquals } from "@std/assert";

import type { Result } from "../../src/core/types/classification.ts";
import type { SecretStore } from "../../src/core/secrets/backends/secret_store.ts";
import { createMemorySecretStore } from "../../src/core/secrets/backends/memory_store.ts";

// --- Test helpers ---

/** Create a mock DPAPI store where getSecret always fails (simulating cross-user DPAPI). */
function createFailingDpapiStore(): SecretStore {
  const entries = new Map<string, string>();
  return {
    getSecret(_name: string): Promise<Result<string, string>> {
      // Simulate DPAPI unprotect failure (cross-user context)
      return Promise.resolve({
        ok: false as const,
        error: "DPAPI unprotect failed: The data is invalid",
      });
    },
    setSecret(name: string, value: string): Promise<Result<true, string>> {
      entries.set(name, value);
      return Promise.resolve({ ok: true as const, value: true as const });
    },
    deleteSecret(name: string): Promise<Result<true, string>> {
      if (!entries.has(name)) {
        return Promise.resolve({
          ok: false as const,
          error: `Secret '${name}' not found`,
        });
      }
      entries.delete(name);
      return Promise.resolve({ ok: true as const, value: true as const });
    },
    listSecrets(): Promise<Result<string[], string>> {
      return Promise.resolve({
        ok: true as const,
        value: [...entries.keys()],
      });
    },
  };
}

/**
 * Build a dual-store that mirrors the production logic in windows_keychain.ts.
 * Writes to both backends; reads from primary with fallback to secondary.
 */
function buildTestDualStore(
  primary: SecretStore,
  fallback: SecretStore,
): SecretStore {
  return {
    async getSecret(name: string): Promise<Result<string, string>> {
      const primaryResult = await primary.getSecret(name);
      if (primaryResult.ok) return primaryResult;
      return fallback.getSecret(name);
    },
    async setSecret(
      name: string,
      value: string,
    ): Promise<Result<true, string>> {
      const primaryResult = await primary.setSecret(name, value);
      const fallbackResult = await fallback.setSecret(name, value);
      if (primaryResult.ok) return primaryResult;
      if (fallbackResult.ok) return fallbackResult;
      return {
        ok: false as const,
        error:
          `Both backends failed — primary: ${primaryResult.error}; fallback: ${fallbackResult.error}`,
      };
    },
    async deleteSecret(name: string): Promise<Result<true, string>> {
      const primaryResult = await primary.deleteSecret(name);
      const fallbackResult = await fallback.deleteSecret(name);
      if (primaryResult.ok) return primaryResult;
      if (fallbackResult.ok) return fallbackResult;
      return primaryResult;
    },
    async listSecrets(): Promise<Result<string[], string>> {
      const primaryResult = await primary.listSecrets();
      const fallbackResult = await fallback.listSecrets();
      const primaryNames = primaryResult.ok ? primaryResult.value : [];
      const fallbackNames = fallbackResult.ok ? fallbackResult.value : [];
      const merged = [...new Set([...primaryNames, ...fallbackNames])];
      return { ok: true as const, value: merged };
    },
  };
}

// --- Tests ---

Deno.test("dual-store: reads from fallback when primary getSecret fails", async () => {
  const failingPrimary = createFailingDpapiStore();
  const fallback = createMemorySecretStore();

  // Pre-populate the fallback store (simulating wizard dual-write)
  await fallback.setSecret("cloud:licenseKey", "tf_live_abc123");

  const dual = buildTestDualStore(failingPrimary, fallback);
  const result = await dual.getSecret("cloud:licenseKey");
  assertEquals(result.ok, true);
  if (result.ok) {
    assertEquals(result.value, "tf_live_abc123");
  }
});

Deno.test("dual-store: reads from primary when primary succeeds", async () => {
  const primary = createMemorySecretStore();
  const fallback = createMemorySecretStore();

  await primary.setSecret("MY_KEY", "primary-value");
  await fallback.setSecret("MY_KEY", "fallback-value");

  const dual = buildTestDualStore(primary, fallback);
  const result = await dual.getSecret("MY_KEY");
  assertEquals(result.ok, true);
  if (result.ok) {
    assertEquals(result.value, "primary-value");
  }
});

Deno.test("dual-store: setSecret writes to both backends", async () => {
  const primary = createMemorySecretStore();
  const fallback = createMemorySecretStore();
  const dual = buildTestDualStore(primary, fallback);

  await dual.setSecret("SHARED_KEY", "shared-value");

  const primaryResult = await primary.getSecret("SHARED_KEY");
  const fallbackResult = await fallback.getSecret("SHARED_KEY");
  assertEquals(primaryResult.ok, true);
  assertEquals(fallbackResult.ok, true);
  if (primaryResult.ok) assertEquals(primaryResult.value, "shared-value");
  if (fallbackResult.ok) assertEquals(fallbackResult.value, "shared-value");
});

Deno.test("dual-store: listSecrets merges both backends without duplicates", async () => {
  const primary = createMemorySecretStore();
  const fallback = createMemorySecretStore();
  const dual = buildTestDualStore(primary, fallback);

  // Write some to primary only, some to fallback only, some to both
  await primary.setSecret("A", "a");
  await fallback.setSecret("B", "b");
  await dual.setSecret("C", "c"); // both

  const result = await dual.listSecrets();
  assertEquals(result.ok, true);
  if (result.ok) {
    const sorted = [...result.value].sort();
    assertEquals(sorted, ["A", "B", "C"]);
  }
});

Deno.test("dual-store: returns error when secret not in either backend", async () => {
  const failingPrimary = createFailingDpapiStore();
  const fallback = createMemorySecretStore();
  const dual = buildTestDualStore(failingPrimary, fallback);

  const result = await dual.getSecret("NONEXISTENT");
  assertEquals(result.ok, false);
});

Deno.test("dual-store: simulates Windows service startup with Gateway license key", async () => {
  // Simulate: wizard wrote to both DPAPI and encrypted-file
  const failingDpapi = createFailingDpapiStore();
  const encryptedFile = createMemorySecretStore();

  // Wizard stored the key (dual-write: DPAPI + encrypted-file)
  await failingDpapi.setSecret("cloud:licenseKey", "tf_live_xyz789");
  await encryptedFile.setSecret("cloud:licenseKey", "tf_live_xyz789");

  // Service starts — DPAPI getSecret will fail (cross-user)
  const serviceKeychain = buildTestDualStore(failingDpapi, encryptedFile);
  const result = await serviceKeychain.getSecret("cloud:licenseKey");

  assertEquals(result.ok, true);
  if (result.ok) {
    assertEquals(result.value, "tf_live_xyz789");
  }
});
