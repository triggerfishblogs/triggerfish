/**
 * Security tests for the filesystem sandbox — verifies OS-level
 * enforcement via Deno's permission system.
 *
 * These tests prove that even if the application-level path validation
 * had a bug, the Deno permission layer would block access outside
 * the workspace at the OS level.
 */

import { assertEquals, assertStringIncludes } from "@std/assert";
import { join } from "@std/path";
import { createFilesystemSandbox } from "../../../src/exec/sandbox/client.ts";

Deno.test("security: cannot read /etc/passwd via sandbox", async () => {
  const tmpDir = await Deno.makeTempDir({ prefix: "sandbox-sec-" });

  const sandbox = createFilesystemSandbox({
    resolveWorkspacePath: () => tmpDir,
  });
  try {
    const resp = await sandbox.request({
      id: "",
      op: "read",
      args: { path: "/etc/passwd" },
    });
    assertEquals(resp.ok, false);
    const errText = resp.error ?? "";
    const isBlocked = errText.includes("Permission denied") ||
      errText.includes("No such file or directory");
    assertEquals(
      isBlocked,
      true,
      `Expected /etc/passwd blocked, got: ${errText}`,
    );
  } finally {
    await sandbox.shutdown();
    await Deno.remove(tmpDir, { recursive: true });
  }
});

Deno.test("security: cannot write to /tmp/outside via sandbox", async () => {
  const tmpDir = await Deno.makeTempDir({ prefix: "sandbox-sec-" });

  const sandbox = createFilesystemSandbox({
    resolveWorkspacePath: () => tmpDir,
  });
  try {
    const resp = await sandbox.request({
      id: "",
      op: "write",
      args: { path: "/tmp/sandbox-escape-test.txt", content: "escaped!" },
    });
    assertEquals(resp.ok, false);
    const errText = resp.error ?? "";
    const isBlocked = errText.includes("Permission denied") ||
      errText.includes("No such file or directory");
    assertEquals(
      isBlocked,
      true,
      `Expected /tmp write blocked, got: ${errText}`,
    );
  } finally {
    await sandbox.shutdown();
    await Deno.remove(tmpDir, { recursive: true });
  }
});

Deno.test("security: path traversal ../../etc/passwd blocked", async () => {
  const tmpDir = await Deno.makeTempDir({ prefix: "sandbox-sec-" });

  const sandbox = createFilesystemSandbox({
    resolveWorkspacePath: () => tmpDir,
  });
  try {
    const traversalPath = join(tmpDir, "..", "..", "etc", "passwd");
    const resp = await sandbox.request({
      id: "",
      op: "read",
      args: { path: traversalPath },
    });
    assertEquals(resp.ok, false);
    const errText = resp.error ?? "";
    const isBlocked = errText.includes("Permission denied") ||
      errText.includes("No such file or directory");
    assertEquals(
      isBlocked,
      true,
      `Expected traversal blocked, got: ${errText}`,
    );
  } finally {
    await sandbox.shutdown();
    await Deno.remove(tmpDir, { recursive: true });
  }
});

Deno.test("security: cannot list root directory via sandbox", async () => {
  const tmpDir = await Deno.makeTempDir({ prefix: "sandbox-sec-" });

  const sandbox = createFilesystemSandbox({
    resolveWorkspacePath: () => tmpDir,
  });
  try {
    const resp = await sandbox.request({
      id: "",
      op: "list",
      args: { path: "/" },
    });
    assertEquals(resp.ok, false);
    const errText = resp.error ?? "";
    const isBlocked = errText.includes("Permission denied") ||
      errText.includes("No such file or directory");
    assertEquals(
      isBlocked,
      true,
      `Expected root listing blocked, got: ${errText}`,
    );
  } finally {
    await sandbox.shutdown();
    await Deno.remove(tmpDir, { recursive: true });
  }
});

Deno.test("security: cannot edit file outside workspace", async () => {
  const tmpDir = await Deno.makeTempDir({ prefix: "sandbox-sec-" });

  const sandbox = createFilesystemSandbox({
    resolveWorkspacePath: () => tmpDir,
  });
  try {
    const resp = await sandbox.request({
      id: "",
      op: "edit",
      args: {
        path: "/etc/hostname",
        old_text: "host",
        new_text: "pwned",
      },
    });
    assertEquals(resp.ok, false);
    const errText = resp.error ?? "";
    const isBlocked = errText.includes("Permission denied") ||
      errText.includes("No such file or directory");
    assertEquals(
      isBlocked,
      true,
      `Expected edit outside workspace blocked, got: ${errText}`,
    );
  } finally {
    await sandbox.shutdown();
    await Deno.remove(tmpDir, { recursive: true });
  }
});

Deno.test("security: search outside workspace blocked", async () => {
  const tmpDir = await Deno.makeTempDir({ prefix: "sandbox-sec-" });

  const sandbox = createFilesystemSandbox({
    resolveWorkspacePath: () => tmpDir,
  });
  try {
    const resp = await sandbox.request({
      id: "",
      op: "search",
      args: { path: "/etc", pattern: "*.conf" },
    });
    assertEquals(resp.ok, false);
    const errText = resp.error ?? "";
    const isBlocked = errText.includes("Permission denied") ||
      errText.includes("No such file or directory");
    assertEquals(
      isBlocked,
      true,
      `Expected search outside workspace blocked, got: ${errText}`,
    );
  } finally {
    await sandbox.shutdown();
    await Deno.remove(tmpDir, { recursive: true });
  }
});

Deno.test("security: workspace operations still work alongside restrictions", async () => {
  const tmpDir = await Deno.makeTempDir({ prefix: "sandbox-sec-" });
  await Deno.writeTextFile(join(tmpDir, "safe.txt"), "safe content");

  const sandbox = createFilesystemSandbox({
    resolveWorkspacePath: () => tmpDir,
  });
  try {
    // Read inside workspace works
    const readResp = await sandbox.request({
      id: "",
      op: "read",
      args: { path: join(tmpDir, "safe.txt") },
    });
    assertEquals(readResp.ok, true);
    assertEquals(readResp.result, "safe content");

    // Read outside workspace blocked
    const outsideResp = await sandbox.request({
      id: "",
      op: "read",
      args: { path: "/etc/passwd" },
    });
    assertEquals(outsideResp.ok, false);

    // Write inside workspace works
    const writeResp = await sandbox.request({
      id: "",
      op: "write",
      args: { path: join(tmpDir, "new.txt"), content: "new" },
    });
    assertEquals(writeResp.ok, true);
    assertStringIncludes(writeResp.result!, "bytes");
  } finally {
    await sandbox.shutdown();
    await Deno.remove(tmpDir, { recursive: true });
  }
});
