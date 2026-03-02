/**
 * Unit tests for the machine key manager.
 *
 * Tests key generation, loading, and error handling using
 * temporary directories so no filesystem state is left behind.
 */

import { assertEquals, assertStringIncludes } from "@std/assert";
import { join } from "@std/path";
import { loadOrCreateMachineKey } from "../../src/core/secrets/backends/key_manager.ts";

// Helper: create a temp dir and return its path + a cleanup function
async function withTempDir(
  fn: (dir: string) => Promise<void>,
): Promise<void> {
  const dir = await Deno.makeTempDir({ prefix: "triggerfish_key_test_" });
  try {
    await fn(dir);
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
}

// --- Key generation ---

Deno.test(
  "loadOrCreateMachineKey generates a valid CryptoKey when no key file exists",
  async () => {
    await withTempDir(async (dir) => {
      const keyPath = join(dir, "secrets.key");
      const result = await loadOrCreateMachineKey({ keyPath });

      assertEquals(result.ok, true);
      if (result.ok) {
        assertEquals(result.value.type, "secret");
        assertEquals(result.value.algorithm.name, "AES-GCM");
        assertEquals((result.value.algorithm as AesKeyAlgorithm).length, 256);
        assertEquals(result.value.usages.includes("encrypt"), true);
        assertEquals(result.value.usages.includes("decrypt"), true);
      }
    });
  },
);

Deno.test(
  "loadOrCreateMachineKey writes a 32-byte key file on first call",
  async () => {
    await withTempDir(async (dir) => {
      const keyPath = join(dir, "secrets.key");
      const result = await loadOrCreateMachineKey({ keyPath });
      assertEquals(result.ok, true);

      const fileBytes = await Deno.readFile(keyPath);
      assertEquals(fileBytes.byteLength, 32);
    });
  },
);

// --- Key persistence / determinism ---

Deno.test(
  "loadOrCreateMachineKey loads the same key on subsequent calls",
  async () => {
    await withTempDir(async (dir) => {
      const keyPath = join(dir, "secrets.key");

      // Generate key (first call)
      const result1 = await loadOrCreateMachineKey({ keyPath });
      assertEquals(result1.ok, true);

      // Read the raw bytes of the generated key file
      const rawBytes = await Deno.readFile(keyPath);

      // Load key (second call)
      const result2 = await loadOrCreateMachineKey({ keyPath });
      assertEquals(result2.ok, true);

      // Both keys should decrypt data encrypted by the other.
      // Verify by encrypting with key1 and decrypting with key2.
      if (result1.ok && result2.ok) {
        const iv = crypto.getRandomValues(new Uint8Array(12));
        const plaintext = new TextEncoder().encode("test-value");
        const ct = await crypto.subtle.encrypt(
          { name: "AES-GCM", iv },
          result1.value,
          plaintext,
        );
        const decrypted = await crypto.subtle.decrypt(
          { name: "AES-GCM", iv },
          result2.value,
          ct,
        );
        assertEquals(
          new TextDecoder().decode(decrypted),
          "test-value",
        );
      }

      // Suppress unused variable warning
      assertEquals(rawBytes.byteLength, 32);
    });
  },
);

// --- Key file in nested directory ---

Deno.test(
  "loadOrCreateMachineKey creates intermediate directories as needed",
  async () => {
    await withTempDir(async (dir) => {
      const keyPath = join(dir, "nested", "deep", "secrets.key");
      const result = await loadOrCreateMachineKey({ keyPath });
      assertEquals(result.ok, true);

      const fileBytes = await Deno.readFile(keyPath);
      assertEquals(fileBytes.byteLength, 32);
    });
  },
);

// --- Corrupt key file ---

Deno.test(
  "loadOrCreateMachineKey returns error when key file has wrong byte count",
  async () => {
    await withTempDir(async (dir) => {
      const keyPath = join(dir, "secrets.key");
      // Write a corrupt key file (16 bytes instead of 32)
      await Deno.writeFile(keyPath, new Uint8Array(16));

      const result = await loadOrCreateMachineKey({ keyPath });
      assertEquals(result.ok, false);
      if (!result.ok) {
        assertStringIncludes(result.error, "corrupt");
      }
    });
  },
);

// --- Two calls return interoperable keys ---

Deno.test(
  "loadOrCreateMachineKey produces a key that is usable for AES-GCM encryption",
  async () => {
    await withTempDir(async (dir) => {
      const keyPath = join(dir, "secrets.key");
      const result = await loadOrCreateMachineKey({ keyPath });
      assertEquals(result.ok, true);

      if (result.ok) {
        const key = result.value;
        const iv = crypto.getRandomValues(new Uint8Array(12));
        const data = new TextEncoder().encode("hello secrets");

        const ct = await crypto.subtle.encrypt(
          { name: "AES-GCM", iv },
          key,
          data,
        );
        const pt = await crypto.subtle.decrypt(
          { name: "AES-GCM", iv },
          key,
          ct,
        );

        assertEquals(new TextDecoder().decode(pt), "hello secrets");
      }
    });
  },
);
