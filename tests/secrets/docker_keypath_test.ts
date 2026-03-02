/**
 * Tests for configurable Docker key path (TRIGGERFISH_KEY_PATH).
 *
 * @module
 */

import { assertEquals } from "@std/assert";
import { resolveDockerKeyPath } from "../../src/core/secrets/keychain/keychain.ts";

/** Temporarily set/unset env vars for a synchronous function call. */
function withEnv<T>(
  vars: Record<string, string | undefined>,
  fn: () => T,
): T {
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
    return fn();
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
  const result = withEnv({ TRIGGERFISH_KEY_PATH: undefined }, () => {
    return resolveDockerKeyPath();
  });
  assertEquals(result, "/data/secrets.key");
});

Deno.test("resolveDockerKeyPath: respects TRIGGERFISH_KEY_PATH override", () => {
  const result = withEnv(
    { TRIGGERFISH_KEY_PATH: "/keys/secrets.key" },
    () => {
      return resolveDockerKeyPath();
    },
  );
  assertEquals(result, "/keys/secrets.key");
});

Deno.test("resolveDockerKeyPath: accepts arbitrary path", () => {
  const result = withEnv(
    { TRIGGERFISH_KEY_PATH: "/mnt/secure-volume/my.key" },
    () => {
      return resolveDockerKeyPath();
    },
  );
  assertEquals(result, "/mnt/secure-volume/my.key");
});
