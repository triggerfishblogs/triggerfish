/**
 * Secrets management — Keychain tests.
 *
 * Uses the in-memory fallback backend so tests run without
 * requiring an actual OS keychain / secret service.
 */

import { assertEquals } from "@std/assert";
import { createMemorySecretStore } from "../../src/secrets/keychain.ts";

// --- Set and get a secret ---

Deno.test("setSecret stores a value and getSecret retrieves it", async () => {
  const store = createMemorySecretStore();

  const setResult = await store.setSecret("API_KEY", "sk-test-12345");
  assertEquals(setResult.ok, true);
  if (setResult.ok) {
    assertEquals(setResult.value, true);
  }

  const getResult = await store.getSecret("API_KEY");
  assertEquals(getResult.ok, true);
  if (getResult.ok) {
    assertEquals(getResult.value, "sk-test-12345");
  }
});

Deno.test("setSecret overwrites an existing secret", async () => {
  const store = createMemorySecretStore();

  await store.setSecret("TOKEN", "old-value");
  await store.setSecret("TOKEN", "new-value");

  const result = await store.getSecret("TOKEN");
  assertEquals(result.ok, true);
  if (result.ok) {
    assertEquals(result.value, "new-value");
  }
});

// --- Delete a secret ---

Deno.test("deleteSecret removes a stored secret", async () => {
  const store = createMemorySecretStore();

  await store.setSecret("TEMP_KEY", "temporary");
  const deleteResult = await store.deleteSecret("TEMP_KEY");
  assertEquals(deleteResult.ok, true);
  if (deleteResult.ok) {
    assertEquals(deleteResult.value, true);
  }

  const getResult = await store.getSecret("TEMP_KEY");
  assertEquals(getResult.ok, false);
});

// --- List secrets ---

Deno.test("listSecrets returns all stored secret names", async () => {
  const store = createMemorySecretStore();

  await store.setSecret("KEY_A", "value-a");
  await store.setSecret("KEY_B", "value-b");
  await store.setSecret("KEY_C", "value-c");

  const result = await store.listSecrets();
  assertEquals(result.ok, true);
  if (result.ok) {
    assertEquals(result.value.length, 3);
    assertEquals(result.value.includes("KEY_A"), true);
    assertEquals(result.value.includes("KEY_B"), true);
    assertEquals(result.value.includes("KEY_C"), true);
  }
});

Deno.test("listSecrets returns empty array when no secrets stored", async () => {
  const store = createMemorySecretStore();

  const result = await store.listSecrets();
  assertEquals(result.ok, true);
  if (result.ok) {
    assertEquals(result.value, []);
  }
});

// --- Get nonexistent secret returns error ---

Deno.test("getSecret returns error for nonexistent secret", async () => {
  const store = createMemorySecretStore();

  const result = await store.getSecret("DOES_NOT_EXIST");
  assertEquals(result.ok, false);
  if (!result.ok) {
    assertEquals(result.error.includes("not found"), true);
  }
});

// --- Delete nonexistent secret returns error ---

Deno.test("deleteSecret returns error for nonexistent secret", async () => {
  const store = createMemorySecretStore();

  const result = await store.deleteSecret("DOES_NOT_EXIST");
  assertEquals(result.ok, false);
  if (!result.ok) {
    assertEquals(result.error.includes("not found"), true);
  }
});

// --- Additional edge cases ---

Deno.test("listSecrets reflects deletions", async () => {
  const store = createMemorySecretStore();

  await store.setSecret("KEEP", "keep-value");
  await store.setSecret("REMOVE", "remove-value");
  await store.deleteSecret("REMOVE");

  const result = await store.listSecrets();
  assertEquals(result.ok, true);
  if (result.ok) {
    assertEquals(result.value, ["KEEP"]);
  }
});

Deno.test("secrets with empty string values are valid", async () => {
  const store = createMemorySecretStore();

  const setResult = await store.setSecret("EMPTY", "");
  assertEquals(setResult.ok, true);

  const getResult = await store.getSecret("EMPTY");
  assertEquals(getResult.ok, true);
  if (getResult.ok) {
    assertEquals(getResult.value, "");
  }
});

Deno.test("secrets with special characters in name and value", async () => {
  const store = createMemorySecretStore();

  await store.setSecret("my/secret.key-1", "p@$$w0rd!#%^&*()");

  const result = await store.getSecret("my/secret.key-1");
  assertEquals(result.ok, true);
  if (result.ok) {
    assertEquals(result.value, "p@$$w0rd!#%^&*()");
  }
});
