/**
 * Tests for key file permission verification.
 *
 * @module
 */

import { assertEquals } from "@std/assert";
import {
  isPermissionSecure,
  verifyKeyFilePermissions,
} from "../../src/core/secrets/validation/permission_check.ts";

// --- isPermissionSecure ---

Deno.test("isPermissionSecure: 0o600 is secure (owner read/write only)", () => {
  assertEquals(isPermissionSecure(0o600), true);
});

Deno.test("isPermissionSecure: 0o400 is secure (owner read only)", () => {
  assertEquals(isPermissionSecure(0o400), true);
});

Deno.test("isPermissionSecure: 0o700 is secure (owner rwx, no group/other)", () => {
  assertEquals(isPermissionSecure(0o700), true);
});

Deno.test("isPermissionSecure: 0o644 is insecure (group-readable)", () => {
  assertEquals(isPermissionSecure(0o644), false);
});

Deno.test("isPermissionSecure: 0o666 is insecure (world-readable/writable)", () => {
  assertEquals(isPermissionSecure(0o666), false);
});

Deno.test("isPermissionSecure: 0o640 is insecure (group-readable)", () => {
  assertEquals(isPermissionSecure(0o640), false);
});

Deno.test("isPermissionSecure: 0o601 is insecure (other-executable)", () => {
  assertEquals(isPermissionSecure(0o601), false);
});

Deno.test("isPermissionSecure: 0o000 is secure (no permissions)", () => {
  assertEquals(isPermissionSecure(0o000), true);
});

// --- verifyKeyFilePermissions ---

Deno.test("verifyKeyFilePermissions: returns error for nonexistent file", async () => {
  const result = await verifyKeyFilePermissions("/tmp/nonexistent-key-file-xyz");
  assertEquals(result.ok, false);
  if (!result.ok) {
    assertEquals(result.error.includes("Key file not found"), true);
  }
});

Deno.test("verifyKeyFilePermissions: reports secure for 0o600 file", async () => {
  if (Deno.build.os === "windows") return; // chmod not supported on Windows

  const tmpFile = await Deno.makeTempFile({ prefix: "tf-key-test-" });
  try {
    await Deno.writeFile(tmpFile, new Uint8Array(32), { mode: 0o600 });
    await Deno.chmod(tmpFile, 0o600);

    const result = await verifyKeyFilePermissions(tmpFile);
    assertEquals(result.ok, true);
    if (result.ok) {
      assertEquals(result.value.secure, true);
      assertEquals(result.value.mode, 0o600);
    }
  } finally {
    await Deno.remove(tmpFile);
  }
});

Deno.test("verifyKeyFilePermissions: reports insecure for 0o644 file", async () => {
  if (Deno.build.os === "windows") return;

  const tmpFile = await Deno.makeTempFile({ prefix: "tf-key-test-" });
  try {
    await Deno.writeFile(tmpFile, new Uint8Array(32), { mode: 0o644 });
    await Deno.chmod(tmpFile, 0o644);

    const result = await verifyKeyFilePermissions(tmpFile);
    assertEquals(result.ok, true);
    if (result.ok) {
      assertEquals(result.value.secure, false);
      assertEquals(result.value.mode, 0o644);
      assertEquals(result.value.message.includes("insecure"), true);
    }
  } finally {
    await Deno.remove(tmpFile);
  }
});

Deno.test("verifyKeyFilePermissions: reports insecure for 0o666 file", async () => {
  if (Deno.build.os === "windows") return;

  const tmpFile = await Deno.makeTempFile({ prefix: "tf-key-test-" });
  try {
    await Deno.writeFile(tmpFile, new Uint8Array(32), { mode: 0o666 });
    await Deno.chmod(tmpFile, 0o666);

    const result = await verifyKeyFilePermissions(tmpFile);
    assertEquals(result.ok, true);
    if (result.ok) {
      assertEquals(result.value.secure, false);
      assertEquals(result.value.message.includes("insecure"), true);
    }
  } finally {
    await Deno.remove(tmpFile);
  }
});
