/**
 * Tests for the sandbox worker — verifies filesystem operations
 * within the workspace and error handling.
 */

import { assertEquals, assertStringIncludes } from "@std/assert";
import { join } from "@std/path";
import type {
  SandboxRequest,
  SandboxResponse,
} from "../../../src/exec/sandbox/protocol.ts";

/** Spawn a worker process restricted to the given workspace. */
function spawnWorker(workspacePath: string): {
  process: Deno.ChildProcess;
  send: (req: SandboxRequest) => Promise<void>;
  receive: () => Promise<SandboxResponse>;
  close: () => Promise<void>;
} {
  const workerPath = new URL(
    "../../../src/exec/sandbox/worker.ts",
    import.meta.url,
  );
  const cmd = new Deno.Command(Deno.execPath(), {
    args: [
      "run",
      "--no-prompt",
      "--deny-net",
      "--deny-env",
      "--deny-ffi",
      `--allow-read=${workspacePath}`,
      `--allow-write=${workspacePath}`,
      "--allow-run=grep,find",
      workerPath.pathname,
      workspacePath,
    ],
    stdin: "piped",
    stdout: "piped",
    stderr: "piped",
  });
  const process = cmd.spawn();
  const writer = process.stdin.getWriter();
  const stdoutReader = process.stdout.getReader();
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let buffer = "";

  return {
    process,
    async send(req: SandboxRequest) {
      await writer.write(encoder.encode(JSON.stringify(req) + "\n"));
    },
    async receive(): Promise<SandboxResponse> {
      while (true) {
        const newlineIdx = buffer.indexOf("\n");
        if (newlineIdx >= 0) {
          const line = buffer.slice(0, newlineIdx).trim();
          buffer = buffer.slice(newlineIdx + 1);
          if (line.length > 0) {
            return JSON.parse(line) as SandboxResponse;
          }
        }
        const { done, value } = await stdoutReader.read();
        if (done) throw new Error("Worker stdout ended unexpectedly");
        buffer += decoder.decode(value, { stream: true });
      }
    },
    async close() {
      try {
        await writer.close();
      } catch { /* already closed */ }
      try {
        process.kill();
      } catch { /* already dead */ }
      try {
        stdoutReader.releaseLock();
      } catch { /* already released */ }
      try {
        await process.stdout.cancel();
      } catch { /* already done */ }
      try {
        await process.stderr.cancel();
      } catch { /* already done */ }
      try {
        await process.status;
      } catch { /* already resolved */ }
    },
  };
}

Deno.test("worker: read file within workspace", async () => {
  const tmpDir = await Deno.makeTempDir({ prefix: "sandbox-test-" });
  const testFile = join(tmpDir, "hello.txt");
  await Deno.writeTextFile(testFile, "hello world");

  const w = spawnWorker(tmpDir);
  try {
    await w.send({ id: "1", op: "read", args: { path: testFile } });
    const resp = await w.receive();
    assertEquals(resp.id, "1");
    assertEquals(resp.ok, true);
    assertEquals(resp.result, "hello world");
  } finally {
    await w.close();
    await Deno.remove(tmpDir, { recursive: true });
  }
});

Deno.test("worker: write file within workspace", async () => {
  const tmpDir = await Deno.makeTempDir({ prefix: "sandbox-test-" });
  const testFile = join(tmpDir, "output.txt");

  const w = spawnWorker(tmpDir);
  try {
    await w.send({
      id: "2",
      op: "write",
      args: { path: testFile, content: "written content" },
    });
    const resp = await w.receive();
    assertEquals(resp.id, "2");
    assertEquals(resp.ok, true);
    assertStringIncludes(resp.result!, "bytes");

    const content = await Deno.readTextFile(testFile);
    assertEquals(content, "written content");
  } finally {
    await w.close();
    await Deno.remove(tmpDir, { recursive: true });
  }
});

Deno.test("worker: write creates parent directories", async () => {
  const tmpDir = await Deno.makeTempDir({ prefix: "sandbox-test-" });
  const nestedFile = join(tmpDir, "a", "b", "deep.txt");

  const w = spawnWorker(tmpDir);
  try {
    await w.send({
      id: "3",
      op: "write",
      args: { path: nestedFile, content: "deep" },
    });
    const resp = await w.receive();
    assertEquals(resp.ok, true);

    const content = await Deno.readTextFile(nestedFile);
    assertEquals(content, "deep");
  } finally {
    await w.close();
    await Deno.remove(tmpDir, { recursive: true });
  }
});

Deno.test("worker: list directory within workspace", async () => {
  const tmpDir = await Deno.makeTempDir({ prefix: "sandbox-test-" });
  await Deno.writeTextFile(join(tmpDir, "a.txt"), "a");
  await Deno.mkdir(join(tmpDir, "subdir"));

  const w = spawnWorker(tmpDir);
  try {
    await w.send({ id: "4", op: "list", args: { path: tmpDir } });
    const resp = await w.receive();
    assertEquals(resp.ok, true);
    assertStringIncludes(resp.result!, "a.txt");
    assertStringIncludes(resp.result!, "subdir/");
  } finally {
    await w.close();
    await Deno.remove(tmpDir, { recursive: true });
  }
});

Deno.test("worker: edit file with unique replacement", async () => {
  const tmpDir = await Deno.makeTempDir({ prefix: "sandbox-test-" });
  const testFile = join(tmpDir, "edit.txt");
  await Deno.writeTextFile(testFile, "foo bar baz");

  const w = spawnWorker(tmpDir);
  try {
    await w.send({
      id: "5",
      op: "edit",
      args: { path: testFile, old_text: "bar", new_text: "qux" },
    });
    const resp = await w.receive();
    assertEquals(resp.ok, true);
    assertStringIncludes(resp.result!, "Edited");

    const content = await Deno.readTextFile(testFile);
    assertEquals(content, "foo qux baz");
  } finally {
    await w.close();
    await Deno.remove(tmpDir, { recursive: true });
  }
});

Deno.test("worker: edit fails when old_text not found", async () => {
  const tmpDir = await Deno.makeTempDir({ prefix: "sandbox-test-" });
  const testFile = join(tmpDir, "edit2.txt");
  await Deno.writeTextFile(testFile, "foo bar baz");

  const w = spawnWorker(tmpDir);
  try {
    await w.send({
      id: "6",
      op: "edit",
      args: { path: testFile, old_text: "MISSING", new_text: "x" },
    });
    const resp = await w.receive();
    assertEquals(resp.ok, false);
    assertStringIncludes(resp.error!, "not found");
  } finally {
    await w.close();
    await Deno.remove(tmpDir, { recursive: true });
  }
});

Deno.test("worker: edit fails when old_text is not unique", async () => {
  const tmpDir = await Deno.makeTempDir({ prefix: "sandbox-test-" });
  const testFile = join(tmpDir, "edit3.txt");
  await Deno.writeTextFile(testFile, "aaa aaa aaa");

  const w = spawnWorker(tmpDir);
  try {
    await w.send({
      id: "7",
      op: "edit",
      args: { path: testFile, old_text: "aaa", new_text: "bbb" },
    });
    const resp = await w.receive();
    assertEquals(resp.ok, false);
    assertStringIncludes(resp.error!, "3 times");
  } finally {
    await w.close();
    await Deno.remove(tmpDir, { recursive: true });
  }
});

Deno.test("worker: read nonexistent file returns error", async () => {
  const tmpDir = await Deno.makeTempDir({ prefix: "sandbox-test-" });

  const w = spawnWorker(tmpDir);
  try {
    await w.send({
      id: "8",
      op: "read",
      args: { path: join(tmpDir, "nope.txt") },
    });
    const resp = await w.receive();
    assertEquals(resp.ok, false);
  } finally {
    await w.close();
    await Deno.remove(tmpDir, { recursive: true });
  }
});

Deno.test("worker: path traversal blocked by app validation", async () => {
  const tmpDir = await Deno.makeTempDir({ prefix: "sandbox-test-" });

  const w = spawnWorker(tmpDir);
  try {
    await w.send({
      id: "9",
      op: "read",
      args: { path: join(tmpDir, "..", "..", "etc", "passwd") },
    });
    const resp = await w.receive();
    assertEquals(resp.ok, false);
    // Either app-level or Deno permission level blocks it
    const errText = resp.error ?? "";
    const isBlocked = errText.includes("Permission denied") ||
      errText.includes("No such file or directory");
    assertEquals(isBlocked, true, `Expected blocked, got: ${errText}`);
  } finally {
    await w.close();
    await Deno.remove(tmpDir, { recursive: true });
  }
});

Deno.test("worker: search files (name search)", async () => {
  const tmpDir = await Deno.makeTempDir({ prefix: "sandbox-test-" });
  await Deno.writeTextFile(join(tmpDir, "test.ts"), "code");
  await Deno.writeTextFile(join(tmpDir, "README.md"), "readme");

  const w = spawnWorker(tmpDir);
  try {
    await w.send({
      id: "10",
      op: "search",
      args: { path: tmpDir, pattern: "*.ts" },
    });
    const resp = await w.receive();
    assertEquals(resp.ok, true);
    assertStringIncludes(resp.result!, "test.ts");
  } finally {
    await w.close();
    await Deno.remove(tmpDir, { recursive: true });
  }
});

Deno.test("worker: search files (content search)", async () => {
  const tmpDir = await Deno.makeTempDir({ prefix: "sandbox-test-" });
  await Deno.writeTextFile(join(tmpDir, "data.txt"), "findme needle");

  const w = spawnWorker(tmpDir);
  try {
    await w.send({
      id: "11",
      op: "search",
      args: { path: tmpDir, pattern: "needle", content_search: true },
    });
    const resp = await w.receive();
    assertEquals(resp.ok, true);
    assertStringIncludes(resp.result!, "data.txt");
  } finally {
    await w.close();
    await Deno.remove(tmpDir, { recursive: true });
  }
});
