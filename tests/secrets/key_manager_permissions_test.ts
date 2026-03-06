/**
 * Tests for machine key file permission verification.
 *
 * Verifies that loadOrCreateMachineKey creates keys with correct
 * permissions and respects strictness settings.
 */

import { assertEquals, assertStringIncludes } from "@std/assert";
import { join } from "@std/path";
import { loadOrCreateMachineKey } from "../../src/core/secrets/backends/key_manager.ts";

async function withTempDir(fn: (dir: string) => Promise<void>): Promise<void> {
  const dir = await Deno.makeTempDir({ prefix: "triggerfish_sec_test_" });
  try {
    await fn(dir);
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
}

Deno.test(
  "loadOrCreateMachineKey verifies permissions on newly generated key",
  { ignore: Deno.build.os === "windows" },
  async () => {
    await withTempDir(async (dir) => {
      const keyPath = join(dir, "secrets.key");
      const result = await loadOrCreateMachineKey({ keyPath });
      assertEquals(result.ok, true);

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

      const genResult = await loadOrCreateMachineKey({ keyPath });
      assertEquals(genResult.ok, true);

      await Deno.chmod(keyPath, 0o644);

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

      const genResult = await loadOrCreateMachineKey({ keyPath });
      assertEquals(genResult.ok, true);

      await Deno.chmod(keyPath, 0o644);

      const loadResult = await loadOrCreateMachineKey({
        keyPath,
        permissionStrictness: "ignore",
      });
      assertEquals(loadResult.ok, true);
    });
  },
);
