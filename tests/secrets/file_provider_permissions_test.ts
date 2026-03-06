/**
 * Tests for FileSecretStore permission strictness modes.
 *
 * Verifies that error/warn/ignore strictness levels correctly
 * gate read and write operations based on file permissions.
 */

import { assertEquals } from "@std/assert";
import { assertStringIncludes } from "@std/assert";
import { createFileSecretStore } from "../../src/core/secrets/backends/file_provider.ts";

Deno.test(
  "FileSecretStore: error strictness refuses to operate with open permissions",
  { ignore: Deno.build.os === "windows" },
  async () => {
    const tmpFile = await Deno.makeTempFile({ suffix: ".json" });
    try {
      await Deno.writeTextFile(tmpFile, JSON.stringify({ key: "value" }));
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
