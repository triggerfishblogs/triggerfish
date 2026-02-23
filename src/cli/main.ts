/**
 * CLI entry point and command router for Triggerfish.
 *
 * Parses command-line arguments, dispatches to the appropriate command
 * handler, and manages daemon lifecycle operations.
 *
 * Sub-modules:
 * - main_commands.ts: Argument parsing, help text, version display
 * - dive_command.ts: Dive wizard and patrol health diagnostics
 * - daemon_commands.ts: Daemon start/stop/status/logs/update
 * - platform.ts: Gateway probe, Windows ANSI support
 *
 * @module
 */

import { resolveConfigPath } from "./config/paths.ts";
import { cleanupOldBinary } from "./daemon/daemon.ts";
import { parseCommand, showHelp, showVersion } from "./main_commands.ts";
import { enableWindowsAnsi } from "./platform.ts";
import { runDive, runPatrol } from "./dive_command.ts";
import {
  runDaemonLogs,
  runDaemonStart,
  runDaemonStatus,
  runDaemonStop,
  runUpdate,
} from "./daemon_commands.ts";

// Re-export config types and functions for backward-compatibility (tests and other modules import from here)
export {
  loadConfig,
  loadConfigWithSecrets,
  validateConfig,
} from "../core/config.ts";
export type { Err, Ok, Result } from "../core/config.ts";
export type { TriggerFishConfig } from "../core/config.ts";

// Re-export performGoogleOAuth for backward-compatibility (wizard.ts imports it via dynamic import)
export { performGoogleOAuth } from "./commands/connect.ts";

// Re-export command parsing for backward-compatibility (tests import from here)
export {
  parseCommand,
  type ParsedCommand,
  type ParseOptions,
  showHelp,
  showVersion,
} from "./main_commands.ts";

// Re-export platform and command functions for backward-compatibility
export { probeGateway, enableWindowsAnsi } from "./platform.ts";
export { runPatrol } from "./dive_command.ts";

// ─── Command dispatch ─────────────────────────────────────────────────────────

/** Parsed command context passed to each command handler. */
interface CommandContext {
  readonly subcommand?: string | undefined;
  readonly flags: Readonly<Record<string, boolean | string>>;
}

/** Build the dispatch map of command name to async handler. */
function buildCommandDispatchMap(
  ctx: CommandContext,
): Record<string, () => Promise<void>> {
  return {
    chat: async () => {
      const { runChat } = await import("../channels/cli/chat.ts");
      await runChat();
    },
    config: async () => {
      const { runConfig } = await import("./config/config.ts");
      await runConfig(ctx.subcommand, ctx.flags);
    },
    connect: async () => {
      const { runConnect } = await import("./commands/connect.ts");
      await runConnect(ctx.subcommand, ctx.flags);
    },
    cron: async () => {
      const { runCron } = await import("./commands/cron.ts");
      await runCron(ctx.subcommand, ctx.flags);
    },
    disconnect: async () => {
      const { runDisconnect } = await import("./commands/connect.ts");
      await runDisconnect(ctx.subcommand, ctx.flags);
    },
    dive: () => runDive(ctx.flags),
    patrol: () => runPatrol(),
    run: async () => {
      const { runStart } = await import("../gateway/startup/startup.ts");
      await runStart();
    },
    "run-triggers": async () => {
      const { runTriggers } = await import("./commands/run_triggers.ts");
      await runTriggers();
    },
    start: () => runDaemonStart(),
    stop: () => runDaemonStop(),
    status: () => runDaemonStatus(),
    logs: () => runDaemonLogs(ctx.subcommand, ctx.flags),
    tidepool: async () => {
      const { runTidepool } = await import("./commands/tidepool.ts");
      await runTidepool(ctx.subcommand, ctx.flags);
    },
    update: () => runUpdate(),
    version: () => {
      showVersion();
      return Promise.resolve();
    },
    help: () => {
      showHelp();
      return Promise.resolve();
    },
  };
}

/** Check whether a config file exists at the resolved path. */
async function detectConfigExists(): Promise<boolean> {
  try {
    await Deno.stat(resolveConfigPath());
    return true;
  } catch {
    return false;
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

/** Main CLI entry point. */
async function main(): Promise<void> {
  enableWindowsAnsi();
  await cleanupOldBinary();

  const configExists = await detectConfigExists();
  const parsed = parseCommand(Deno.args, { configExists });
  const dispatch = buildCommandDispatchMap(parsed);
  const handler = dispatch[parsed.command] ?? dispatch["help"];
  await handler();
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
