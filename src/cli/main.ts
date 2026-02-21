/**
 * CLI entry point and command router for Triggerfish.
 *
 * Parses command-line arguments, dispatches to the appropriate command
 * handler, and manages daemon lifecycle operations.
 *
 * Sub-modules:
 * - main_commands.ts: Argument parsing, help text, version display
 *
 * @module
 */

import { parse as parseYaml } from "@std/yaml";
import { join } from "@std/path";
import {
  resolveBaseDir,
  resolveConfigPath,
} from "./paths.ts";
import { createPatrolCheck } from "../dive/patrol.ts";
import type { PatrolInput } from "../dive/patrol.ts";
import { runWizard, runWizardSelective } from "../dive/wizard.ts";
import {
  bundleLogs,
  cleanupOldBinary,
  getDaemonStatus,
  installAndStartDaemon,
  stopDaemon,
  tailLogs,
  updateTriggerfish,
} from "./daemon.ts";
import { TIDEPOOL_PORT } from "./constants.ts";
import { Confirm } from "@cliffy/prompt";
import { parseCommand, showHelp, showVersion } from "./main_commands.ts";

// Re-export config types and functions for backward-compatibility (tests and other modules import from here)
export {
  loadConfig,
  loadConfigWithSecrets,
  validateConfig,
} from "../core/config.ts";
export type { TriggerFishConfig } from "../core/config.ts";
export type { Ok, Err, Result } from "../core/config.ts";

// Re-export performGoogleOAuth for backward-compatibility (wizard.ts imports it via dynamic import)
export { performGoogleOAuth } from "./connect.ts";

// Re-export command parsing for backward-compatibility (tests import from here)
export {
  parseCommand,
  showHelp,
  showVersion,
  type ParsedCommand,
  type ParseOptions,
} from "./main_commands.ts";

// ─── Dive / Patrol ────────────────────────────────────────────────────────────

/**
 * Run the dive setup wizard.
 *
 * Returns true if the wizard requested daemon installation,
 * false otherwise. Exits with code 0 on success, 1 on error.
 */
async function runDive(
  flags: Readonly<Record<string, boolean | string>>,
): Promise<void> {
  const baseDir = resolveBaseDir();
  const configPath = resolveConfigPath(baseDir);

  // Check if config already exists
  let configExists = false;
  try {
    await Deno.stat(configPath);
    configExists = true;
  } catch {
    // Config doesn't exist
  }

  if (configExists && flags["force"] !== true) {
    console.log("");
    console.log("  Configuration already exists at:", configPath);
    console.log("  Run 'triggerfish start' to launch the gateway.");
    console.log("  Run 'triggerfish dive --force' to re-run the wizard.");
    console.log("");
    return;
  }

  // --force with existing config: let user pick which sections to update
  // No existing config: run the full wizard from scratch
  const result = configExists
    ? await runWizardSelective(baseDir)
    : await runWizard(baseDir);

  // If called with --install-daemon (from install script), auto-start daemon
  if (result.installDaemon && flags["install-daemon"] === true) {
    await runDaemonStart();
  } else if (result.installDaemon) {
    // User said yes to daemon but not called from installer — tell them how
    console.log("  Run 'triggerfish start' to install the daemon.");
    console.log("");
  }
}

/**
 * Probe the gateway HTTP endpoint to check if it's alive.
 */
export async function probeGateway(port = 18789): Promise<boolean> {
  try {
    const response = await fetch(`http://127.0.0.1:${port}`, {
      signal: AbortSignal.timeout(2000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Count configured channels from the config file.
 */
function countConfiguredChannels(): number {
  const configPath = resolveConfigPath();
  try {
    const raw = Deno.readTextFileSync(configPath);
    const parsed = parseYaml(raw) as Record<string, unknown>;
    const channels = parsed?.channels;
    if (channels && typeof channels === "object" && channels !== null) {
      return Object.keys(channels).length;
    }
  } catch {
    // Config not found or invalid
  }
  return 0;
}

/**
 * Count installed skills in ~/.triggerfish/skills/.
 */
function countInstalledSkills(): number {
  const skillsDir = join(resolveBaseDir(), "skills");
  try {
    let count = 0;
    for (const entry of Deno.readDirSync(skillsDir)) {
      if (entry.isDirectory) count++;
    }
    return count;
  } catch {
    return 0;
  }
}

/**
 * Run patrol health diagnostics using real runtime state.
 */
export async function runPatrol(): Promise<void> {
  console.log("🔍 Running Triggerfish health diagnostics...\n");

  // Check real state
  const daemonStatus = await getDaemonStatus();
  const gatewayAlive = daemonStatus.running ? await probeGateway() : false;
  const channelCount = countConfiguredChannels();
  const skillCount = countInstalledSkills();

  // LLM is "connected" if gateway is alive (provider is loaded at startup)
  // A more thorough check would query the gateway, but this is good enough
  const llmConnected = gatewayAlive;

  const input: PatrolInput = {
    gatewayRunning: gatewayAlive,
    llmConnected,
    channelsActive: channelCount,
    policyRulesLoaded: gatewayAlive ? 4 : 0, // Fixed rules always loaded when running
    skillsInstalled: skillCount,
  };

  const checker = createPatrolCheck(input);
  const report = await checker.run();

  // Show daemon info
  if (daemonStatus.running) {
    console.log(`  Daemon: running (PID ${daemonStatus.pid ?? "?"})`);
    if (daemonStatus.uptime) {
      console.log(`  Since:  ${daemonStatus.uptime}`);
    }
  }
  console.log("");

  console.log(`Overall Status: ${report.overall}\n`);
  console.log("Health Checks:");
  for (const check of report.checks) {
    const icon = check.status === "HEALTHY"
      ? "✓"
      : check.status === "WARNING"
      ? "⚠"
      : "✗";
    console.log(`  ${icon} ${check.name}: ${check.message}`);
  }
  console.log();

  if (report.overall === "CRITICAL") {
    console.log(
      "❌ Critical issues detected. Run 'triggerfish start' to launch the gateway.\n",
    );
    Deno.exit(1);
  } else if (report.overall === "WARNING") {
    console.log("⚠️  Warnings detected. Check configuration.\n");
  } else {
    console.log("✅ All systems healthy.\n");
  }
}

// ─── Daemon control ───────────────────────────────────────────────────────────

/** Show daemon status. */
async function runDaemonStatus(): Promise<void> {
  const status = await getDaemonStatus();

  if (status.running) {
    console.log("✓ Triggerfish is running");
    if (status.pid) console.log(`  PID: ${status.pid}`);
    if (status.uptime) console.log(`  Since: ${status.uptime}`);
    console.log(`  Manager: ${status.manager}`);
  } else {
    console.log("✗ Triggerfish is not running");
    console.log("\nRun 'triggerfish start' to launch the daemon.");
  }
}

/**
 * Tail or bundle daemon logs.
 *
 * Subcommands:
 * - `view` (default) — stream the log file to stdout, optionally following.
 * - `bundle` — copy all log files to a temporary directory and print the path.
 */
async function runDaemonLogs(
  subcommand: string | undefined,
  flags: Readonly<Record<string, boolean | string>>,
): Promise<void> {
  if (subcommand === "bundle") {
    await bundleLogs();
    return;
  }
  // "view" or no subcommand → old streaming behaviour
  const follow = flags.tail === true;
  const levelFilter = typeof flags.level === "string" ? flags.level : undefined;
  await tailLogs(follow, 50, levelFilter);
}

/** Download and install the latest release binary. */
async function runUpdate(): Promise<void> {
  console.log("Updating Triggerfish...\n");

  const result = await updateTriggerfish();

  if (result.ok) {
    if (result.previousVersion === result.newVersion) {
      console.log("✓ Already up to date (" + result.newVersion + ")");
    } else {
      console.log("✓", result.message);
      if (result.wasRunning) {
        console.log("\nRun 'triggerfish status' to verify the daemon restarted.");
      } else {
        const startIt = await Confirm.prompt({
          message: "Daemon was not running. Start it now?",
          default: true,
        });
        if (startIt) {
          const startResult = await installAndStartDaemon(Deno.execPath());
          if (startResult.ok) {
            console.log("✓ Daemon started");
          } else {
            console.log(`✗ ${startResult.message}`);
          }
        }
      }
    }
  } else {
    console.log("✗", result.message);
    Deno.exit(1);
  }
}

/** Install the Triggerfish daemon and start it. */
async function runDaemonStart(): Promise<void> {
  const result = await installAndStartDaemon(Deno.execPath());
  if (result.ok) {
    console.log("✓ Daemon installed and started");
    console.log(`  Tidepool: http://127.0.0.1:${TIDEPOOL_PORT} (available once daemon is ready)`);
  } else {
    console.log(`✗ ${result.message}`);
    Deno.exit(1);
  }
}

/** Stop the Triggerfish daemon. */
async function runDaemonStop(): Promise<void> {
  const result = await stopDaemon();
  if (result.ok) {
    console.log("✓ Daemon stopped");
  } else {
    console.log(`✗ ${result.message}`);
    Deno.exit(1);
  }
}

// ─── Enable Windows ANSI ──────────────────────────────────────────────────────

/**
 * Enable ANSI escape sequence processing on Windows.
 *
 * Windows PowerShell 5.1 and legacy conhost do not interpret ANSI escape
 * codes by default. This calls SetConsoleMode with
 * ENABLE_VIRTUAL_TERMINAL_PROCESSING to enable them. Silently ignored on
 * non-Windows platforms or if the call fails.
 */
export function enableWindowsAnsi(): void {
  if (Deno.build.os !== "windows") return;

  try {
    const kernel32 = Deno.dlopen("kernel32.dll", {
      GetStdHandle: { parameters: ["i32"], result: "pointer" },
      GetConsoleMode: { parameters: ["pointer", "buffer"], result: "i32" },
      SetConsoleMode: { parameters: ["pointer", "u32"], result: "i32" },
    });

    const STD_OUTPUT_HANDLE = -11;
    const ENABLE_VIRTUAL_TERMINAL_PROCESSING = 0x0004;

    const handle = kernel32.symbols.GetStdHandle(STD_OUTPUT_HANDLE);
    const modeBuffer = new Uint32Array(1);
    kernel32.symbols.GetConsoleMode(handle, modeBuffer);
    kernel32.symbols.SetConsoleMode(
      handle,
      modeBuffer[0] | ENABLE_VIRTUAL_TERMINAL_PROCESSING,
    );
    kernel32.close();
  } catch {
    // VT processing not available — colors will degrade gracefully
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

/** Main CLI entry point. */
async function main(): Promise<void> {
  enableWindowsAnsi();

  // Clean up leftover .old binary from a previous Windows update
  await cleanupOldBinary();

  const args = Deno.args;

  // Check if config exists for default command detection
  const configPath = resolveConfigPath();
  let configExists = false;
  try {
    await Deno.stat(configPath);
    configExists = true;
  } catch {
    // Config doesn't exist
  }

  const parsed = parseCommand(args, { configExists });

  switch (parsed.command) {
    case "chat": {
      const { runChat } = await import("../channels/cli/chat.ts");
      await runChat();
      break;
    }
    case "config": {
      const { runConfig } = await import("./config.ts");
      await runConfig(parsed.subcommand, parsed.flags);
      break;
    }
    case "connect": {
      const { runConnect } = await import("./connect.ts");
      await runConnect(parsed.subcommand, parsed.flags);
      break;
    }
    case "cron": {
      const { runCron } = await import("./cron.ts");
      await runCron(parsed.subcommand, parsed.flags);
      break;
    }
    case "disconnect": {
      const { runDisconnect } = await import("./connect.ts");
      await runDisconnect(parsed.subcommand, parsed.flags);
      break;
    }
    case "dive":
      await runDive(parsed.flags);
      break;
    case "patrol":
      await runPatrol();
      break;
    case "run": {
      const { runStart } = await import("../gateway/startup.ts");
      await runStart();
      break;
    }
    case "run-triggers": {
      const { runTriggers } = await import("./run_triggers.ts");
      await runTriggers();
      break;
    }
    case "start":
      await runDaemonStart();
      break;
    case "stop":
      await runDaemonStop();
      break;
    case "status":
      await runDaemonStatus();
      break;
    case "logs":
      await runDaemonLogs(parsed.subcommand, parsed.flags);
      break;
    case "tidepool": {
      const { runTidepool } = await import("./tidepool.ts");
      await runTidepool(parsed.subcommand, parsed.flags);
      break;
    }
    case "update":
      await runUpdate();
      break;
    case "version":
      showVersion();
      break;
    case "help":
    default:
      showHelp();
      break;
  }
}

// Execute main if this is the entry point
if (import.meta.main) {
  // Force-exit after completion to prevent Deno from hanging on Windows due to
  // stdin raw-mode handles left open by interactive prompts (Cliffy). Without
  // Deno.exit(0), the process lingers for minutes after "Daemon restarted" is
  // printed on Windows because the TTY handle is never fully released.
  main().then(() => Deno.exit(0)).catch((err) => {
    console.error("Fatal error:", err);
    Deno.exit(1);
  });
}
