/**
 * Tests for configurable Docker key path.
 *
 * @module
 */

import { assertEquals } from "@std/assert";
import { resolveDockerKeyPath } from "../../src/core/secrets/mod.ts";

// Helper to temporarily set/unset env vars
function withEnv(
  vars: Record<string, string | undefined>,
  fn: () => void,
): void {
  const originals: Record<string, string | undefined> = {};
  for (const key of Object.keys(vars)) {
    originals[key] = Deno.env.get(key);
    if (vars[key] === undefined) {
      Deno.env.delete(key);
    } else {
      Deno.env.set(key, vars[key]!);
    }
  }
  try {
    fn();
  } finally {
    for (const key of Object.keys(originals)) {
      if (originals[key] === undefined) {
        Deno.env.delete(key);
      } else {
        Deno.env.set(key, originals[key]!);
      }
    }
  }
}

Deno.test("resolveDockerKeyPath: defaults to /data/secrets.key", () => {
  withEnv({ TRIGGERFISH_KEY_PATH: undefined }, () => {
    assertEquals(resolveDockerKeyPath(), "/data/secrets.key");
  });
});

Deno.test("resolveDockerKeyPath: respects TRIGGERFISH_KEY_PATH env var", () => {
  withEnv({ TRIGGERFISH_KEY_PATH: "/keys/secrets.key" }, () => {
    assertEquals(resolveDockerKeyPath(), "/keys/secrets.key");
  });
});

Deno.test("resolveDockerKeyPath: accepts arbitrary custom path", () => {
  withEnv({ TRIGGERFISH_KEY_PATH: "/mnt/secure/my.key" }, () => {
    assertEquals(resolveDockerKeyPath(), "/mnt/secure/my.key");
  });
});
