/**
 * Unit tests for the AES-256-GCM encrypted file secret store.
 *
 * All tests use temporary directories and clean up after themselves.
 */

import { assertEquals, assertStringIncludes } from "@std/assert";
import { join } from "@std/path";
import { createEncryptedFileSecretStore } from "../../src/core/secrets/encrypted/encrypted_file_provider.ts";

// Helper: create a temp dir and return its path + a cleanup function
async function withTempDir(
  fn: (dir: string) => Promise<void>,
): Promise<void> {
  const dir = await Deno.makeTempDir({ prefix: "triggerfish_enc_test_" });
  try {
    await fn(dir);
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
}

// Helper: build store options from a temp dir
function storeOpts(dir: string) {
  return {
    secretsPath: join(dir, "secrets.json"),
    keyPath: join(dir, "secrets.key"),
  };
}

// --- Basic CRUD ---

Deno.test("setSecret and getSecret round-trip correctly", async () => {
  await withTempDir(async (dir) => {
    const store = createEncryptedFileSecretStore(storeOpts(dir));

    const setResult = await store.setSecret("MY_KEY", "super-secret-value");
    assertEquals(setResult.ok, true);

    const getResult = await store.getSecret("MY_KEY");
    assertEquals(getResult.ok, true);
    if (getResult.ok) {
      assertEquals(getResult.value, "super-secret-value");
    }
  });
});

Deno.test("setSecret overwrites an existing secret", async () => {
  await withTempDir(async (dir) => {
    const store = createEncryptedFileSecretStore(storeOpts(dir));

    await store.setSecret("TOKEN", "old-token");
    await store.setSecret("TOKEN", "new-token");

    const result = await store.getSecret("TOKEN");
    assertEquals(result.ok, true);
    if (result.ok) {
      assertEquals(result.value, "new-token");
    }
  });
});

Deno.test("deleteSecret removes entry; subsequent getSecret returns error", async () => {
  await withTempDir(async (dir) => {
    const store = createEncryptedFileSecretStore(storeOpts(dir));

    await store.setSecret("TEMP", "temporary-value");

    const deleteResult = await store.deleteSecret("TEMP");
    assertEquals(deleteResult.ok, true);

    const getResult = await store.getSecret("TEMP");
    assertEquals(getResult.ok, false);
    if (!getResult.ok) {
      assertStringIncludes(getResult.error, "not found");
    }
  });
});

Deno.test("listSecrets returns all stored secret names without decrypting", async () => {
  await withTempDir(async (dir) => {
    const store = createEncryptedFileSecretStore(storeOpts(dir));

    await store.setSecret("KEY_A", "val-a");
    await store.setSecret("KEY_B", "val-b");
    await store.setSecret("KEY_C", "val-c");

    const result = await store.listSecrets();
    assertEquals(result.ok, true);
    if (result.ok) {
      assertEquals(result.value.length, 3);
      assertEquals(result.value.includes("KEY_A"), true);
      assertEquals(result.value.includes("KEY_B"), true);
      assertEquals(result.value.includes("KEY_C"), true);
    }
  });
});

Deno.test("listSecrets returns empty array when no secrets stored", async () => {
  await withTempDir(async (dir) => {
    const store = createEncryptedFileSecretStore(storeOpts(dir));

    const result = await store.listSecrets();
    assertEquals(result.ok, true);
    if (result.ok) {
      assertEquals(result.value, []);
    }
  });
});

Deno.test("getSecret returns error for nonexistent key", async () => {
  await withTempDir(async (dir) => {
    const store = createEncryptedFileSecretStore(storeOpts(dir));

    const result = await store.getSecret("DOES_NOT_EXIST");
    assertEquals(result.ok, false);
    if (!result.ok) {
      assertStringIncludes(result.error, "not found");
    }
  });
});

Deno.test("deleteSecret returns error for nonexistent key", async () => {
  await withTempDir(async (dir) => {
    const store = createEncryptedFileSecretStore(storeOpts(dir));

    const result = await store.deleteSecret("DOES_NOT_EXIST");
    assertEquals(result.ok, false);
    if (!result.ok) {
      assertStringIncludes(result.error, "not found");
    }
  });
});

// --- Encryption sanity ---

Deno.test("encrypted file is not plain-text (raw file content differs from value)", async () => {
  await withTempDir(async (dir) => {
    const opts = storeOpts(dir);
    const store = createEncryptedFileSecretStore(opts);

    await store.setSecret("API_KEY", "very-secret-api-key-1234");

    const raw = await Deno.readTextFile(opts.secretsPath);
    // The plaintext value must not appear verbatim in the file
    assertEquals(raw.includes("very-secret-api-key-1234"), false);
    // The file must be valid JSON with v=1 format
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    assertEquals(parsed["v"], 1);
  });
});

Deno.test("two different setSecret calls produce different ciphertexts (IV freshness)", async () => {
  await withTempDir(async (dir) => {
    const store = createEncryptedFileSecretStore(storeOpts(dir));

    // Write the same value twice (to same key — overwrite)
    await store.setSecret("KEY", "same-value");
    const rawFirst = JSON.parse(
      await Deno.readTextFile(storeOpts(dir).secretsPath),
    );

    await store.setSecret("KEY", "same-value");
    const rawSecond = JSON.parse(
      await Deno.readTextFile(storeOpts(dir).secretsPath),
    );

    // The IV should differ on each write
    const ivFirst =
      (rawFirst as { entries: Record<string, { iv: string }> }).entries["KEY"]
        .iv;
    const ivSecond =
      (rawSecond as { entries: Record<string, { iv: string }> }).entries["KEY"]
        .iv;
    assertEquals(ivFirst !== ivSecond, true);
  });
});

// --- Migration from legacy plain-text format ---

Deno.test("auto-migrates legacy plain-text JSON to encrypted format on first load", async () => {
  await withTempDir(async (dir) => {
    const opts = storeOpts(dir);

    // Write a legacy flat JSON file
    await Deno.mkdir(dir, { recursive: true });
    await Deno.writeTextFile(
      opts.secretsPath,
      JSON.stringify({ OLD_KEY: "old-plain-value", ANOTHER: "another-value" }),
    );

    // Open the encrypted store — should auto-migrate
    const store = createEncryptedFileSecretStore(opts);

    const result1 = await store.getSecret("OLD_KEY");
    assertEquals(result1.ok, true);
    if (result1.ok) {
      assertEquals(result1.value, "old-plain-value");
    }

    const result2 = await store.getSecret("ANOTHER");
    assertEquals(result2.ok, true);
    if (result2.ok) {
      assertEquals(result2.value, "another-value");
    }

    // File must now be in v1 encrypted format
    const raw = await Deno.readTextFile(opts.secretsPath);
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    assertEquals(parsed["v"], 1);
    // Values must not be in plaintext
    assertEquals(raw.includes("old-plain-value"), false);
    assertEquals(raw.includes("another-value"), false);
  });
});

// --- Edge cases ---

Deno.test("secrets with empty string values are stored and retrieved correctly", async () => {
  await withTempDir(async (dir) => {
    const store = createEncryptedFileSecretStore(storeOpts(dir));

    const setResult = await store.setSecret("EMPTY", "");
    assertEquals(setResult.ok, true);

    const getResult = await store.getSecret("EMPTY");
    assertEquals(getResult.ok, true);
    if (getResult.ok) {
      assertEquals(getResult.value, "");
    }
  });
});

Deno.test("secrets with special characters in name and value round-trip correctly", async () => {
  await withTempDir(async (dir) => {
    const store = createEncryptedFileSecretStore(storeOpts(dir));

    await store.setSecret("my/secret.key-1", "p@$$w0rd!#%^&*()");

    const result = await store.getSecret("my/secret.key-1");
    assertEquals(result.ok, true);
    if (result.ok) {
      assertEquals(result.value, "p@$$w0rd!#%^&*()");
    }
  });
});

Deno.test("listSecrets reflects deletions correctly", async () => {
  await withTempDir(async (dir) => {
    const store = createEncryptedFileSecretStore(storeOpts(dir));

    await store.setSecret("KEEP", "keep-value");
    await store.setSecret("REMOVE", "remove-value");
    await store.deleteSecret("REMOVE");

    const result = await store.listSecrets();
    assertEquals(result.ok, true);
    if (result.ok) {
      assertEquals(result.value.includes("KEEP"), true);
      assertEquals(result.value.includes("REMOVE"), false);
    }
  });
});

Deno.test("store persists data across separate store instances (same files)", async () => {
  await withTempDir(async (dir) => {
    const opts = storeOpts(dir);

    // Write with first store instance
    const store1 = createEncryptedFileSecretStore(opts);
    await store1.setSecret("PERSISTENT", "cross-instance-value");

    // Read with second store instance (new in-memory cache)
    const store2 = createEncryptedFileSecretStore(opts);
    const result = await store2.getSecret("PERSISTENT");
    assertEquals(result.ok, true);
    if (result.ok) {
      assertEquals(result.value, "cross-instance-value");
    }
  });
});
