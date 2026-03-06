/**
 * Tests for resolvePermissionStrictness and env var integration.
 *
 * Covers explicit values, env var override, defaults, and
 * FileSecretStore env var integration.
 */

import { assertEquals, assertStringIncludes } from "@std/assert";
import { resolvePermissionStrictness } from "../../src/core/secrets/backends/secret_store.ts";
import { createFileSecretStore } from "../../src/core/secrets/backends/file_provider.ts";

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

Deno.test(
  "FileSecretStore respects TRIGGERFISH_SECRETS_PERMISSION_STRICTNESS env var",
  { ignore: Deno.build.os === "windows" },
  async () => {
    const tmpFile = await Deno.makeTempFile({ suffix: ".json" });
    try {
      await Deno.writeTextFile(tmpFile, JSON.stringify({ key: "value" }));
      await Deno.chmod(tmpFile, 0o644);

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
