/**
 * Daemon lifecycle CLI commands.
 *
 * Handles start, stop, status, logs, and update operations for the
 * Triggerfish daemon process.
 *
 * @module
 */

import { Confirm } from "@cliffy/prompt";
import {
  bundleLogs,
  installAndStartDaemon,
  getDaemonStatus,
  stopDaemon,
  tailLogs,
  updateTriggerfish,
} from "./daemon/daemon.ts";
import { TIDEPOOL_PORT } from "./constants.ts";
import { fetchChangelogRange } from "./daemon/updater/changelog.ts";
import { formatChangelogPlainText } from "./daemon/updater/changelog_format.ts";
import { createLogger } from "../core/logger/mod.ts";

const log = createLogger("cli.daemon");

// ─── Daemon status ────────────────────────────────────────────────────────────

/** Show daemon status. */
export async function runDaemonStatus(): Promise<void> {
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

// ─── Daemon start / stop ──────────────────────────────────────────────────────

/** Install the Triggerfish daemon and start it. */
export async function runDaemonStart(): Promise<void> {
  const result = await installAndStartDaemon(Deno.execPath());
  if (result.ok) {
    console.log("✓ Daemon installed and started");
    console.log(
      `  Tidepool: http://127.0.0.1:${TIDEPOOL_PORT} (available once daemon is ready)`,
    );
  } else {
    log.error("Daemon start failed", { operation: "startDaemon", message: result.message });
    console.log(`✗ ${result.message}`);
    Deno.exit(1);
  }
}

/** Stop the Triggerfish daemon. */
export async function runDaemonStop(): Promise<void> {
  const result = await stopDaemon();
  if (result.ok) {
    console.log("✓ Daemon stopped");
  } else {
    log.error("Daemon stop failed", { operation: "stopDaemon", message: result.message });
    console.log(`✗ ${result.message}`);
    Deno.exit(1);
  }
}

// ─── Daemon logs ──────────────────────────────────────────────────────────────

/**
 * Tail or bundle daemon logs.
 *
 * Subcommands:
 * - `view` (default) -- stream the log file to stdout, optionally following.
 * - `bundle` -- copy all log files to a temporary directory and print the path.
 */
export async function runDaemonLogs(
  subcommand: string | undefined,
  flags: Readonly<Record<string, boolean | string>>,
): Promise<void> {
  if (subcommand === "bundle") {
    await bundleLogs();
    return;
  }
  // "view" or no subcommand -> old streaming behaviour
  const follow = flags.tail === true;
  const levelFilter = typeof flags.level === "string" ? flags.level : undefined;
  await tailLogs(follow, 50, levelFilter);
}

// ─── Update ───────────────────────────────────────────────────────────────────

/** Prompt user to start daemon if it was not running after update. */
async function promptDaemonStartAfterUpdate(): Promise<void> {
  const startIt = await Confirm.prompt({
    message: "Daemon was not running. Start it now?",
    default: true,
  });
  if (!startIt) return;
  const startResult = await installAndStartDaemon(Deno.execPath());
  console.log(startResult.ok ? "✓ Daemon started" : `✗ ${startResult.message}`);
}

/** Display release notes between old and new version after update. */
async function displayPostUpdateChangelog(
  previousVersion: string,
  newVersion: string,
): Promise<void> {
  try {
    const changelog = await fetchChangelogRange(previousVersion, newVersion);
    if (changelog.ok && changelog.value.releases.length > 0) {
      console.log("\nWhat's new:\n");
      console.log(formatChangelogPlainText(changelog.value));
    }
  } catch (err) {
    // Non-critical: log but don't disrupt update flow
    log.warn("Changelog fetch failed after update", { operation: "displayPostUpdateChangelog", err });
  }
}

/** Handle a successful update result (new version or already up to date). */
async function handleUpdateSuccess(result: {
  readonly previousVersion?: string;
  readonly newVersion?: string;
  readonly message: string;
  readonly wasRunning?: boolean;
}): Promise<void> {
  if (result.previousVersion === result.newVersion) {
    console.log("✓ Already up to date (" + result.newVersion + ")");
    return;
  }
  console.log("✓", result.message);
  if (
    result.previousVersion && result.newVersion &&
    result.previousVersion !== result.newVersion
  ) {
    await displayPostUpdateChangelog(result.previousVersion, result.newVersion);
  }
  if (result.wasRunning) {
    console.log("\nRun 'triggerfish status' to verify the daemon restarted.");
  } else {
    await promptDaemonStartAfterUpdate();
  }
}

/** Download and install the latest release binary. */
export async function runUpdate(): Promise<void> {
  console.log("Updating Triggerfish...\n");
  const result = await updateTriggerfish();
  if (result.ok) {
    await handleUpdateSuccess(result);
  } else {
    log.error("Triggerfish self-update failed", { operation: "updateTriggerfish", message: result.message });
    console.log("✗", result.message);
    Deno.exit(1);
  }
}
