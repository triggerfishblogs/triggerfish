/**
 * Tidepool CLI command handler.
 *
 * Provides the `triggerfish tidepool url` subcommand.
 * Tidepool is an embedded component of the gateway process and cannot be
 * started or stopped independently — only `url` is a valid subcommand.
 * @module
 */

import { TIDEPOOL_PORT } from "../constants.ts";

/**
 * Returns the URL at which the Tidepool A2UI server is expected to listen.
 */
export function getTidepoolUrl(): string {
  return `http://127.0.0.1:${TIDEPOOL_PORT}`;
}

/**
 * Probes the Tidepool HTTP endpoint to check if it is currently running.
 *
 * @returns `true` if the server responded successfully, `false` otherwise.
 */
export async function probeTidepool(): Promise<boolean> {
  try {
    const response = await fetch(getTidepoolUrl(), {
      signal: AbortSignal.timeout(2000),
    });
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
    const alive = await probeTidepool();
    if (alive) {
      console.log(`  Tidepool: ${getTidepoolUrl()}`);
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
