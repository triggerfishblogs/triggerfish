/**
 * Phase 13: CLI, Installation & Daemon Management
 * Tests MUST FAIL until cli/main.ts, cli/daemon.ts, and build system are implemented.
 * Aligned with design doc Section 29: standalone binary, OS-native daemons.
 */
import { assertEquals, assertExists, assert, assertStringIncludes } from "@std/assert";

// --- Command parsing ---

Deno.test("CLI: parses 'run' command", async () => {
  const { parseCommand } = await import("../../src/cli/main.ts");
  const cmd = parseCommand(["run"]);
  assertEquals(cmd.command, "run");
});

Deno.test("CLI: parses 'start' command", async () => {
  const { parseCommand } = await import("../../src/cli/main.ts");
  const cmd = parseCommand(["start"]);
  assertEquals(cmd.command, "start");
});

Deno.test("CLI: parses 'stop' command", async () => {
  const { parseCommand } = await import("../../src/cli/main.ts");
  const cmd = parseCommand(["stop"]);
  assertEquals(cmd.command, "stop");
});

Deno.test("CLI: parses 'status' command", async () => {
  const { parseCommand } = await import("../../src/cli/main.ts");
  const cmd = parseCommand(["status"]);
  assertEquals(cmd.command, "status");
});

Deno.test("CLI: parses 'logs' command with --tail flag", async () => {
  const { parseCommand } = await import("../../src/cli/main.ts");
  const cmd = parseCommand(["logs", "--tail"]);
  assertEquals(cmd.command, "logs");
  assertEquals(cmd.flags.tail, true);
});

Deno.test("CLI: parses 'dive' command", async () => {
  const { parseCommand } = await import("../../src/cli/main.ts");
  const cmd = parseCommand(["dive"]);
  assertEquals(cmd.command, "dive");
});

Deno.test("CLI: parses 'patrol' command", async () => {
  const { parseCommand } = await import("../../src/cli/main.ts");
  const cmd = parseCommand(["patrol"]);
  assertEquals(cmd.command, "patrol");
});

Deno.test("CLI: parses 'config edit' subcommand", async () => {
  const { parseCommand } = await import("../../src/cli/main.ts");
  const cmd = parseCommand(["config", "edit"]);
  assertEquals(cmd.command, "config");
  assertEquals(cmd.subcommand, "edit");
});

Deno.test("CLI: parses 'config validate' subcommand", async () => {
  const { parseCommand } = await import("../../src/cli/main.ts");
  const cmd = parseCommand(["config", "validate"]);
  assertEquals(cmd.command, "config");
  assertEquals(cmd.subcommand, "validate");
});

Deno.test("CLI: unknown command returns help suggestion", async () => {
  const { parseCommand } = await import("../../src/cli/main.ts");
  const cmd = parseCommand(["nonexistent"]);
  assertEquals(cmd.command, "help");
});

Deno.test("CLI: no args defaults to 'dive' when no config exists", async () => {
  const { parseCommand } = await import("../../src/cli/main.ts");
  const cmd = parseCommand([], { configExists: false });
  assertEquals(cmd.command, "dive");
});

Deno.test("CLI: --version flag shows version", async () => {
  const { parseCommand } = await import("../../src/cli/main.ts");
  const cmd = parseCommand(["--version"]);
  assertEquals(cmd.command, "version");
});

// --- Config ---

Deno.test("Config: loads valid triggerfish.yaml", async () => {
  const { loadConfig } = await import("../../src/cli/main.ts");
  const tmpDir = await Deno.makeTempDir();
  await Deno.writeTextFile(`${tmpDir}/triggerfish.yaml`, `
models:
  primary: anthropic
  providers:
    anthropic:
      model: claude-sonnet-4-20250514
channels: {}
classification:
  mode: standard
`);
  const result = loadConfig(`${tmpDir}/triggerfish.yaml`);
  assertEquals(result.ok, true);
  if (result.ok) {
    assertEquals(result.value.models.primary, "anthropic");
  }
  await Deno.remove(tmpDir, { recursive: true });
});

Deno.test("Config: rejects invalid YAML", async () => {
  const { loadConfig } = await import("../../src/cli/main.ts");
  const tmpDir = await Deno.makeTempDir();
  await Deno.writeTextFile(`${tmpDir}/triggerfish.yaml`, "{{invalid yaml");
  const result = loadConfig(`${tmpDir}/triggerfish.yaml`);
  assertEquals(result.ok, false);
  await Deno.remove(tmpDir, { recursive: true });
});

Deno.test("Config: validates required fields", async () => {
  const { validateConfig } = await import("../../src/cli/main.ts");
  const result = validateConfig({});
  assertEquals(result.ok, false); // Missing models.primary
});

// --- Daemon management ---

Deno.test("Daemon: detects current OS", async () => {
  const { detectDaemonManager } = await import("../../src/cli/daemon.ts");
  const manager = detectDaemonManager();
  assert(["launchd", "systemd", "windows-service", "unsupported"].includes(manager));
});

Deno.test("Daemon: generates launchd plist content", async () => {
  const { generateLaunchdPlist } = await import("../../src/cli/daemon.ts");
  const plist = generateLaunchdPlist({ binaryPath: "/usr/local/bin/triggerfish" });
  assertStringIncludes(plist, "dev.triggerfish.agent");
  assertStringIncludes(plist, "/usr/local/bin/triggerfish");
  assertStringIncludes(plist, "RunAtLoad");
});

Deno.test("Daemon: generates systemd unit content", async () => {
  const { generateSystemdUnit } = await import("../../src/cli/daemon.ts");
  const unit = generateSystemdUnit({ binaryPath: "/usr/local/bin/triggerfish" });
  assertStringIncludes(unit, "[Service]");
  assertStringIncludes(unit, "/usr/local/bin/triggerfish");
  assertStringIncludes(unit, "Restart=");
});

Deno.test("Daemon: generates PowerShell Register-ScheduledTask command", async () => {
  const { generateWindowsTaskCommand } = await import("../../src/cli/daemon.ts");
  const cmd = generateWindowsTaskCommand({
    binaryPath: "C:\\Users\\test\\AppData\\Local\\Triggerfish\\triggerfish.exe",
  });
  assertStringIncludes(cmd, "Register-ScheduledTask");
  assertStringIncludes(cmd, "Triggerfish AI Agent");
  assertStringIncludes(cmd, "C:\\Users\\test\\AppData\\Local\\Triggerfish\\triggerfish.exe");
  assertStringIncludes(cmd, "New-ScheduledTaskTrigger -AtLogon");
  assertStringIncludes(cmd, "-LogonType Interactive -RunLevel Limited");
  assertStringIncludes(cmd, "-MultipleInstances IgnoreNew");
  assertStringIncludes(cmd, "-AllowStartIfOnBatteries");
  assertStringIncludes(cmd, "-DontStopIfGoingOnBatteries");
  assertStringIncludes(cmd, "-ExecutionTimeLimit (New-TimeSpan)");
  assertStringIncludes(cmd, "-RestartCount 3");
  assertStringIncludes(cmd, "-RestartInterval (New-TimeSpan -Minutes 1)");
  assertStringIncludes(cmd, "-Force");
});

Deno.test("Daemon: PowerShell command escapes single quotes in paths", async () => {
  const { generateWindowsTaskCommand } = await import("../../src/cli/daemon.ts");
  const cmd = generateWindowsTaskCommand({
    binaryPath: "C:\\Users\\O'Brien\\triggerfish.exe",
  });
  assertStringIncludes(cmd, "O''Brien");
});

Deno.test("Daemon: logDir does not contain undefined", async () => {
  const { logDir } = await import("../../src/cli/daemon.ts");
  const dir = logDir();
  assert(!dir.includes("undefined"), `logDir() should not contain 'undefined', got: ${dir}`);
});

// --- Binary compilation (compile target exists) ---

Deno.test("deno.json: has compile task for standalone binary", async () => {
  const raw = await Deno.readTextFile("deno.json");
  const config = JSON.parse(raw);
  assertExists(config.tasks?.compile, "deno.json must have a 'compile' task");
});

// --- Makefile exists with required targets ---

Deno.test("Makefile: exists with build, install, release targets", async () => {
  const content = await Deno.readTextFile("Makefile");
  assertStringIncludes(content, "build:");
  assertStringIncludes(content, "install:");
  assertStringIncludes(content, "release:");
  assertStringIncludes(content, "test:");
});
