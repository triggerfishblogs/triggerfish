/**
 * Tests for legacy plaintext-to-encrypted migration.
 *
 * Verifies that opening an encrypted store with a plaintext
 * secrets file migrates to v1 encrypted format and removes
 * plaintext values from disk.
 */

import { assertEquals } from "@std/assert";
import { join } from "@std/path";
import { createEncryptedFileSecretStore } from "../../src/core/secrets/encrypted/encrypted_file_provider.ts";

async function withTempDir(fn: (dir: string) => Promise<void>): Promise<void> {
  const dir = await Deno.makeTempDir({ prefix: "triggerfish_sec_test_" });
  try {
    await fn(dir);
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
}

Deno.test(
  "legacy migration overwrites plaintext content in secrets file",
  async () => {
    await withTempDir(async (dir) => {
      const secretsPath = join(dir, "secrets.json");
      const keyPath = join(dir, "secrets.key");

      const legacyContent = JSON.stringify({
        SENSITIVE_KEY: "super-secret-plaintext-value",
        ANOTHER_KEY: "another-plaintext-value",
      });
      await Deno.writeTextFile(secretsPath, legacyContent);

      const store = createEncryptedFileSecretStore({ secretsPath, keyPath });

      const result = await store.getSecret("SENSITIVE_KEY");
      assertEquals(result.ok, true);
      if (result.ok) {
        assertEquals(result.value, "super-secret-plaintext-value");
      }

      const raw = await Deno.readTextFile(secretsPath);
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      assertEquals(parsed["v"], 1);

      assertEquals(raw.includes("super-secret-plaintext-value"), false);
      assertEquals(raw.includes("another-plaintext-value"), false);
    });
  },
);
