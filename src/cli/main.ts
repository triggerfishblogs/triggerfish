/**
 * CLI entry point and command router for Triggerfish.
 *
 * Parses command-line arguments, loads configuration from YAML,
 * and validates config structure.
 * @module
 */

import { parse as parseYaml } from "@std/yaml";
import { createGatewayServer } from "../gateway/server.ts";
import { createPatrolCheck } from "../dive/patrol.ts";
import type { PatrolInput } from "../dive/patrol.ts";
import { runWizard } from "../dive/wizard.ts";
import {
  installAndStartDaemon,
  stopDaemon,
  getDaemonStatus,
  tailLogs,
  updateTriggerfish,
} from "./daemon.ts";

/** Known CLI commands. */
const KNOWN_COMMANDS = new Set([
  "run",
  "start",
  "stop",
  "status",
  "logs",
  "config",
  "dive",
  "patrol",
  "update",
  "help",
  "version",
]);

/** Options that influence default command selection. */
export interface ParseOptions {
  readonly configExists?: boolean;
}

/** Result of parsing CLI arguments. */
export interface ParsedCommand {
  readonly command: string;
  readonly subcommand?: string;
  readonly flags: Readonly<Record<string, boolean | string>>;
}

/** Triggerfish YAML configuration shape. */
export interface TriggerFishConfig {
  readonly models: {
    readonly primary: string;
    readonly providers: Readonly<Record<string, { readonly model: string }>>;
  };
  readonly channels: Readonly<Record<string, unknown>>;
  readonly classification: {
    readonly mode: string;
  };
}

/** Success result. */
export interface Ok<T> {
  readonly ok: true;
  readonly value: T;
}

/** Failure result. */
export interface Err<E> {
  readonly ok: false;
  readonly error: E;
}

/** Discriminated union result type. */
export type Result<T, E> = Ok<T> | Err<E>;

/**
 * Parse CLI arguments into a structured command object.
 *
 * @param args - Raw command-line argument array (without the binary name).
 * @param options - Optional context influencing defaults.
 * @returns Parsed command with optional subcommand and flags.
 */
export function parseCommand(
  args: readonly string[],
  options: ParseOptions = {},
): ParsedCommand {
  const flags: Record<string, boolean | string> = {};

  // Handle special flags first
  if (args.includes("--version")) {
    return { command: "version", flags };
  }

  // Extract flags from args
  const positional: string[] = [];
  for (const arg of args) {
    if (arg.startsWith("--")) {
      const key = arg.slice(2);
      flags[key] = true;
    } else {
      positional.push(arg);
    }
  }

  // No positional args
  if (positional.length === 0) {
    const configExists = options.configExists ?? true;
    return { command: configExists ? "help" : "dive", flags };
  }

  const command = positional[0];

  // Unknown command → help
  if (!KNOWN_COMMANDS.has(command)) {
    return { command: "help", flags };
  }

  // Commands with subcommands
  if (command === "config" && positional.length > 1) {
    return { command, subcommand: positional[1], flags };
  }

  return { command, flags };
}

/**
 * Load and parse a triggerfish YAML configuration file.
 *
 * @param path - Absolute path to the YAML file.
 * @returns Result with parsed config or error string.
 */
export function loadConfig(path: string): Result<TriggerFishConfig, string> {
  try {
    const raw = Deno.readTextFileSync(path);
    const parsed = parseYaml(raw);

    if (typeof parsed !== "object" || parsed === null) {
      return { ok: false, error: "Config file did not parse to an object" };
    }

    const validation = validateConfig(parsed as Record<string, unknown>);
    if (!validation.ok) {
      return validation as Err<string>;
    }

    return { ok: true, value: parsed as unknown as TriggerFishConfig };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, error: `Failed to load config: ${message}` };
  }
}

/**
 * Validate a parsed config object has all required fields.
 *
 * @param obj - Parsed object to validate.
 * @returns Result indicating validity or the first validation error.
 */
export function validateConfig(
  obj: Record<string, unknown>,
): Result<void, string> {
  // models must exist and have a primary field
  if (typeof obj.models !== "object" || obj.models === null) {
    return { ok: false, error: "Missing required field: models" };
  }

  const models = obj.models as Record<string, unknown>;
  if (typeof models.primary !== "string" || models.primary.length === 0) {
    return { ok: false, error: "Missing required field: models.primary" };
  }

  return { ok: true, value: undefined };
}

/**
 * Display help text.
 */
function showHelp(): void {
  console.log(`
Triggerfish - Secure Multi-Channel AI Agent Platform

USAGE:
  triggerfish [command] [options]

COMMANDS:
  dive        First-run setup wizard (creates triggerfish.yaml)
  run         Run the gateway server in foreground
  start       Install and start the daemon
  stop        Stop the daemon
  status      Show daemon status
  logs        View daemon logs (--tail to follow)
  patrol      Run health diagnostics
  update      Pull latest code, recompile, and restart
  help        Show this help message
  version     Show version information

EXAMPLES:
  triggerfish dive          # Interactive setup
  triggerfish run           # Run gateway in foreground
  triggerfish start         # Install and start daemon
  triggerfish stop          # Stop the daemon
  triggerfish status        # Check daemon status
  triggerfish logs --tail   # Follow daemon logs
  triggerfish patrol        # Health check
  triggerfish update        # Update to latest version

For more information, visit: https://triggerfish.sh/docs
`);
}

/**
 * Display version information.
 */
function showVersion(): void {
  console.log("Triggerfish v0.1.0-alpha");
}

/**
 * Run the dive setup wizard.
 *
 * Returns true if the wizard requested daemon installation,
 * false otherwise. Exits with code 0 on success, 1 on error.
 */
async function runDive(
  flags: Readonly<Record<string, boolean | string>>,
): Promise<void> {
  const baseDir = `${Deno.env.get("HOME")}/.triggerfish`;
  const configPath = `${baseDir}/triggerfish.yaml`;

  // Check if config already exists (skip check if --force)
  if (flags["force"] !== true) {
    try {
      await Deno.stat(configPath);
      console.log("");
      console.log("  Configuration already exists at:", configPath);
      console.log("  Run 'triggerfish start' to launch the gateway.");
      console.log("  Run 'triggerfish dive --force' to re-run the wizard.");
      console.log("");
      return;
    } catch {
      // Config doesn't exist, continue with setup
    }
  }

  const result = await runWizard(baseDir);

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
async function probeGateway(port = 18789): Promise<boolean> {
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
  const configPath = `${Deno.env.get("HOME")}/.triggerfish/triggerfish.yaml`;
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
  const skillsDir = `${Deno.env.get("HOME")}/.triggerfish/skills`;
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
async function runPatrol(): Promise<void> {
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
    console.log("❌ Critical issues detected. Run 'triggerfish start' to launch the gateway.\n");
    Deno.exit(1);
  } else if (report.overall === "WARNING") {
    console.log("⚠️  Warnings detected. Check configuration.\n");
  } else {
    console.log("✅ All systems healthy.\n");
  }
}

/**
 * Start the gateway server.
 */
async function runStart(): Promise<void> {
  console.log("🚀 Starting Triggerfish gateway...\n");

  const configPath = `${Deno.env.get("HOME")}/.triggerfish/triggerfish.yaml`;

  // Check if config exists
  try {
    await Deno.stat(configPath);
  } catch {
    console.log("❌ Configuration not found.");
    console.log("Run 'triggerfish dive' to set up your agent.\n");
    Deno.exit(1);
  }

  // Load config
  const configResult = loadConfig(configPath);
  if (!configResult.ok) {
    console.log("❌ Failed to load configuration:", configResult.error);
    Deno.exit(1);
  }

  console.log("✓ Configuration loaded");

  // Create and start gateway server
  const server = createGatewayServer({ port: 18789 });
  const addr = await server.start();

  console.log(`✓ Gateway listening on ${addr.hostname}:${addr.port}`);
  console.log("\n🌊 Triggerfish is running!");
  console.log("\nPress Ctrl+C to stop.\n");

  // Keep running until interrupted
  await new Promise(() => {}); // Never resolves
}

/**
 * Install and start the Triggerfish daemon.
 */
async function runDaemonStart(): Promise<void> {
  console.log("Installing Triggerfish daemon...\n");

  const binaryPath = Deno.execPath();
  const result = await installAndStartDaemon(binaryPath);

  if (result.ok) {
    console.log("✓", result.message);
    console.log("\nRun 'triggerfish status' to verify.");
    console.log("Run 'triggerfish logs --tail' to follow output.\n");
  } else {
    console.log("✗", result.message);
    Deno.exit(1);
  }
}

/**
 * Stop the Triggerfish daemon.
 */
async function runDaemonStop(): Promise<void> {
  const result = await stopDaemon();

  if (result.ok) {
    console.log("✓", result.message);
  } else {
    console.log("✗", result.message);
    Deno.exit(1);
  }
}

/**
 * Show daemon status.
 */
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
 * Tail daemon logs.
 */
async function runDaemonLogs(
  flags: Readonly<Record<string, boolean | string>>,
): Promise<void> {
  const follow = flags.tail === true;
  await tailLogs(follow);
}

/**
 * Pull latest code, recompile, and restart the daemon.
 */
async function runUpdate(): Promise<void> {
  console.log("Updating Triggerfish...\n");

  const result = await updateTriggerfish();

  if (result.ok) {
    if (result.previousVersion === result.newVersion) {
      console.log("✓ Already up to date (" + result.newVersion + ")");
    } else {
      console.log("✓", result.message);
      console.log("\nRun 'triggerfish status' to verify the daemon restarted.");
    }
  } else {
    console.log("✗", result.message);
    Deno.exit(1);
  }
}

/**
 * Main CLI entry point.
 */
async function main(): Promise<void> {
  const args = Deno.args;

  // Check if config exists for default command detection
  const configPath = `${Deno.env.get("HOME")}/.triggerfish/triggerfish.yaml`;
  let configExists = false;
  try {
    await Deno.stat(configPath);
    configExists = true;
  } catch {
    // Config doesn't exist
  }

  const parsed = parseCommand(args, { configExists });

  switch (parsed.command) {
    case "dive":
      await runDive(parsed.flags);
      break;
    case "patrol":
      await runPatrol();
      break;
    case "run":
      await runStart();
      break;
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
      await runDaemonLogs(parsed.flags);
      break;
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
  main().catch((err) => {
    console.error("Fatal error:", err);
    Deno.exit(1);
  });
}
