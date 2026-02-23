/**
 * Tests for src/integrations/filesystem/server.ts
 *
 * Covers happy-path file operations and path traversal protections, including
 * the prefix-ambiguity fix (sibling path that shares a prefix with the root).
 */
import { assertEquals, assertStringIncludes } from "@std/assert";
import {
  createFilesystemServer,
} from "../../../src/integrations/filesystem/server.ts";

// --- Happy path ---

Deno.test("FilesystemServer: read_file within root succeeds", async () => {
  const root = await Deno.makeTempDir();
  await Deno.writeTextFile(`${root}/hello.txt`, "hello world");
  const server = createFilesystemServer({ rootPath: root, classification: "INTERNAL" });
  try {
    const result = await server.callTool("read_file", { path: "hello.txt" });
    assertEquals(result.ok, true);
    if (result.ok) {
      assertStringIncludes(result.value.content, "hello world");
      assertEquals(result.value.classification, "INTERNAL");
    }
  } finally {
    await Deno.remove(root, { recursive: true });
  }
});

Deno.test("FilesystemServer: write_file within root succeeds", async () => {
  const root = await Deno.makeTempDir();
  const server = createFilesystemServer({ rootPath: root, classification: "INTERNAL" });
  try {
    const result = await server.callTool("write_file", {
      path: "output.txt",
      content: "test content",
    });
    assertEquals(result.ok, true);
    const written = await Deno.readTextFile(`${root}/output.txt`);
    assertEquals(written, "test content");
  } finally {
    await Deno.remove(root, { recursive: true });
  }
});

Deno.test("FilesystemServer: list_directory within root succeeds", async () => {
  const root = await Deno.makeTempDir();
  await Deno.writeTextFile(`${root}/a.txt`, "a");
  await Deno.writeTextFile(`${root}/b.txt`, "b");
  const server = createFilesystemServer({ rootPath: root, classification: "INTERNAL" });
  try {
    const result = await server.callTool("list_directory", { path: "." });
    assertEquals(result.ok, true);
    if (result.ok && result.value.entries) {
      const names = result.value.entries.map((e) => e.name);
      assertEquals(names.includes("a.txt"), true);
      assertEquals(names.includes("b.txt"), true);
    }
  } finally {
    await Deno.remove(root, { recursive: true });
  }
});

// --- Traversal attempts — all must be blocked ---

Deno.test("FilesystemServer: read_file with ../ is blocked", async () => {
  const root = await Deno.makeTempDir();
  const server = createFilesystemServer({ rootPath: root, classification: "INTERNAL" });
  try {
    const result = await server.callTool("read_file", { path: "../escape.txt" });
    assertEquals(result.ok, false);
  } finally {
    await Deno.remove(root, { recursive: true });
  }
});

Deno.test("FilesystemServer: read_file with ../../etc/passwd is blocked", async () => {
  const root = await Deno.makeTempDir();
  const server = createFilesystemServer({ rootPath: root, classification: "INTERNAL" });
  try {
    const result = await server.callTool("read_file", {
      path: "../../etc/passwd",
    });
    assertEquals(result.ok, false);
  } finally {
    await Deno.remove(root, { recursive: true });
  }
});

Deno.test("FilesystemServer: write_file with ../ is blocked", async () => {
  const root = await Deno.makeTempDir();
  const server = createFilesystemServer({ rootPath: root, classification: "INTERNAL" });
  try {
    const result = await server.callTool("write_file", {
      path: "../evil.txt",
      content: "pwned",
    });
    assertEquals(result.ok, false);
  } finally {
    await Deno.remove(root, { recursive: true });
  }
});

Deno.test("FilesystemServer: list_directory with ../ is blocked", async () => {
  const root = await Deno.makeTempDir();
  const server = createFilesystemServer({ rootPath: root, classification: "INTERNAL" });
  try {
    const result = await server.callTool("list_directory", { path: "../" });
    assertEquals(result.ok, false);
  } finally {
    await Deno.remove(root, { recursive: true });
  }
});

Deno.test("FilesystemServer: sibling path with shared prefix is blocked (prefix-ambiguity)", async () => {
  // Create /tmp/rootXXX, then try to access /tmp/rootXXXmalicious
  const root = await Deno.makeTempDir();
  const sibling = root + "malicious";
  await Deno.mkdir(sibling, { recursive: true });
  await Deno.writeTextFile(`${sibling}/secret.txt`, "sensitive");
  const server = createFilesystemServer({ rootPath: root, classification: "INTERNAL" });
  try {
    // Attempt to escape via absolute path that shares root's prefix
    const result = await server.callTool("read_file", {
      path: `${sibling}/secret.txt`,
    });
    assertEquals(result.ok, false);
  } finally {
    await Deno.remove(root, { recursive: true });
    await Deno.remove(sibling, { recursive: true }).catch(() => {});
  }
});
