/**
 * Tidepool CLI command handler.
 *
 * Provides the `triggerfish tidepool url` subcommand.
 * Tidepool is an embedded component of the gateway process and cannot be
 * started or stopped independently — only `url` is a valid subcommand.
 * @module
 */

import {
  type DaemonState,
  daemonStatePath,
  TIDEPOOL_PORT,
} from "../constants.ts";

/**
 * Read the daemon state file to get the authenticated Tidepool URL.
 *
 * Returns null if the state file does not exist or is unreadable.
 */
async function readDaemonState(): Promise<DaemonState | null> {
  try {
    const text = await Deno.readTextFile(daemonStatePath());
    return JSON.parse(text) as DaemonState;
  } catch {
    return null;
  }
}

/**
 * Probes the Tidepool HTTP endpoint to check if it is currently running.
 *
 * Reads the session key from the daemon state file so the probe
 * request passes authentication.
 *
 * @returns `true` if the server responded successfully, `false` otherwise.
 */
export async function probeTidepool(): Promise<boolean> {
  try {
    const state = await readDaemonState();
    const url = state?.tidepoolUrl ?? `http://127.0.0.1:${TIDEPOOL_PORT}`;
    const response = await fetch(url, {
      signal: AbortSignal.timeout(2000),
    });
    await response.body?.cancel();
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Handle the `triggerfish tidepool` command.
 *
 * Supported subcommands:
 * - `url` — probe port and print the Tidepool URL if live
 * - (none) — same as `url`
 *
 * @param subcommand - The subcommand string parsed from the CLI args.
 * @param _flags     - Parsed flags (unused; reserved for future options).
 */
export async function runTidepool(
  subcommand: string | undefined,
  _flags: Readonly<Record<string, boolean | string>>,
): Promise<void> {
  if (subcommand === undefined || subcommand === "url") {
    const state = await readDaemonState();
    if (state) {
      const alive = await probeTidepool();
      if (alive) {
        console.log(`  Tidepool: ${state.tidepoolUrl}`);
      } else {
        console.log("✗ Tidepool is not running.");
        console.log(
          "  Run 'triggerfish run' or 'triggerfish start' to launch the gateway.",
        );
      }
    } else {
      console.log("✗ Tidepool is not running.");
      console.log(
        "  Run 'triggerfish run' or 'triggerfish start' to launch the gateway.",
      );
    }
    return;
  }

  // Unrecognised subcommand
  console.log(`Unknown tidepool subcommand: ${subcommand}`);
  console.log("Valid subcommand: url");
  console.log("  triggerfish tidepool url   # Print Tidepool URL if running");
}
