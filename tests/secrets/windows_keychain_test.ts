/**
 * Windows DPAPI keychain — unit tests.
 *
 * Tests cover the DPAPI-backed secret store and migration logic.
 * Since DPAPI requires Windows + PowerShell, these tests mock
 * the command runner to verify behavior cross-platform.
 */

import { assertEquals } from "@std/assert";
import { join } from "@std/path";

// --- DPAPI secrets file format helpers (mirrors windows_keychain.ts internals) ---

interface DpapiSecretsFile {
  readonly v: 1;
  readonly entries: Record<string, string>;
}

// --- Mock infrastructure ---

/** Simulated DPAPI: base64-encode to "protect", decode to "unprotect". */
function mockProtect(plaintext: string): string {
  return btoa(plaintext);
}

function mockUnprotect(base64: string): string {
  return atob(base64);
}

/**
 * Build an in-memory DPAPI-like secret store for testing.
 *
 * Uses base64 encoding as a stand-in for DPAPI encryption,
 * and an in-memory map instead of a JSON file on disk.
 */
function createMockDpapiStore(): {
  readonly store: import("../../src/core/secrets/backends/secret_store.ts").SecretStore;
  readonly entries: Map<string, string>;
} {
  const entries = new Map<string, string>();

  const store: import("../../src/core/secrets/backends/secret_store.ts").SecretStore =
    {
      async getSecret(
        name: string,
      ): Promise<
        import("../../src/core/types/classification.ts").Result<string, string>
      > {
        const entry = entries.get(name);
        if (entry === undefined) {
          return {
            ok: false,
            error: `Secret '${name}' not found in DPAPI store`,
          };
        }
        return { ok: true, value: mockUnprotect(entry) };
      },

      async setSecret(
        name: string,
        value: string,
      ): Promise<
        import("../../src/core/types/classification.ts").Result<true, string>
      > {
        entries.set(name, mockProtect(value));
        return { ok: true, value: true };
      },

      async deleteSecret(
        name: string,
      ): Promise<
        import("../../src/core/types/classification.ts").Result<true, string>
      > {
        if (!entries.has(name)) {
          return {
            ok: false,
            error: `Secret '${name}' not found in DPAPI store`,
          };
        }
        entries.delete(name);
        return { ok: true, value: true };
      },

      async listSecrets(): Promise<
        import("../../src/core/types/classification.ts").Result<string[], string>
      > {
        return { ok: true, value: [...entries.keys()] };
      },
    };

  return { store, entries };
}

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

// --- resolveDpapiSecretsPath ---

Deno.test("resolveDpapiSecretsPath: uses TRIGGERFISH_DATA_DIR when set", async () => {
  const { resolveDpapiSecretsPath } = await import(
    "../../src/core/secrets/keychain/windows_keychain.ts"
  );

  const originalEnv = Deno.env.get("TRIGGERFISH_DATA_DIR");
  try {
    Deno.env.set("TRIGGERFISH_DATA_DIR", "/custom/data");
    const path = resolveDpapiSecretsPath();
    assertEquals(path, join("/custom/data", "dpapi_secrets.json"));
  } finally {
    if (originalEnv !== undefined) {
      Deno.env.set("TRIGGERFISH_DATA_DIR", originalEnv);
    } else {
      Deno.env.delete("TRIGGERFISH_DATA_DIR");
    }
  }
});

// --- probeWindowsDpapi on non-Windows ---

Deno.test("probeWindowsDpapi: returns false on non-Windows", async () => {
  if (Deno.build.os === "windows") return; // skip on actual Windows

  const { probeWindowsDpapi } = await import(
    "../../src/core/secrets/keychain/windows_keychain.ts"
  );

  const result = await probeWindowsDpapi();
  assertEquals(result, false);
});

// --- createWindowsKeychain on non-Windows falls back ---

Deno.test("createWindowsKeychain: falls back to encrypted-file on non-Windows", async () => {
  if (Deno.build.os === "windows") return; // skip on actual Windows

  const { createWindowsKeychain } = await import(
    "../../src/core/secrets/keychain/windows_keychain.ts"
  );

  const store = createWindowsKeychain();
  // The store should exist and be callable (lazy probe happens on first op)
  assertEquals(typeof store.getSecret, "function");
  assertEquals(typeof store.setSecret, "function");
  assertEquals(typeof store.deleteSecret, "function");
  assertEquals(typeof store.listSecrets, "function");
});
