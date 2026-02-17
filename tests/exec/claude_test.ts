/**
 * Tests for the Claude Code CLI session manager (exec.claude).
 *
 * Uses a mock script to simulate the `claude` binary since the real
 * CLI is not available in CI. Tests cover session lifecycle, config
 * validation, timeout, concurrent sessions, output parsing, and
 * classification boundary enforcement.
 */
import {
  assert,
  assertEquals,
  assertExists,
  assertStringIncludes,
} from "@std/assert";
import { join } from "@std/path";
import {
  createClaudeSessionManager,
  createClaudeToolExecutor,
  getClaudeToolDefinitions,
  CLAUDE_SESSION_SYSTEM_PROMPT,
} from "../../src/exec/claude.ts";
import type { ClaudeSessionManager } from "../../src/exec/claude.ts";
import { HARDCODED_TOOL_FLOORS } from "../../src/core/security/constants.ts";

// --- Mock claude binary ---

/** Write a mock claude script that echoes stream-json output. */
async function createMockClaude(dir: string): Promise<string> {
  const scriptPath = join(dir, "mock-claude.sh");
  // The mock script reads args, outputs a stream-json result message,
  // then waits for stdin and echoes back.
  const script = `#!/bin/bash
# Mock claude CLI for testing
# Output a stream-json assistant message followed by a result message
echo '{"type":"assistant","message":{"content":[{"type":"text","text":"Mock response to: $*"}]}}'
echo '{"type":"result","result":"Mock result complete","subtype":"success","is_error":false,"num_turns":1}'

# If --input-format stream-json is used, read stdin for follow-up messages
while IFS= read -r line; do
  if [ -z "$line" ]; then
    continue
  fi
  echo '{"type":"assistant","message":{"content":[{"type":"text","text":"Follow-up response"}]}}'
  echo '{"type":"result","result":"Follow-up complete","subtype":"success","is_error":false}'
done
`;
  await Deno.writeTextFile(scriptPath, script);
  await Deno.chmod(scriptPath, 0o755);
  return scriptPath;
}

/** Write a mock claude script that hangs (for timeout testing). */
async function createHangingMockClaude(dir: string): Promise<string> {
  const scriptPath = join(dir, "hanging-claude.sh");
  const script = `#!/bin/bash
# Mock claude that hangs forever
echo '{"type":"assistant","message":{"content":[{"type":"text","text":"Started..."}]}}'
sleep 3600
`;
  await Deno.writeTextFile(scriptPath, script);
  await Deno.chmod(scriptPath, 0o755);
  return scriptPath;
}

/** Write a mock claude that exits with an error code. */
async function createFailingMockClaude(dir: string): Promise<string> {
  const scriptPath = join(dir, "failing-claude.sh");
  const script = `#!/bin/bash
echo '{"type":"result","result":"Error occurred","is_error":true}'
exit 1
`;
  await Deno.writeTextFile(scriptPath, script);
  await Deno.chmod(scriptPath, 0o755);
  return scriptPath;
}

// --- Unit tests ---

Deno.test("ClaudeSessionManager: start returns running session", async () => {
  const tmpDir = await Deno.makeTempDir();
  const mockBin = await createMockClaude(tmpDir);
  const manager = createClaudeSessionManager({
    workspacePath: tmpDir,
    claudeBinary: mockBin,
  });

  try {
    const result = await manager.start("Hello, Claude!");
    assertEquals(result.ok, true);
    if (result.ok) {
      assertEquals(result.value.status, "running");
      assertExists(result.value.id);
      assertExists(result.value.pid);
      assertExists(result.value.startedAt);
      assertEquals(result.value.endedAt, null);
      assertEquals(result.value.exitCode, null);
    }
  } finally {
    // Cleanup all sessions
    for (const s of manager.list()) {
      await manager.stop(s.id);
    }
    await Deno.remove(tmpDir, { recursive: true });
  }
});

Deno.test("ClaudeSessionManager: status returns session state", async () => {
  const tmpDir = await Deno.makeTempDir();
  const mockBin = await createMockClaude(tmpDir);
  const manager = createClaudeSessionManager({
    workspacePath: tmpDir,
    claudeBinary: mockBin,
  });

  try {
    const startResult = await manager.start("Test prompt");
    assert(startResult.ok);
    if (!startResult.ok) return;

    const statusResult = manager.status(startResult.value.id);
    assertEquals(statusResult.ok, true);
    if (statusResult.ok) {
      assertEquals(statusResult.value.id, startResult.value.id);
      assertEquals(statusResult.value.pid, startResult.value.pid);
    }
  } finally {
    for (const s of manager.list()) {
      await manager.stop(s.id);
    }
    await Deno.remove(tmpDir, { recursive: true });
  }
});

Deno.test("ClaudeSessionManager: stop terminates session", async () => {
  const tmpDir = await Deno.makeTempDir();
  const mockBin = await createHangingMockClaude(tmpDir);
  const manager = createClaudeSessionManager({
    workspacePath: tmpDir,
    claudeBinary: mockBin,
  });

  try {
    const startResult = await manager.start("Long running task");
    assert(startResult.ok);
    if (!startResult.ok) return;

    const stopResult = await manager.stop(startResult.value.id);
    assertEquals(stopResult.ok, true);

    const statusResult = manager.status(startResult.value.id);
    assert(statusResult.ok);
    if (statusResult.ok) {
      assert(
        statusResult.value.status === "terminated" ||
          statusResult.value.status === "completed" ||
          statusResult.value.status === "failed",
      );
    }
  } finally {
    await Deno.remove(tmpDir, { recursive: true });
  }
});

Deno.test("ClaudeSessionManager: list returns all sessions", async () => {
  const tmpDir = await Deno.makeTempDir();
  const mockBin = await createMockClaude(tmpDir);
  const manager = createClaudeSessionManager({
    workspacePath: tmpDir,
    claudeBinary: mockBin,
  });

  try {
    await manager.start("Task 1");
    await manager.start("Task 2");

    const sessions = manager.list();
    assertEquals(sessions.length, 2);
  } finally {
    for (const s of manager.list()) {
      await manager.stop(s.id);
    }
    await Deno.remove(tmpDir, { recursive: true });
  }
});

Deno.test("ClaudeSessionManager: getOutput returns accumulated output", async () => {
  const tmpDir = await Deno.makeTempDir();
  const mockBin = await createMockClaude(tmpDir);
  const manager = createClaudeSessionManager({
    workspacePath: tmpDir,
    claudeBinary: mockBin,
  });

  try {
    const startResult = await manager.start("Hello test");
    assert(startResult.ok);
    if (!startResult.ok) return;

    // Wait briefly for output to accumulate
    await new Promise((r) => setTimeout(r, 500));

    const outputResult = manager.getOutput(startResult.value.id);
    assertEquals(outputResult.ok, true);
    if (outputResult.ok) {
      assert(outputResult.value.length > 0);
    }
  } finally {
    for (const s of manager.list()) {
      await manager.stop(s.id);
    }
    await Deno.remove(tmpDir, { recursive: true });
  }
});

Deno.test("ClaudeSessionManager: config defaults applied", async () => {
  const tmpDir = await Deno.makeTempDir();
  const mockBin = await createMockClaude(tmpDir);
  const manager = createClaudeSessionManager({
    workspacePath: tmpDir,
    claudeBinary: mockBin,
  });

  try {
    const result = await manager.start("Hello");
    assert(result.ok);
    if (!result.ok) return;

    assertEquals(result.value.config.timeoutMs, 300_000);
    assertEquals(result.value.config.permissionMode, "bypassPermissions");
  } finally {
    for (const s of manager.list()) {
      await manager.stop(s.id);
    }
    await Deno.remove(tmpDir, { recursive: true });
  }
});

Deno.test("ClaudeSessionManager: config override works", async () => {
  const tmpDir = await Deno.makeTempDir();
  const mockBin = await createMockClaude(tmpDir);
  const manager = createClaudeSessionManager({
    workspacePath: tmpDir,
    claudeBinary: mockBin,
  });

  try {
    const result = await manager.start("Hello", {
      model: "sonnet",
      maxTurns: 5,
      timeoutMs: 60_000,
      maxBudgetUsd: 0.50,
    });
    assert(result.ok);
    if (!result.ok) return;

    assertEquals(result.value.config.model, "sonnet");
    assertEquals(result.value.config.maxTurns, 5);
    assertEquals(result.value.config.timeoutMs, 60_000);
    assertEquals(result.value.config.maxBudgetUsd, 0.50);
  } finally {
    for (const s of manager.list()) {
      await manager.stop(s.id);
    }
    await Deno.remove(tmpDir, { recursive: true });
  }
});

Deno.test("ClaudeSessionManager: rejects working dir outside workspace", async () => {
  const tmpDir = await Deno.makeTempDir();
  const mockBin = await createMockClaude(tmpDir);
  const manager = createClaudeSessionManager({
    workspacePath: tmpDir,
    claudeBinary: mockBin,
  });

  try {
    const result = await manager.start("Hello", {
      workingDir: "/tmp/evil-dir",
    });
    assertEquals(result.ok, false);
    if (!result.ok) {
      assertStringIncludes(result.error, "outside the workspace");
    }
  } finally {
    await Deno.remove(tmpDir, { recursive: true });
  }
});

Deno.test("ClaudeSessionManager: status of nonexistent session returns error", () => {
  const manager = createClaudeSessionManager({
    workspacePath: "/tmp/test-workspace",
  });

  const result = manager.status("nonexistent-session-id");
  assertEquals(result.ok, false);
  if (!result.ok) {
    assertStringIncludes(result.error, "not found");
  }
});

Deno.test("ClaudeSessionManager: getOutput of nonexistent session returns error", () => {
  const manager = createClaudeSessionManager({
    workspacePath: "/tmp/test-workspace",
  });

  const result = manager.getOutput("nonexistent-session-id");
  assertEquals(result.ok, false);
});

Deno.test("ClaudeSessionManager: stop nonexistent session returns error", async () => {
  const manager = createClaudeSessionManager({
    workspacePath: "/tmp/test-workspace",
  });

  const result = await manager.stop("nonexistent-session-id");
  assertEquals(result.ok, false);
});

Deno.test("ClaudeSessionManager: multiple concurrent sessions tracked independently", async () => {
  const tmpDir = await Deno.makeTempDir();
  const mockBin = await createMockClaude(tmpDir);
  const manager = createClaudeSessionManager({
    workspacePath: tmpDir,
    claudeBinary: mockBin,
  });

  try {
    const r1 = await manager.start("Task A");
    const r2 = await manager.start("Task B");
    const r3 = await manager.start("Task C");

    assert(r1.ok && r2.ok && r3.ok);
    if (!r1.ok || !r2.ok || !r3.ok) return;

    // All have unique IDs
    const ids = new Set([r1.value.id, r2.value.id, r3.value.id]);
    assertEquals(ids.size, 3);

    // All have unique PIDs
    const pids = new Set([r1.value.pid, r2.value.pid, r3.value.pid]);
    assertEquals(pids.size, 3);

    assertEquals(manager.list().length, 3);
  } finally {
    for (const s of manager.list()) {
      await manager.stop(s.id);
    }
    await Deno.remove(tmpDir, { recursive: true });
  }
});

Deno.test("ClaudeSessionManager: failed process sets failed status", async () => {
  const tmpDir = await Deno.makeTempDir();
  const mockBin = await createFailingMockClaude(tmpDir);
  const manager = createClaudeSessionManager({
    workspacePath: tmpDir,
    claudeBinary: mockBin,
  });

  try {
    const startResult = await manager.start("Fail please");
    assert(startResult.ok);
    if (!startResult.ok) return;

    // Wait for process to exit
    await new Promise((r) => setTimeout(r, 1000));

    const statusResult = manager.status(startResult.value.id);
    assert(statusResult.ok);
    if (statusResult.ok) {
      assertEquals(statusResult.value.status, "failed");
      assertEquals(statusResult.value.exitCode, 1);
      assertExists(statusResult.value.endedAt);
    }
  } finally {
    await Deno.remove(tmpDir, { recursive: true });
  }
});

Deno.test("ClaudeSessionManager: stop already-completed session is idempotent", async () => {
  const tmpDir = await Deno.makeTempDir();
  const mockBin = await createMockClaude(tmpDir);
  const manager = createClaudeSessionManager({
    workspacePath: tmpDir,
    claudeBinary: mockBin,
  });

  try {
    const startResult = await manager.start("Quick task");
    assert(startResult.ok);
    if (!startResult.ok) return;

    // Wait for process to complete
    await new Promise((r) => setTimeout(r, 1000));

    // Stop should succeed even if already completed
    const stopResult = await manager.stop(startResult.value.id);
    assertEquals(stopResult.ok, true);
  } finally {
    await Deno.remove(tmpDir, { recursive: true });
  }
});

Deno.test("ClaudeSessionManager: spawn fails gracefully for missing binary", async () => {
  const tmpDir = await Deno.makeTempDir();
  const manager = createClaudeSessionManager({
    workspacePath: tmpDir,
    claudeBinary: "/nonexistent/path/to/claude-binary",
  });

  try {
    const result = await manager.start("Hello");
    assertEquals(result.ok, false);
    if (!result.ok) {
      assertStringIncludes(result.error, "Failed to spawn claude");
    }
  } finally {
    await Deno.remove(tmpDir, { recursive: true });
  }
});

// --- Tool definitions tests ---

Deno.test("getClaudeToolDefinitions: returns all 5 tools", () => {
  const defs = getClaudeToolDefinitions();
  assertEquals(defs.length, 5);

  const names = defs.map((d) => d.name);
  assert(names.includes("claude_start"));
  assert(names.includes("claude_send"));
  assert(names.includes("claude_output"));
  assert(names.includes("claude_status"));
  assert(names.includes("claude_stop"));
});

Deno.test("getClaudeToolDefinitions: claude_start has required prompt param", () => {
  const defs = getClaudeToolDefinitions();
  const startTool = defs.find((d) => d.name === "claude_start");
  assertExists(startTool);
  assertExists(startTool!.parameters.prompt);
  assertEquals(startTool!.parameters.prompt.required, true);
});

Deno.test("CLAUDE_SESSION_SYSTEM_PROMPT: is non-empty", () => {
  assert(CLAUDE_SESSION_SYSTEM_PROMPT.length > 0);
  assertStringIncludes(CLAUDE_SESSION_SYSTEM_PROMPT, "claude_start");
});

// --- Tool executor tests ---

Deno.test("createClaudeToolExecutor: returns null for unknown tools", async () => {
  const manager = createClaudeSessionManager({
    workspacePath: "/tmp/test",
  });
  const executor = createClaudeToolExecutor(manager);

  const result = await executor("unknown_tool", {});
  assertEquals(result, null);
});

Deno.test("createClaudeToolExecutor: claude_start validates prompt", async () => {
  const manager = createClaudeSessionManager({
    workspacePath: "/tmp/test",
  });
  const executor = createClaudeToolExecutor(manager);

  const result = await executor("claude_start", {});
  assertExists(result);
  assertStringIncludes(result!, "Error");
  assertStringIncludes(result!, "prompt");
});

Deno.test("createClaudeToolExecutor: claude_send validates session_id", async () => {
  const manager = createClaudeSessionManager({
    workspacePath: "/tmp/test",
  });
  const executor = createClaudeToolExecutor(manager);

  const result = await executor("claude_send", { input: "test" });
  assertExists(result);
  assertStringIncludes(result!, "Error");
});

Deno.test("createClaudeToolExecutor: claude_output validates session_id", async () => {
  const manager = createClaudeSessionManager({
    workspacePath: "/tmp/test",
  });
  const executor = createClaudeToolExecutor(manager);

  const result = await executor("claude_output", {});
  assertExists(result);
  assertStringIncludes(result!, "Error");
});

Deno.test("createClaudeToolExecutor: claude_status validates session_id", async () => {
  const manager = createClaudeSessionManager({
    workspacePath: "/tmp/test",
  });
  const executor = createClaudeToolExecutor(manager);

  const result = await executor("claude_status", {});
  assertExists(result);
  assertStringIncludes(result!, "Error");
});

Deno.test("createClaudeToolExecutor: claude_stop validates session_id", async () => {
  const manager = createClaudeSessionManager({
    workspacePath: "/tmp/test",
  });
  const executor = createClaudeToolExecutor(manager);

  const result = await executor("claude_stop", {});
  assertExists(result);
  assertStringIncludes(result!, "Error");
});

Deno.test("createClaudeToolExecutor: claude_start success returns JSON with session_id", async () => {
  const tmpDir = await Deno.makeTempDir();
  const mockBin = await createMockClaude(tmpDir);
  const manager = createClaudeSessionManager({
    workspacePath: tmpDir,
    claudeBinary: mockBin,
  });
  const executor = createClaudeToolExecutor(manager);

  try {
    const result = await executor("claude_start", { prompt: "Hello!" });
    assertExists(result);
    assert(!result!.startsWith("Error"));
    const parsed = JSON.parse(result!);
    assertExists(parsed.session_id);
    assertEquals(parsed.status, "running");
  } finally {
    for (const s of manager.list()) {
      await manager.stop(s.id);
    }
    await Deno.remove(tmpDir, { recursive: true });
  }
});

Deno.test("createClaudeToolExecutor: claude_status returns JSON for valid session", async () => {
  const tmpDir = await Deno.makeTempDir();
  const mockBin = await createMockClaude(tmpDir);
  const manager = createClaudeSessionManager({
    workspacePath: tmpDir,
    claudeBinary: mockBin,
  });
  const executor = createClaudeToolExecutor(manager);

  try {
    const startResult = await executor("claude_start", { prompt: "Hello" });
    assertExists(startResult);
    const started = JSON.parse(startResult!);

    const statusResult = await executor("claude_status", {
      session_id: started.session_id,
    });
    assertExists(statusResult);
    assert(!statusResult!.startsWith("Error"));
    const status = JSON.parse(statusResult!);
    assertEquals(status.session_id, started.session_id);
    assertExists(status.started_at);
  } finally {
    for (const s of manager.list()) {
      await manager.stop(s.id);
    }
    await Deno.remove(tmpDir, { recursive: true });
  }
});

Deno.test("createClaudeToolExecutor: claude_stop returns success message", async () => {
  const tmpDir = await Deno.makeTempDir();
  const mockBin = await createHangingMockClaude(tmpDir);
  const manager = createClaudeSessionManager({
    workspacePath: tmpDir,
    claudeBinary: mockBin,
  });
  const executor = createClaudeToolExecutor(manager);

  try {
    const startResult = await executor("claude_start", {
      prompt: "Long task",
    });
    assertExists(startResult);
    const started = JSON.parse(startResult!);

    const stopResult = await executor("claude_stop", {
      session_id: started.session_id,
    });
    assertExists(stopResult);
    assertStringIncludes(stopResult!, "stopped");
  } finally {
    await Deno.remove(tmpDir, { recursive: true });
  }
});

// --- Classification boundary tests ---

Deno.test("HARDCODED_TOOL_FLOORS: claude tools have CONFIDENTIAL floor", () => {
  const claudeTools = [
    "claude_start",
    "claude_send",
    "claude_stop",
    "claude_status",
    "claude_output",
  ];
  for (const tool of claudeTools) {
    const floor = HARDCODED_TOOL_FLOORS.get(tool);
    assertExists(floor, `Missing floor for ${tool}`);
    assertEquals(floor, "CONFIDENTIAL");
  }
});
