/**
 * @module
 * Windows DPAPI keychain — platform probe and path resolution tests.
 *
 * Covers `resolveDpapiSecretsPath`, `probeWindowsDpapi`, and
 * `createWindowsKeychain` fallback behavior on non-Windows platforms.
 */

import { assertEquals } from "@std/assert";
import { join } from "@std/path";

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
