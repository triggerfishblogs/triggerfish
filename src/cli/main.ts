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
import {
  installAndStartDaemon,
  stopDaemon,
  getDaemonStatus,
  tailLogs,
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
 */
async function runDive(): Promise<void> {
  console.log("🌊 Welcome to Triggerfish!");
  console.log("\nThis wizard will help you set up your agent.\n");

  // Check if config already exists
  const configPath = `${Deno.env.get("HOME")}/.triggerfish/triggerfish.yaml`;
  try {
    await Deno.stat(configPath);
    console.log("⚠️  Configuration already exists at:", configPath);
    console.log("Run 'triggerfish start' to launch the gateway.\n");
    return;
  } catch {
    // Config doesn't exist, continue with setup
  }

  console.log("Creating configuration directory...");
  const configDir = `${Deno.env.get("HOME")}/.triggerfish`;
  await Deno.mkdir(configDir, { recursive: true });

  console.log("Generating default configuration...");
  const defaultConfig = `# Triggerfish Configuration

models:
  primary: claude-sonnet-4-5
  providers:
    anthropic:
      model: claude-sonnet-4-5

channels: {}

classification:
  mode: personal  # personal or enterprise
`;

  await Deno.writeTextFile(configPath, defaultConfig);
  console.log("✓ Created:", configPath);

  console.log("\n🎉 Setup complete!");
  console.log("\nNext steps:");
  console.log("  1. Edit", configPath, "to configure your agent");
  console.log("  2. Run 'triggerfish start' to launch the gateway");
  console.log("  3. Run 'triggerfish patrol' to verify health\n");
}

/**
 * Run patrol health diagnostics.
 */
async function runPatrol(): Promise<void> {
  console.log("🔍 Running Triggerfish health diagnostics...\n");

  // TODO: Get actual runtime state from gateway
  // For now, use mock data to demonstrate patrol functionality
  const input: PatrolInput = {
    gatewayRunning: false,
    llmConnected: false,
    channelsActive: 0,
    policyRulesLoaded: 0,
    skillsInstalled: 0,
  };

  const checker = createPatrolCheck(input);
  const report = await checker.run();

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
      await runDive();
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
