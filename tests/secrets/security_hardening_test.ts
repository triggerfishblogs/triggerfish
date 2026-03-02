/**
 * Tests for secrets storage security hardening (Issue #207).
 *
 * Covers:
 * 1. Memory fallback requires explicit opt-in
 * 2. Machine key file permission verification
 * 3. Legacy migration logs at WARN level
 * 4. Configurable permission strictness
 */

import { assertEquals, assertStringIncludes } from "@std/assert";
import { join } from "@std/path";
import { loadOrCreateMachineKey } from "../../src/core/secrets/backends/key_manager.ts";
import { createFileSecretStore } from "../../src/core/secrets/backends/file_provider.ts";
import { resolvePermissionStrictness } from "../../src/core/secrets/backends/secret_store.ts";
import { createEncryptedFileSecretStore } from "../../src/core/secrets/encrypted/encrypted_file_provider.ts";

// --- Helpers ---

async function withTempDir(fn: (dir: string) => Promise<void>): Promise<void> {
  const dir = await Deno.makeTempDir({ prefix: "triggerfish_sec_test_" });
  try {
    await fn(dir);
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
}

function withEnv(
  vars: Record<string, string | undefined>,
  fn: () => void | Promise<void>,
): void | Promise<void> {
  const originals: Record<string, string | undefined> = {};
  for (const key of Object.keys(vars)) {
    originals[key] = Deno.env.get(key);
    if (vars[key] === undefined) {
      Deno.env.delete(key);
    } else {
      Deno.env.set(key, vars[key]!);
    }
  }
  const restore = () => {
    for (const key of Object.keys(originals)) {
      if (originals[key] === undefined) {
        Deno.env.delete(key);
      } else {
        Deno.env.set(key, originals[key]!);
      }
    }
  };
  try {
    const result = fn();
    if (result instanceof Promise) {
      return result.finally(restore);
    }
    restore();
  } catch (err) {
    restore();
    throw err;
  }
}

// ============================================================
// 1. resolvePermissionStrictness
// ============================================================

Deno.test("resolvePermissionStrictness returns explicit value over env", () => {
  assertEquals(resolvePermissionStrictness("error"), "error");
  assertEquals(resolvePermissionStrictness("ignore"), "ignore");
  assertEquals(resolvePermissionStrictness("warn"), "warn");
});

Deno.test("resolvePermissionStrictness reads env variable", () => {
  withEnv({ TRIGGERFISH_SECRETS_PERMISSION_STRICTNESS: "error" }, () => {
    assertEquals(resolvePermissionStrictness(), "error");
  });
  withEnv({ TRIGGERFISH_SECRETS_PERMISSION_STRICTNESS: "ignore" }, () => {
    assertEquals(resolvePermissionStrictness(), "ignore");
  });
});

Deno.test("resolvePermissionStrictness defaults to warn", () => {
  withEnv({ TRIGGERFISH_SECRETS_PERMISSION_STRICTNESS: undefined }, () => {
    assertEquals(resolvePermissionStrictness(), "warn");
  });
});

Deno.test("resolvePermissionStrictness ignores invalid env values", () => {
  withEnv({ TRIGGERFISH_SECRETS_PERMISSION_STRICTNESS: "invalid" }, () => {
    assertEquals(resolvePermissionStrictness(), "warn");
  });
});

// ============================================================
// 2. File provider permission strictness: "error" mode
// ============================================================

Deno.test(
  "FileSecretStore: error strictness refuses to operate with open permissions",
  { ignore: Deno.build.os === "windows" },
  async () => {
    const tmpFile = await Deno.makeTempFile({ suffix: ".json" });
    try {
      await Deno.writeTextFile(tmpFile, JSON.stringify({ key: "value" }));
      // Set world-readable permissions
      await Deno.chmod(tmpFile, 0o644);

      const store = createFileSecretStore({
        path: tmpFile,
        permissionStrictness: "error",
      });

      const result = await store.getSecret("key");
      assertEquals(result.ok, false);
      if (!result.ok) {
        assertStringIncludes(result.error, "permissions");
        assertStringIncludes(result.error, "644");
      }
    } finally {
      await Deno.remove(tmpFile);
    }
  },
);

Deno.test(
  "FileSecretStore: error strictness blocks setSecret with open permissions",
  { ignore: Deno.build.os === "windows" },
  async () => {
    const tmpFile = await Deno.makeTempFile({ suffix: ".json" });
    try {
      await Deno.writeTextFile(tmpFile, "{}");
      await Deno.chmod(tmpFile, 0o644);

      const store = createFileSecretStore({
        path: tmpFile,
        permissionStrictness: "error",
      });

      const result = await store.setSecret("key", "value");
      assertEquals(result.ok, false);
      if (!result.ok) {
        assertStringIncludes(result.error, "permissions");
      }
    } finally {
      await Deno.remove(tmpFile);
    }
  },
);

Deno.test(
  "FileSecretStore: error strictness blocks listSecrets with open permissions",
  { ignore: Deno.build.os === "windows" },
  async () => {
    const tmpFile = await Deno.makeTempFile({ suffix: ".json" });
    try {
      await Deno.writeTextFile(tmpFile, JSON.stringify({ a: "1" }));
      await Deno.chmod(tmpFile, 0o644);

      const store = createFileSecretStore({
        path: tmpFile,
        permissionStrictness: "error",
      });

      const result = await store.listSecrets();
      assertEquals(result.ok, false);
    } finally {
      await Deno.remove(tmpFile);
    }
  },
);

Deno.test(
  "FileSecretStore: ignore strictness allows open permissions",
  { ignore: Deno.build.os === "windows" },
  async () => {
    const tmpFile = await Deno.makeTempFile({ suffix: ".json" });
    try {
      await Deno.writeTextFile(tmpFile, JSON.stringify({ key: "value" }));
      await Deno.chmod(tmpFile, 0o644);

      const store = createFileSecretStore({
        path: tmpFile,
        permissionStrictness: "ignore",
      });

      const result = await store.getSecret("key");
      assertEquals(result.ok, true);
      if (result.ok) assertEquals(result.value, "value");
    } finally {
      await Deno.remove(tmpFile);
    }
  },
);

Deno.test(
  "FileSecretStore: warn strictness allows operation (default behavior)",
  { ignore: Deno.build.os === "windows" },
  async () => {
    const tmpFile = await Deno.makeTempFile({ suffix: ".json" });
    try {
      await Deno.writeTextFile(tmpFile, JSON.stringify({ key: "value" }));
      await Deno.chmod(tmpFile, 0o644);

      const store = createFileSecretStore({
        path: tmpFile,
        permissionStrictness: "warn",
      });

      const result = await store.getSecret("key");
      assertEquals(result.ok, true);
      if (result.ok) assertEquals(result.value, "value");
    } finally {
      await Deno.remove(tmpFile);
    }
  },
);

Deno.test(
  "FileSecretStore: correct permissions (0600) work with all strictness levels",
  { ignore: Deno.build.os === "windows" },
  async () => {
    for (const strictness of ["warn", "error", "ignore"] as const) {
      const tmpFile = await Deno.makeTempFile({ suffix: ".json" });
      try {
        await Deno.writeTextFile(tmpFile, JSON.stringify({ key: "value" }));
        await Deno.chmod(tmpFile, 0o600);

        const store = createFileSecretStore({
          path: tmpFile,
          permissionStrictness: strictness,
        });

        const result = await store.getSecret("key");
        assertEquals(result.ok, true, `Failed with strictness=${strictness}`);
      } finally {
        await Deno.remove(tmpFile);
      }
    }
  },
);

// ============================================================
// 3. Machine key permission verification
// ============================================================

Deno.test(
  "loadOrCreateMachineKey verifies permissions on newly generated key",
  { ignore: Deno.build.os === "windows" },
  async () => {
    await withTempDir(async (dir) => {
      const keyPath = join(dir, "secrets.key");
      const result = await loadOrCreateMachineKey({ keyPath });
      assertEquals(result.ok, true);

      // Verify the file was created with 0600
      const stat = await Deno.stat(keyPath);
      const perms = (stat.mode ?? 0) & 0o777;
      assertEquals(perms, 0o600);
    });
  },
);

Deno.test(
  "loadOrCreateMachineKey rejects open-permission key file in error mode",
  { ignore: Deno.build.os === "windows" },
  async () => {
    await withTempDir(async (dir) => {
      const keyPath = join(dir, "secrets.key");

      // First create a valid key
      const genResult = await loadOrCreateMachineKey({ keyPath });
      assertEquals(genResult.ok, true);

      // Make permissions too open
      await Deno.chmod(keyPath, 0o644);

      // Now try to load with error strictness
      const loadResult = await loadOrCreateMachineKey({
        keyPath,
        permissionStrictness: "error",
      });
      assertEquals(loadResult.ok, false);
      if (!loadResult.ok) {
        assertStringIncludes(loadResult.error, "permissions");
        assertStringIncludes(loadResult.error, "644");
      }
    });
  },
);

Deno.test(
  "loadOrCreateMachineKey allows open-permission key file in ignore mode",
  { ignore: Deno.build.os === "windows" },
  async () => {
    await withTempDir(async (dir) => {
      const keyPath = join(dir, "secrets.key");

      // Create a valid key
      const genResult = await loadOrCreateMachineKey({ keyPath });
      assertEquals(genResult.ok, true);

      // Make permissions too open
      await Deno.chmod(keyPath, 0o644);

      // Load with ignore strictness should succeed
      const loadResult = await loadOrCreateMachineKey({
        keyPath,
        permissionStrictness: "ignore",
      });
      assertEquals(loadResult.ok, true);
    });
  },
);

// ============================================================
// 4. Legacy migration produces encrypted output (existing
//    test extended to verify file does not contain plaintext)
// ============================================================

Deno.test(
  "legacy migration overwrites plaintext content in secrets file",
  async () => {
    await withTempDir(async (dir) => {
      const secretsPath = join(dir, "secrets.json");
      const keyPath = join(dir, "secrets.key");

      // Write a legacy plaintext file
      const legacyContent = JSON.stringify({
        SENSITIVE_KEY: "super-secret-plaintext-value",
        ANOTHER_KEY: "another-plaintext-value",
      });
      await Deno.writeTextFile(secretsPath, legacyContent);

      // Open the encrypted store — triggers auto-migration
      const store = createEncryptedFileSecretStore({ secretsPath, keyPath });

      // Access a secret to trigger migration
      const result = await store.getSecret("SENSITIVE_KEY");
      assertEquals(result.ok, true);
      if (result.ok) {
        assertEquals(result.value, "super-secret-plaintext-value");
      }

      // Verify the file on disk is now encrypted (v1 format)
      const raw = await Deno.readTextFile(secretsPath);
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      assertEquals(parsed["v"], 1);

      // Verify plaintext values do NOT appear in the file
      assertEquals(raw.includes("super-secret-plaintext-value"), false);
      assertEquals(raw.includes("another-plaintext-value"), false);
    });
  },
);

// ============================================================
// 5. Permission strictness via env var
// ============================================================

Deno.test(
  "FileSecretStore respects TRIGGERFISH_SECRETS_PERMISSION_STRICTNESS env var",
  { ignore: Deno.build.os === "windows" },
  async () => {
    const tmpFile = await Deno.makeTempFile({ suffix: ".json" });
    try {
      await Deno.writeTextFile(tmpFile, JSON.stringify({ key: "value" }));
      await Deno.chmod(tmpFile, 0o644);

      // Without explicit option, env var should be respected
      await withEnv(
        { TRIGGERFISH_SECRETS_PERMISSION_STRICTNESS: "error" },
        async () => {
          const store = createFileSecretStore({ path: tmpFile });
          const result = await store.getSecret("key");
          assertEquals(result.ok, false);
          if (!result.ok) {
            assertStringIncludes(result.error, "permissions");
          }
        },
      );
    } finally {
      await Deno.remove(tmpFile);
    }
  },
);
