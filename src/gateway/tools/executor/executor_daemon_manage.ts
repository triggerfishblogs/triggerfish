/**
 * Daemon management executor.
 *
 * Handles restart and status actions for the daemon_manage tool.
 * Restart exits with code 138, which the service manager is configured
 * to treat as a restart trigger (systemd: RestartForceExitStatus=138,
 * launchd: KeepAlive=true, Windows: recovery actions).
 *
 * @module
 */

import { createLogger } from "../../../core/logger/mod.ts";

const log = createLogger("daemon-manage");

/** Exit code that signals the service manager to restart the daemon. */
const RESTART_EXIT_CODE = 138;

/** Daemon running status. */
interface DaemonStatus {
  readonly running: boolean;
  readonly pid?: number;
  readonly uptime?: string;
  readonly manager?: string;
  readonly message: string;
}

/** Context required by the daemon_manage executor. */
export interface DaemonManageContext {
  /** Get current daemon status. */
  readonly getDaemonStatus: () => Promise<DaemonStatus>;
  /** Out-of-band user confirmation prompt (CLI or Tidepool). */
  readonly getConfirmPrompt: () => (message: string) => Promise<boolean>;
}

/** Handle the status action. */
async function executeStatus(
  ctx: DaemonManageContext,
): Promise<string> {
  try {
    const status = await ctx.getDaemonStatus();
    return JSON.stringify({
      running: status.running,
      pid: status.pid ?? null,
      uptime: status.uptime ?? null,
      manager: status.manager ?? null,
      message: status.message,
    });
  } catch (err: unknown) {
    log.error("Daemon status check failed", {
      operation: "daemonManageStatus",
      err,
    });
    return `Error: Failed to check daemon status: ${
      err instanceof Error ? err.message : String(err)
    }`;
  }
}

/** Handle the restart action. */
async function executeRestart(
  ctx: DaemonManageContext,
  reason: string,
): Promise<string> {
  const confirmPrompt = ctx.getConfirmPrompt();
  const approved = await confirmPrompt(
    `Restart Triggerfish daemon? Reason: ${reason}`,
  );
  if (!approved) {
    log.info("Daemon restart denied by user", {
      operation: "daemonManageRestart",
      reason,
    });
    return JSON.stringify({
      success: false,
      message: "Restart cancelled by user.",
    });
  }

  log.info("Daemon restart approved, exiting with code 138", {
    operation: "daemonManageRestart",
    reason,
  });

  // Schedule exit after yielding so the response can flush to the client.
  // Exit code 138 tells the service manager to restart the daemon.
  queueMicrotask(() => {
    setTimeout(() => Deno.exit(RESTART_EXIT_CODE), 500);
  });

  return JSON.stringify({
    success: true,
    message: "Daemon restarting...",
  });
}

/**
 * Create a SubsystemExecutor for daemon_manage.
 *
 * Returns null for non-matching tool names so the dispatch chain
 * continues to the next executor.
 */
export function createDaemonManageExecutor(
  ctx: DaemonManageContext,
): (name: string, input: Record<string, unknown>) => Promise<string | null> {
  return async (
    name: string,
    input: Record<string, unknown>,
  ): Promise<string | null> => {
    if (name !== "daemon_manage") return null;

    const action = input.action as string | undefined;
    if (!action) {
      return "Error: daemon_manage requires an 'action' parameter (restart, status).";
    }

    switch (action) {
      case "status":
        return await executeStatus(ctx);
      case "restart": {
        const reason = (input.reason as string) || "Configuration change";
        return await executeRestart(ctx, reason);
      }
      default:
        return `Error: Unknown action "${action}". Valid actions: restart, status.`;
    }
  };
}
