/**
 * CLI-facing port constants and paths for the Triggerfish gateway components.
 *
 * Single source of truth for well-known port numbers referenced by CLI
 * commands, startup output, and probe functions.
 * @module
 */

import { join } from "@std/path";
import { resolveBaseDir } from "./config/paths.ts";

/** Port that the Tidepool A2UI server listens on. */
export const TIDEPOOL_PORT = 18790;

/** Port that the Gateway WebSocket server listens on. */
export const GATEWAY_PORT = 18789;

/** Filename for the daemon runtime state file. */
const DAEMON_STATE_FILENAME = "daemon.json";

/** Resolve the path to the daemon runtime state file (`~/.triggerfish/daemon.json`). */
export function daemonStatePath(): string {
  return join(resolveBaseDir(), DAEMON_STATE_FILENAME);
}

/** Runtime state written by the daemon on startup. */
export interface DaemonState {
  readonly tidepoolUrl: string;
  readonly startedAt: string;
}

/**
 * Resolve the path to the persistent Tidepool session key file.
 *
 * Stored separately from daemon.json because daemon.json is deleted
 * on every `triggerfish start` (clearDaemonState). The session key
 * must survive restarts so Tidepool clients can reconnect with the
 * same `?key=` parameter after a daemon restart or self-update.
 */
export function tidepoolSessionKeyPath(): string {
  return join(resolveBaseDir(), "tidepool-session-key");
}
