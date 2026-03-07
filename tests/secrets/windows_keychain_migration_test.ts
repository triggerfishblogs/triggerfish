/**
 * @module
 * Windows DPAPI keychain — migration simulation tests.
 *
 * Verifies that secrets can be migrated from a legacy store
 * into the DPAPI-backed store by listing, reading, and
 * re-writing each entry.
 */

import { assertEquals } from "@std/assert";

import { createMockDpapiStore } from "./windows_keychain_test_helpers.ts";

// --- Migration simulation ---

Deno.test("migration: copies secrets from source store to DPAPI store", async () => {
  // Simulate a legacy store with some secrets
  const { store: legacyStore } = createMockDpapiStore();
  await legacyStore.setSecret("LEGACY_A", "value-a");
  await legacyStore.setSecret("LEGACY_B", "value-b");

  // Target DPAPI store
  const { store: dpapiStore } = createMockDpapiStore();

  // Simulate migration: list from legacy, copy to DPAPI
  const listResult = await legacyStore.listSecrets();
  assertEquals(listResult.ok, true);
  if (!listResult.ok) return;

  for (const name of listResult.value) {
    const getResult = await legacyStore.getSecret(name);
    if (getResult.ok) {
      await dpapiStore.setSecret(name, getResult.value);
    }
  }

  // Verify DPAPI store has all secrets
  const dpapiList = await dpapiStore.listSecrets();
  assertEquals(dpapiList.ok, true);
  if (dpapiList.ok) {
    assertEquals(dpapiList.value.length, 2);
    assertEquals(dpapiList.value.includes("LEGACY_A"), true);
    assertEquals(dpapiList.value.includes("LEGACY_B"), true);
  }

  const val = await dpapiStore.getSecret("LEGACY_A");
  assertEquals(val.ok, true);
  if (val.ok) assertEquals(val.value, "value-a");
});
