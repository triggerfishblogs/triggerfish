/**
 * Daemon lifecycle operations: install, start, stop, status, uninstall.
 * @module
 */

import {
  detectDaemonManager,
  encodeUtf16Base64,
  generateLaunchdPlist,
  generateSystemdUnit,
  LAUNCHD_LABEL,
  launchdPlistPath,
  logDir,
  runCommand,
  runElevatedCommand,
  SCHTASKS_TASK_NAME,
  SYSTEMD_UNIT,
  systemdUnitPath,
  WINDOWS_SERVICE_NAME,
} from "./daemon.ts";
import type { DaemonResult, DaemonStatus } from "./daemon.ts";

/**
 * Install and start the Triggerfish daemon on the current OS.
 *
 * On macOS: writes a launchd plist and loads it via launchctl.
 * On Linux: writes a systemd user unit, reloads the daemon, enables and starts.
 *
 * @param binaryPath - Absolute path to the triggerfish binary.
 * @returns Result indicating success or failure.
 */
/** Install and start via launchd (macOS). */
async function installLaunchdDaemon(
  binaryPath: string,
): Promise<DaemonResult> {
  const plist = generateLaunchdPlist({ binaryPath });
  const plistPath = launchdPlistPath();
  const launchAgentsDir = `${Deno.env.get("HOME")}/Library/LaunchAgents`;
  await Deno.mkdir(launchAgentsDir, { recursive: true });
  await Deno.writeTextFile(plistPath, plist);
  await runCommand("launchctl", ["unload", plistPath]);
  const result = await runCommand("launchctl", ["load", plistPath]);
  return result.success
    ? {
      ok: true,
      message: `Daemon installed and started (launchd: ${LAUNCHD_LABEL})`,
    }
    : { ok: false, message: `Failed to start daemon: ${result.stderr}` };
}

/** Install and start via systemd (Linux). */
async function installSystemdDaemon(
  binaryPath: string,
): Promise<DaemonResult> {
  const unit = generateSystemdUnit({ binaryPath });
  const unitPath = systemdUnitPath();
  const unitDir = `${Deno.env.get("HOME")}/.config/systemd/user`;
  await Deno.mkdir(unitDir, { recursive: true });
  await Deno.writeTextFile(unitPath, unit);

  const lingerResult = await runCommand("loginctl", [
    "enable-linger",
    Deno.env.get("USER") ?? "",
  ]);
  if (!lingerResult.success) {
    console.log(
      "  \u26a0 Could not enable linger (daemon will stop on logout):",
      lingerResult.stderr,
    );
    console.log("    Fix: sudo loginctl enable-linger $USER");
  }

  await runCommand("systemctl", ["--user", "daemon-reload"]);
  await runCommand("systemctl", ["--user", "enable", SYSTEMD_UNIT]);
  const result = await runCommand("systemctl", [
    "--user",
    "start",
    SYSTEMD_UNIT,
  ]);
  return result.success
    ? {
      ok: true,
      message: `Daemon installed and started (systemd: ${SYSTEMD_UNIT})`,
    }
    : { ok: false, message: `Failed to start daemon: ${result.stderr}` };
}

/** Start via Windows Service (service must already be installed). */
async function startWindowsService(): Promise<DaemonResult> {
  const queryResult = await runCommand("sc", ["query", WINDOWS_SERVICE_NAME]);
  if (!queryResult.success) {
    return {
      ok: false,
      message:
        `Windows Service '${WINDOWS_SERVICE_NAME}' is not installed. Re-run the installer to set it up.`,
    };
  }
  if (queryResult.stdout.includes("RUNNING")) {
    return {
      ok: true,
      message:
        `Daemon is already running (Windows Service: ${WINDOWS_SERVICE_NAME})`,
    };
  }

  const startScript = [
    `Start-Service -Name '${WINDOWS_SERVICE_NAME}' -ErrorAction Stop`,
    `Start-Sleep -Seconds 2`,
  ].join("; ");
  await runElevatedCommand(encodeUtf16Base64(startScript));

  const verifyResult = await runCommand("sc", ["query", WINDOWS_SERVICE_NAME]);
  const isRunning = verifyResult.success &&
    verifyResult.stdout.includes("RUNNING");
  return isRunning
    ? {
      ok: true,
      message: `Daemon started (Windows Service: ${WINDOWS_SERVICE_NAME})`,
    }
    : {
      ok: false,
      message: "Failed to start service. Try running from an admin terminal.",
    };
}

/**
 * Install and start the Triggerfish daemon on the current OS.
 */
export async function installAndStartDaemon(
  binaryPath: string,
): Promise<DaemonResult> {
  const manager = detectDaemonManager();
  await Deno.mkdir(logDir(), { recursive: true });

  switch (manager) {
    case "launchd":
      return installLaunchdDaemon(binaryPath);
    case "systemd":
      return installSystemdDaemon(binaryPath);
    case "windows-service":
      return startWindowsService();
    default:
      return { ok: false, message: `Unsupported daemon manager: ${manager}` };
  }
}

/**
 * Stop the Triggerfish daemon.
 *
 * @returns Result indicating success or failure.
 */
export async function stopDaemon(): Promise<DaemonResult> {
  const manager = detectDaemonManager();

  if (manager === "launchd") {
    const plistPath = launchdPlistPath();
    const result = await runCommand("launchctl", ["unload", plistPath]);
    return result.success
      ? { ok: true, message: "Daemon stopped" }
      : { ok: false, message: `Failed to stop daemon: ${result.stderr}` };
  }

  if (manager === "systemd") {
    const result = await runCommand("systemctl", [
      "--user",
      "stop",
      SYSTEMD_UNIT,
    ]);
    return result.success
      ? { ok: true, message: "Daemon stopped" }
      : { ok: false, message: `Failed to stop daemon: ${result.stderr}` };
  }

  if (manager === "windows-service") {
    // Include a 2-second delay after stopping to let the service release
    // file locks before any subsequent binary replacement or restart.
    const stopScript = [
      `Stop-Service -Name '${WINDOWS_SERVICE_NAME}' -Force -ErrorAction Stop`,
      `Start-Sleep -Seconds 2`,
    ].join("; ");
    const encoded = encodeUtf16Base64(stopScript);

    await runElevatedCommand(encoded);

    // Verify it stopped
    const verifyResult = await runCommand("sc", [
      "query",
      WINDOWS_SERVICE_NAME,
    ]);
    const stopped = verifyResult.stdout.includes("STOPPED") ||
      !verifyResult.success;
    return stopped ? { ok: true, message: "Daemon stopped" } : {
      ok: false,
      message: "Failed to stop daemon. Try running from an admin terminal.",
    };
  }

  return { ok: false, message: `Unsupported daemon manager: ${manager}` };
}

/**
 * Get the current status of the Triggerfish daemon.
 *
 * @returns Status information including whether the daemon is running.
 */
/** Get launchd daemon status (macOS). */
async function getLaunchdStatus(): Promise<DaemonStatus> {
  const result = await runCommand("launchctl", ["list", LAUNCHD_LABEL]);
  if (result.success) {
    const pidMatch = result.stdout.match(/"PID"\s*=\s*(\d+)/);
    return {
      running: true,
      pid: pidMatch ? parseInt(pidMatch[1], 10) : undefined,
      manager: "launchd",
      message: `Daemon is running (launchd: ${LAUNCHD_LABEL})`,
    };
  }
  return {
    running: false,
    manager: "launchd",
    message: "Daemon is not running",
  };
}

/** Get systemd daemon status (Linux). */
async function getSystemdStatus(): Promise<DaemonStatus> {
  const result = await runCommand("systemctl", [
    "--user",
    "is-active",
    SYSTEMD_UNIT,
  ]);
  if (result.stdout !== "active") {
    return {
      running: false,
      manager: "systemd",
      message: "Daemon is not running",
    };
  }
  const showResult = await runCommand("systemctl", [
    "--user",
    "show",
    SYSTEMD_UNIT,
    "--property=MainPID,ActiveEnterTimestamp",
  ]);
  const pidMatch = showResult.stdout.match(/MainPID=(\d+)/);
  const tsMatch = showResult.stdout.match(/ActiveEnterTimestamp=(.+)/);
  return {
    running: true,
    pid: pidMatch ? parseInt(pidMatch[1], 10) : undefined,
    uptime: tsMatch ? tsMatch[1] : undefined,
    manager: "systemd",
    message: `Daemon is running (systemd: ${SYSTEMD_UNIT})`,
  };
}

/** Get Windows Service daemon status. */
async function getWindowsServiceStatus(): Promise<DaemonStatus> {
  const result = await runCommand("sc", ["query", WINDOWS_SERVICE_NAME]);
  if (!(result.success && result.stdout.includes("RUNNING"))) {
    return {
      running: false,
      manager: "windows-service",
      message: "Daemon is not running",
    };
  }
  const tasklistResult = await runCommand("tasklist", [
    "/fi",
    "imagename eq triggerfish.exe",
    "/fo",
    "CSV",
    "/nh",
  ]);
  const pidMatch = tasklistResult.stdout.match(/"triggerfish\.exe","(\d+)"/);
  return {
    running: true,
    pid: pidMatch ? parseInt(pidMatch[1], 10) : undefined,
    manager: "windows-service",
    message: `Daemon is running (Windows Service: ${WINDOWS_SERVICE_NAME})`,
  };
}

/**
 * Get the current status of the Triggerfish daemon.
 */
export async function getDaemonStatus(): Promise<DaemonStatus> {
  const manager = detectDaemonManager();
  switch (manager) {
    case "launchd":
      return getLaunchdStatus();
    case "systemd":
      return getSystemdStatus();
    case "windows-service":
      return getWindowsServiceStatus();
    default:
      return {
        running: false,
        manager,
        message: `Unsupported daemon manager: ${manager}`,
      };
  }
}

/**
 * Uninstall the Triggerfish daemon completely.
 *
 * Stops the daemon and removes the service definition.
 *
 * @returns Result indicating success or failure.
 */
/** Uninstall launchd daemon (macOS). */
async function uninstallLaunchdDaemon(): Promise<DaemonResult> {
  try {
    await Deno.remove(launchdPlistPath());
  } catch { /* already removed */ }
  return { ok: true, message: "Daemon uninstalled" };
}

/** Uninstall systemd daemon (Linux). */
async function uninstallSystemdDaemon(): Promise<DaemonResult> {
  await runCommand("systemctl", ["--user", "disable", SYSTEMD_UNIT]);
  try {
    await Deno.remove(systemdUnitPath());
  } catch { /* already removed */ }
  await runCommand("systemctl", ["--user", "daemon-reload"]);
  return { ok: true, message: "Daemon uninstalled" };
}

/** Uninstall Windows Service. */
async function uninstallWindowsService(): Promise<DaemonResult> {
  const script = [
    `Stop-Service -Name '${WINDOWS_SERVICE_NAME}' -Force -ErrorAction SilentlyContinue`,
    `Start-Sleep -Seconds 2`,
    `sc.exe delete '${WINDOWS_SERVICE_NAME}' | Out-Null`,
    `schtasks /delete /tn '${SCHTASKS_TASK_NAME}' /f 2>$null | Out-Null`,
  ].join("; ");
  await runElevatedCommand(encodeUtf16Base64(script));
  const verifyResult = await runCommand("sc", ["query", WINDOWS_SERVICE_NAME]);
  const removed = !verifyResult.success ||
    verifyResult.stderr.includes("1060");
  return removed ? { ok: true, message: "Daemon uninstalled" } : {
    ok: false,
    message: "Failed to uninstall daemon. Try running from an admin terminal.",
  };
}

/**
 * Uninstall the Triggerfish daemon completely.
 */
export async function uninstallDaemon(): Promise<DaemonResult> {
  await stopDaemon();
  const manager = detectDaemonManager();
  switch (manager) {
    case "launchd":
      return uninstallLaunchdDaemon();
    case "systemd":
      return uninstallSystemdDaemon();
    case "windows-service":
      return uninstallWindowsService();
    default:
      return { ok: false, message: `Unsupported daemon manager: ${manager}` };
  }
}

/**
 * Clean up leftover `.old` binary from a previous Windows update.
 *
 * On Windows, the update process renames the running binary to `{path}.old`
 * before placing the new one. This function removes the `.old` file if present.
 * Safe to call on any platform — no-ops on Unix.
 */
export async function cleanupOldBinary(): Promise<void> {
  if (Deno.build.os !== "windows") return;
  try {
    const execPath = Deno.execPath();
    const oldPath = `${execPath}.old`;
    await Deno.remove(oldPath);
  } catch {
    // No .old file or can't remove — that's fine
  }
}
