/**
 * Daemon restart operations: stop, wait for completion, then start.
 * @module
 */

import type { DaemonResult } from "./daemon.ts";
import { getDaemonStatus } from "./lifecycle_status.ts";
import { installAndStartDaemon } from "./lifecycle_install.ts";
import { stopDaemon } from "./lifecycle_stop.ts";
import { createLogger } from "../../core/logger/mod.ts";

const log = createLogger("cli.daemon");

const POLL_INTERVAL_MS = 500;
const POLL_TIMEOUT_MS = 5000;

/**
 * Poll daemon status until it reports not running or timeout is reached.
 *
 * @returns True if the daemon stopped within the timeout, false otherwise.
 */
async function awaitDaemonStopped(): Promise<boolean> {
  const deadline = Date.now() + POLL_TIMEOUT_MS;
  while (Date.now() < deadline) {
    const status = await getDaemonStatus();
    if (!status.running) return true;
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }
  return false;
}

/**
 * Restart the Triggerfish daemon: stop, wait for exit, then start.
 *
 * @param binaryPath - Absolute path to the triggerfish binary.
 * @returns Result indicating success or failure.
 */
export async function restartDaemon(
  binaryPath: string,
): Promise<DaemonResult> {
  const stopResult = await stopDaemon();
  if (!stopResult.ok) {
    log.error("Daemon stop failed during restart", {
      operation: "restartDaemon",
      message: stopResult.message,
    });
    return { ok: false, message: `Restart failed (stop): ${stopResult.message}` };
  }

  const stopped = await awaitDaemonStopped();
  if (!stopped) {
    log.error("Daemon did not stop within timeout during restart", {
      operation: "restartDaemon",
      timeoutMs: POLL_TIMEOUT_MS,
    });
    return {
      ok: false,
      message: `Restart failed: daemon did not stop within ${POLL_TIMEOUT_MS}ms`,
    };
  }

  return installAndStartDaemon(binaryPath);
}
