/**
 * Phase 11: Agent Execution Environment
 * Tests MUST FAIL until exec tools, workspace, and runner are implemented.
 * Tests write/run/read cycle, isolation, denied commands.
 */
import { assertEquals, assertExists, assert, assertStringIncludes } from "jsr:@std/assert";
import { createWorkspace } from "../../src/exec/workspace.ts";
import { createExecTools } from "../../src/exec/tools.ts";
import { createExecRunner } from "../../src/exec/runner.ts";

Deno.test("Workspace: creates isolated directory for agent", async () => {
  const ws = await createWorkspace({ agentId: "test-agent", basePath: await Deno.makeTempDir() });
  try {
    const stat = await Deno.stat(ws.path);
    assert(stat.isDirectory);
    assertExists(ws.scratchPath);
    assertExists(ws.integrationsPath);
    assertExists(ws.skillsPath);
  } finally {
    await ws.destroy();
  }
});

Deno.test("ExecTools: write and read file in workspace", async () => {
  const tmpDir = await Deno.makeTempDir();
  const ws = await createWorkspace({ agentId: "test", basePath: tmpDir });
  const tools = createExecTools(ws);
  try {
    const writeResult = await tools.write("test.ts", 'console.log("hello");\n');
    assertEquals(writeResult.ok, true);

    const readResult = await tools.read("test.ts");
    assertEquals(readResult.ok, true);
    if (readResult.ok) {
      assertStringIncludes(readResult.value, "hello");
    }
  } finally {
    await ws.destroy();
  }
});

Deno.test("ExecTools: run returns stdout, stderr, exit code", async () => {
  const tmpDir = await Deno.makeTempDir();
  const ws = await createWorkspace({ agentId: "test", basePath: tmpDir });
  const tools = createExecTools(ws);
  try {
    const result = await tools.run("echo hello");
    assertEquals(result.ok, true);
    if (result.ok) {
      assertStringIncludes(result.value.stdout, "hello");
      assertEquals(result.value.exitCode, 0);
      assert(typeof result.value.duration === "number");
    }
  } finally {
    await ws.destroy();
  }
});

Deno.test("ExecTools: run captures stderr and nonzero exit", async () => {
  const tmpDir = await Deno.makeTempDir();
  const ws = await createWorkspace({ agentId: "test", basePath: tmpDir });
  const tools = createExecTools(ws);
  try {
    const result = await tools.run("ls /nonexistent_directory_xyz");
    assertEquals(result.ok, true); // The tool succeeds in running, exit code is nonzero
    if (result.ok) {
      assert(result.value.exitCode !== 0);
      assert(result.value.stderr.length > 0);
    }
  } finally {
    await ws.destroy();
  }
});

Deno.test("ExecTools: write outside workspace is blocked", async () => {
  const tmpDir = await Deno.makeTempDir();
  const ws = await createWorkspace({ agentId: "test", basePath: tmpDir });
  const tools = createExecTools(ws);
  try {
    const result = await tools.write("../../etc/evil.txt", "pwned");
    assertEquals(result.ok, false);
  } finally {
    await ws.destroy();
  }
});

Deno.test("ExecRunner: blocks denied commands", async () => {
  const tmpDir = await Deno.makeTempDir();
  const ws = await createWorkspace({ agentId: "test", basePath: tmpDir });
  const runner = createExecRunner(ws, {
    denyList: ["rm -rf /", "sudo", "chmod 777"],
  });
  try {
    const result = await runner.execute("sudo rm -rf /");
    assertEquals(result.ok, false);
  } finally {
    await ws.destroy();
  }
});

Deno.test("ExecTools: ls lists workspace files", async () => {
  const tmpDir = await Deno.makeTempDir();
  const ws = await createWorkspace({ agentId: "test", basePath: tmpDir });
  const tools = createExecTools(ws);
  try {
    await tools.write("file1.ts", "content1");
    await tools.write("file2.ts", "content2");
    const result = await tools.ls();
    assertEquals(result.ok, true);
    if (result.ok) {
      assert(result.value.some((f) => f.name === "file1.ts"));
      assert(result.value.some((f) => f.name === "file2.ts"));
    }
  } finally {
    await ws.destroy();
  }
});

Deno.test("ExecRunner: logs all executions", async () => {
  const tmpDir = await Deno.makeTempDir();
  const ws = await createWorkspace({ agentId: "test", basePath: tmpDir });
  const runner = createExecRunner(ws);
  try {
    await runner.execute("echo test");
    const history = await runner.getHistory();
    assert(history.length >= 1);
    assertExists(history[0].command);
    assertExists(history[0].timestamp);
  } finally {
    await ws.destroy();
  }
});
