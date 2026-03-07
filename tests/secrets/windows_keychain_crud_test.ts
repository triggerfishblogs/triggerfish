/**
 * @module
 * Windows DPAPI keychain — CRUD operation tests.
 *
 * Covers get, set, delete, list operations plus file format
 * and mock encrypt/decrypt round-trip verification.
 */

import { assertEquals } from "@std/assert";

import {
  createMockDpapiStore,
  type DpapiSecretsFile,
  mockProtect,
  mockUnprotect,
} from "./windows_keychain_test_helpers.ts";

// --- Core CRUD tests ---

Deno.test("DPAPI store: setSecret stores and getSecret retrieves", async () => {
  const { store } = createMockDpapiStore();

  const setResult = await store.setSecret("API_KEY", "sk-test-12345");
  assertEquals(setResult.ok, true);

  const getResult = await store.getSecret("API_KEY");
  assertEquals(getResult.ok, true);
  if (getResult.ok) {
    assertEquals(getResult.value, "sk-test-12345");
  }
});

Deno.test("DPAPI store: setSecret overwrites existing secret", async () => {
  const { store } = createMockDpapiStore();

  await store.setSecret("TOKEN", "old-value");
  await store.setSecret("TOKEN", "new-value");

  const result = await store.getSecret("TOKEN");
  assertEquals(result.ok, true);
  if (result.ok) {
    assertEquals(result.value, "new-value");
  }
});

Deno.test("DPAPI store: deleteSecret removes a stored secret", async () => {
  const { store } = createMockDpapiStore();

  await store.setSecret("TEMP", "temporary");
  const deleteResult = await store.deleteSecret("TEMP");
  assertEquals(deleteResult.ok, true);

  const getResult = await store.getSecret("TEMP");
  assertEquals(getResult.ok, false);
});

Deno.test("DPAPI store: listSecrets returns all stored names", async () => {
  const { store } = createMockDpapiStore();

  await store.setSecret("A", "val-a");
  await store.setSecret("B", "val-b");
  await store.setSecret("C", "val-c");

  const result = await store.listSecrets();
  assertEquals(result.ok, true);
  if (result.ok) {
    assertEquals(result.value.length, 3);
    assertEquals(result.value.includes("A"), true);
    assertEquals(result.value.includes("B"), true);
    assertEquals(result.value.includes("C"), true);
  }
});

Deno.test("DPAPI store: listSecrets returns empty array when no secrets", async () => {
  const { store } = createMockDpapiStore();
  const result = await store.listSecrets();
  assertEquals(result.ok, true);
  if (result.ok) {
    assertEquals(result.value, []);
  }
});

Deno.test("DPAPI store: getSecret returns error for nonexistent secret", async () => {
  const { store } = createMockDpapiStore();
  const result = await store.getSecret("NOPE");
  assertEquals(result.ok, false);
  if (!result.ok) {
    assertEquals(result.error.includes("not found"), true);
  }
});

Deno.test("DPAPI store: deleteSecret returns error for nonexistent secret", async () => {
  const { store } = createMockDpapiStore();
  const result = await store.deleteSecret("NOPE");
  assertEquals(result.ok, false);
  if (!result.ok) {
    assertEquals(result.error.includes("not found"), true);
  }
});

Deno.test("DPAPI store: listSecrets reflects deletions", async () => {
  const { store } = createMockDpapiStore();

  await store.setSecret("KEEP", "keep-value");
  await store.setSecret("REMOVE", "remove-value");
  await store.deleteSecret("REMOVE");

  const result = await store.listSecrets();
  assertEquals(result.ok, true);
  if (result.ok) {
    assertEquals(result.value, ["KEEP"]);
  }
});

Deno.test("DPAPI store: empty string values are valid", async () => {
  const { store } = createMockDpapiStore();

  await store.setSecret("EMPTY", "");
  const result = await store.getSecret("EMPTY");
  assertEquals(result.ok, true);
  if (result.ok) {
    assertEquals(result.value, "");
  }
});

Deno.test("DPAPI store: special characters in name and value", async () => {
  const { store } = createMockDpapiStore();

  await store.setSecret("my/secret.key-1", "p@$$w0rd!#%^&*()");
  const result = await store.getSecret("my/secret.key-1");
  assertEquals(result.ok, true);
  if (result.ok) {
    assertEquals(result.value, "p@$$w0rd!#%^&*()");
  }
});

// --- Entries are stored encrypted (not plaintext) ---

Deno.test("DPAPI store: entries map contains encrypted (base64) values, not plaintext", async () => {
  const { store, entries } = createMockDpapiStore();

  await store.setSecret("SECRET", "my-secret-value");
  const raw = entries.get("SECRET");
  assertEquals(raw !== undefined, true);
  assertEquals(raw !== "my-secret-value", true);
  assertEquals(raw, btoa("my-secret-value"));
});

// --- DPAPI secrets file format ---

Deno.test("DPAPI secrets file format: v1 with entries", () => {
  const file: DpapiSecretsFile = {
    v: 1,
    entries: {
      "KEY_A": btoa("value-a"),
      "KEY_B": btoa("value-b"),
    },
  };
  assertEquals(file.v, 1);
  assertEquals(Object.keys(file.entries).length, 2);
  assertEquals(atob(file.entries["KEY_A"]), "value-a");
});

// --- Mock protect/unprotect round-trip ---

Deno.test("mock DPAPI: protect then unprotect returns original value", () => {
  const original = "hello world! special chars: \u00e9\u00e0\u00fc";
  const encrypted = mockProtect(original);
  const decrypted = mockUnprotect(encrypted);
  assertEquals(decrypted, original);
});
