/**
 * Tests for the file writer with rotation.
 */
import { assertEquals, assert } from "@std/assert";
import { join } from "@std/path";
import { createFileWriter } from "../../../src/core/logger/writer.ts";

Deno.test("FileWriter: writes lines to log file", async () => {
  const tmpDir = await Deno.makeTempDir();
  const writer = await createFileWriter({ logDir: tmpDir, baseName: "test" });

  await writer.write("line one\n");
  await writer.write("line two\n");
  await writer.close();

  const content = await Deno.readTextFile(join(tmpDir, "test.log"));
  assertEquals(content, "line one\nline two\n");

  await Deno.remove(tmpDir, { recursive: true });
});

Deno.test("FileWriter: rotates when exceeding maxBytes", async () => {
  const tmpDir = await Deno.makeTempDir();
  // Small maxBytes to trigger rotation quickly
  const writer = await createFileWriter({
    logDir: tmpDir,
    baseName: "rot",
    maxBytes: 50,
    maxFiles: 3,
  });

  // Write enough to exceed 50 bytes — each line is ~20 bytes
  await writer.write("aaaaaaaaaaaaaaaaaaa\n"); // 20 bytes
  await writer.write("bbbbbbbbbbbbbbbbbbb\n"); // 20 bytes → 40 bytes
  await writer.write("ccccccccccccccccccc\n"); // 20 bytes → 60 bytes, triggers rotation

  // After rotation, the main file should contain only new content
  // and rot.1.log should contain the old content
  await writer.write("ddddddddddddddddddd\n"); // written to fresh file
  await writer.close();

  // rot.1.log should exist (the rotated file)
  const rotated = await Deno.readTextFile(join(tmpDir, "rot.1.log"));
  assert(rotated.length > 0, "rotated file should have content");

  // The current log should have the post-rotation content
  const current = await Deno.readTextFile(join(tmpDir, "rot.log"));
  assert(current.includes("ddd"), "current file should have post-rotation content");

  await Deno.remove(tmpDir, { recursive: true });
});

Deno.test("FileWriter: respects maxFiles limit", async () => {
  const tmpDir = await Deno.makeTempDir();
  const writer = await createFileWriter({
    logDir: tmpDir,
    baseName: "lim",
    maxBytes: 20,
    maxFiles: 2,
  });

  // Trigger multiple rotations
  for (let i = 0; i < 5; i++) {
    await writer.write(`line-${i}-padding!!\n`); // ~20 bytes each
  }
  await writer.close();

  // Should have lim.log, lim.1.log, lim.2.log but NOT lim.3.log
  const entries = [];
  for await (const entry of Deno.readDir(tmpDir)) {
    entries.push(entry.name);
  }

  assert(entries.includes("lim.log"), "main log should exist");
  // There should be at most maxFiles (2) rotated files
  const rotatedCount = entries.filter((e) => /^lim\.\d+\.log$/.test(e)).length;
  assert(rotatedCount <= 2, `should have at most 2 rotated files, got ${rotatedCount}`);

  await Deno.remove(tmpDir, { recursive: true });
});

Deno.test("FileWriter: creates log directory if missing", async () => {
  const tmpDir = await Deno.makeTempDir();
  const nestedDir = join(tmpDir, "sub", "logs");

  const writer = await createFileWriter({
    logDir: nestedDir,
    baseName: "test",
  });
  await writer.write("hello\n");
  await writer.close();

  const content = await Deno.readTextFile(join(nestedDir, "test.log"));
  assertEquals(content, "hello\n");

  await Deno.remove(tmpDir, { recursive: true });
});

Deno.test("FileWriter: close is idempotent", async () => {
  const tmpDir = await Deno.makeTempDir();
  const writer = await createFileWriter({ logDir: tmpDir, baseName: "test" });
  await writer.write("data\n");
  await writer.close();
  // Second close should not throw
  await writer.close();
  await Deno.remove(tmpDir, { recursive: true });
});

Deno.test("FileWriter: appends to existing file", async () => {
  const tmpDir = await Deno.makeTempDir();
  const logPath = join(tmpDir, "app.log");

  // Pre-populate
  await Deno.writeTextFile(logPath, "existing\n");

  const writer = await createFileWriter({ logDir: tmpDir, baseName: "app" });
  await writer.write("new line\n");
  await writer.close();

  const content = await Deno.readTextFile(logPath);
  assertEquals(content, "existing\nnew line\n");

  await Deno.remove(tmpDir, { recursive: true });
});
