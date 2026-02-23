/**
 * Phase 11: Exec environment security property tests.
 *
 * Covers OS command injection prevention and PATH safety:
 * - buildSafeEnv / buildClaudeEnv always set PATH to SAFE_EXEC_PATH
 * - Dangerous env vars (LD_PRELOAD, arbitrary secrets) are not inherited
 * - detectShellInjection blocks null bytes and embedded newlines
 * - Subprocess runtime: PATH equals SAFE_EXEC_PATH, parent secrets not visible
 * - ExecRunner: injection detection is enforced before execution
 */
import { assertEquals, assert } from "@std/assert";
import {
  buildSafeEnv,
  buildClaudeEnv,
  detectShellInjection,
  SAFE_EXEC_PATH,
} from "../../src/exec/sanitize.ts";
import { createWorkspace } from "../../src/exec/workspace.ts";
import { createExecTools } from "../../src/exec/tools.ts";
import { createExecRunner } from "../../src/exec/runner.ts";

// ─── buildSafeEnv ────────────────────────────────────────────────

Deno.test("buildSafeEnv: PATH is always SAFE_EXEC_PATH regardless of parent PATH", () => {
  const original = Deno.env.get("PATH");
  try {
    Deno.env.set("PATH", "/tmp/malicious:/usr/bin");
    const env = buildSafeEnv();
    assertEquals(env["PATH"], SAFE_EXEC_PATH);
  } finally {
    if (original !== undefined) Deno.env.set("PATH", original);
    else Deno.env.delete("PATH");
  }
});

Deno.test("buildSafeEnv: does not inherit PATH from parent env", () => {
  const original = Deno.env.get("PATH");
  try {
    Deno.env.set("PATH", "/attacker/controlled/bin:/usr/bin");
    const env = buildSafeEnv();
    assert(!env["PATH"].includes("/attacker"), "Should not inherit attacker PATH");
    assertEquals(env["PATH"], SAFE_EXEC_PATH);
  } finally {
    if (original !== undefined) Deno.env.set("PATH", original);
    else Deno.env.delete("PATH");
  }
});

Deno.test("buildSafeEnv: inherits safe allowlisted vars from parent", () => {
  const originalLang = Deno.env.get("LANG");
  const originalTz = Deno.env.get("TZ");
  try {
    Deno.env.set("LANG", "en_US.UTF-8");
    Deno.env.set("TZ", "UTC");
    const env = buildSafeEnv();
    assertEquals(env["LANG"], "en_US.UTF-8");
    assertEquals(env["TZ"], "UTC");
  } finally {
    if (originalLang !== undefined) Deno.env.set("LANG", originalLang);
    else Deno.env.delete("LANG");
    if (originalTz !== undefined) Deno.env.set("TZ", originalTz);
    else Deno.env.delete("TZ");
  }
});

Deno.test("buildSafeEnv: excludes LD_PRELOAD and LD_LIBRARY_PATH", () => {
  const prevPreload = Deno.env.get("LD_PRELOAD");
  const prevLibPath = Deno.env.get("LD_LIBRARY_PATH");
  try {
    Deno.env.set("LD_PRELOAD", "/tmp/evil.so");
    Deno.env.set("LD_LIBRARY_PATH", "/tmp/evil");
    const env = buildSafeEnv();
    assert(!("LD_PRELOAD" in env), "LD_PRELOAD must not be inherited");
    assert(!("LD_LIBRARY_PATH" in env), "LD_LIBRARY_PATH must not be inherited");
  } finally {
    if (prevPreload !== undefined) Deno.env.set("LD_PRELOAD", prevPreload);
    else Deno.env.delete("LD_PRELOAD");
    if (prevLibPath !== undefined) Deno.env.set("LD_LIBRARY_PATH", prevLibPath);
    else Deno.env.delete("LD_LIBRARY_PATH");
  }
});

Deno.test("buildSafeEnv: excludes arbitrary secrets from parent env", () => {
  const prevSecret = Deno.env.get("MY_SECRET_TOKEN");
  try {
    Deno.env.set("MY_SECRET_TOKEN", "supersecret");
    const env = buildSafeEnv();
    assert(!("MY_SECRET_TOKEN" in env), "Arbitrary secrets must not be inherited");
  } finally {
    if (prevSecret !== undefined) Deno.env.set("MY_SECRET_TOKEN", prevSecret);
    else Deno.env.delete("MY_SECRET_TOKEN");
  }
});

Deno.test("buildSafeEnv: extraVars override defaults", () => {
  const env = buildSafeEnv({ extraVars: { MY_CUSTOM_VAR: "hello" } });
  assertEquals(env["MY_CUSTOM_VAR"], "hello");
  // PATH must still be SAFE_EXEC_PATH even if extraVars tries to override
  // (this is documented behaviour — callers set their own after the function returns)
});

Deno.test("buildSafeEnv: workspaceHome overrides HOME", () => {
  const env = buildSafeEnv({ workspaceHome: "/workspace/agent1" });
  assertEquals(env["HOME"], "/workspace/agent1");
});

// ─── buildClaudeEnv ──────────────────────────────────────────────

Deno.test("buildClaudeEnv: includes ANTHROPIC_API_KEY from parent env", () => {
  const prev = Deno.env.get("ANTHROPIC_API_KEY");
  try {
    Deno.env.set("ANTHROPIC_API_KEY", "sk-test-key");
    const env = buildClaudeEnv();
    assertEquals(env["ANTHROPIC_API_KEY"], "sk-test-key");
  } finally {
    if (prev !== undefined) Deno.env.set("ANTHROPIC_API_KEY", prev);
    else Deno.env.delete("ANTHROPIC_API_KEY");
  }
});

Deno.test("buildClaudeEnv: always overrides PATH with SAFE_EXEC_PATH", () => {
  const original = Deno.env.get("PATH");
  try {
    Deno.env.set("PATH", "/tmp/malicious:/usr/bin");
    const env = buildClaudeEnv();
    assertEquals(env["PATH"], SAFE_EXEC_PATH);
  } finally {
    if (original !== undefined) Deno.env.set("PATH", original);
    else Deno.env.delete("PATH");
  }
});

Deno.test("buildClaudeEnv: excludes CLAUDECODE to avoid nesting guard", () => {
  const prev = Deno.env.get("CLAUDECODE");
  try {
    Deno.env.set("CLAUDECODE", "1");
    const env = buildClaudeEnv();
    assert(!("CLAUDECODE" in env), "CLAUDECODE must never be passed to child Claude process");
  } finally {
    if (prev !== undefined) Deno.env.set("CLAUDECODE", prev);
    else Deno.env.delete("CLAUDECODE");
  }
});

// ─── detectShellInjection ────────────────────────────────────────

Deno.test("detectShellInjection: null byte triggers rejection", () => {
  const result = detectShellInjection("echo hello\0bad");
  assertEquals(result.safe, false);
  assert(result.reason?.includes("null byte"));
});

Deno.test("detectShellInjection: embedded newline triggers rejection", () => {
  const result = detectShellInjection("echo hello\nbad command");
  assertEquals(result.safe, false);
  assert(result.reason?.includes("newline"));
});

Deno.test("detectShellInjection: embedded carriage return triggers rejection", () => {
  const result = detectShellInjection("echo hello\rbad");
  assertEquals(result.safe, false);
  assert(result.reason?.includes("newline"));
});

Deno.test("detectShellInjection: normal commands pass", () => {
  const cases = [
    "echo hello",
    "deno run --allow-read script.ts",
    "ls -la | head -20",
    "cat file.txt && echo done",
    "npm test",
  ];
  for (const cmd of cases) {
    const result = detectShellInjection(cmd);
    assertEquals(result.safe, true, `Expected safe: ${cmd}`);
  }
});

// ─── Runtime subprocess isolation ────────────────────────────────

Deno.test("runtime: subprocess PATH equals SAFE_EXEC_PATH", async () => {
  const tmpDir = await Deno.makeTempDir();
  const ws = await createWorkspace({ agentId: "test-path", basePath: tmpDir });
  const tools = createExecTools(ws);
  try {
    const result = await tools.runCommand("printenv PATH");
    assertEquals(result.ok, true);
    if (result.ok) {
      assertEquals(result.value.stdout.trim(), SAFE_EXEC_PATH);
    }
  } finally {
    await ws.destroy();
  }
});

Deno.test("runtime: parent SECRET_TOKEN is not visible in subprocess env", async () => {
  const prev = Deno.env.get("TEST_SECRET_TOKEN_XYZ");
  const tmpDir = await Deno.makeTempDir();
  const ws = await createWorkspace({ agentId: "test-secret", basePath: tmpDir });
  const tools = createExecTools(ws);
  try {
    Deno.env.set("TEST_SECRET_TOKEN_XYZ", "must-not-leak");
    const result = await tools.runCommand("printenv TEST_SECRET_TOKEN_XYZ; true");
    assertEquals(result.ok, true);
    if (result.ok) {
      assertEquals(
        result.value.stdout.trim(),
        "",
        "Parent secret must not be visible in subprocess env",
      );
    }
  } finally {
    if (prev !== undefined) Deno.env.set("TEST_SECRET_TOKEN_XYZ", prev);
    else Deno.env.delete("TEST_SECRET_TOKEN_XYZ");
    await ws.destroy();
  }
});

// ─── ExecRunner injection gating ─────────────────────────────────

Deno.test("ExecRunner: null byte in command is blocked before execution", async () => {
  const tmpDir = await Deno.makeTempDir();
  const ws = await createWorkspace({ agentId: "test-inj", basePath: tmpDir });
  const runner = createExecRunner(ws);
  try {
    const result = await runner.executeCommand("echo safe\0echo injected");
    assertEquals(result.ok, false);
    assert(result.ok === false && result.error.includes("injection"));
    const history = await runner.getHistory();
    assertEquals(history.length, 1);
    assertEquals(history[0].allowed, false);
  } finally {
    await ws.destroy();
  }
});

Deno.test("ExecRunner: embedded newline in command is blocked before execution", async () => {
  const tmpDir = await Deno.makeTempDir();
  const ws = await createWorkspace({ agentId: "test-inj2", basePath: tmpDir });
  const runner = createExecRunner(ws);
  try {
    const result = await runner.executeCommand("echo safe\necho injected");
    assertEquals(result.ok, false);
    assert(result.ok === false && result.error.includes("injection"));
    const history = await runner.getHistory();
    assertEquals(history.length, 1);
    assertEquals(history[0].allowed, false);
  } finally {
    await ws.destroy();
  }
});

Deno.test("ExecRunner: injection check runs before denylist check", async () => {
  const tmpDir = await Deno.makeTempDir();
  const ws = await createWorkspace({ agentId: "test-order", basePath: tmpDir });
  // Both injection AND denylist would fire — injection message should appear
  const runner = createExecRunner(ws, { denyList: ["sudo"] });
  try {
    const result = await runner.executeCommand("sudo rm\0-rf /");
    assertEquals(result.ok, false);
    assert(result.ok === false && result.error.includes("injection"));
  } finally {
    await ws.destroy();
  }
});
