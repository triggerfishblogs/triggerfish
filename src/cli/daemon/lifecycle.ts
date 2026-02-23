/**
 * Daemon lifecycle operations: install, start, stop, status, uninstall.
 *
 * Barrel re-exporting from domain-specific sub-modules.
 * @module
 */

export { installAndStartDaemon } from "./lifecycle_install.ts";
export { stopDaemon } from "./lifecycle_stop.ts";
export { getDaemonStatus } from "./lifecycle_status.ts";
export { cleanupOldBinary, uninstallDaemon } from "./lifecycle_uninstall.ts";
