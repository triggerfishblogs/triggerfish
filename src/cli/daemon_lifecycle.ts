/**
 * Daemon lifecycle operations: install, start, stop, status, uninstall.
 * @module
 */

import {
  detectDaemonManager,
  generateLaunchdPlist,
  generateSystemdUnit,
  launchdPlistPath,
  systemdUnitPath,
  logDir,
  runCommand,
  runElevatedCommand,
  encodeUtf16Base64,
  LAUNCHD_LABEL,
  SYSTEMD_UNIT,
  WINDOWS_SERVICE_NAME,
  SCHTASKS_TASK_NAME,
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
export async function installAndStartDaemon(
  binaryPath: string,
): Promise<DaemonResult> {
  const manager = detectDaemonManager();

  // Ensure log directory exists
  await Deno.mkdir(logDir(), { recursive: true });

  if (manager === "launchd") {
    const plist = generateLaunchdPlist({ binaryPath });
    const plistPath = launchdPlistPath();

    // Ensure LaunchAgents directory exists
    const launchAgentsDir = `${Deno.env.get("HOME")}/Library/LaunchAgents`;
    await Deno.mkdir(launchAgentsDir, { recursive: true });

    await Deno.writeTextFile(plistPath, plist);

    // Unload first if already loaded (ignore errors)
    await runCommand("launchctl", ["unload", plistPath]);

    // Load the plist
    const result = await runCommand("launchctl", ["load", plistPath]);

    return result.success
      ? { ok: true, message: `Daemon installed and started (launchd: ${LAUNCHD_LABEL})` }
      : { ok: false, message: `Failed to start daemon: ${result.stderr}` };
  }

  if (manager === "systemd") {
    const unit = generateSystemdUnit({ binaryPath });
    const unitPath = systemdUnitPath();

    // Ensure systemd user directory exists
    const unitDir = `${Deno.env.get("HOME")}/.config/systemd/user`;
    await Deno.mkdir(unitDir, { recursive: true });

    await Deno.writeTextFile(unitPath, unit);

    // Enable lingering so the user service survives logout.
    // Without this, systemd kills all user services when the session ends.
    const lingerResult = await runCommand("loginctl", [
      "enable-linger",
      Deno.env.get("USER") ?? "",
    ]);
    if (!lingerResult.success) {
      // Non-fatal — service will still work while logged in
      console.log(
        "  \u26a0 Could not enable linger (daemon will stop on logout):",
        lingerResult.stderr,
      );
      console.log(
        "    Fix: sudo loginctl enable-linger $USER",
      );
    }

    // Reload systemd daemon
    await runCommand("systemctl", ["--user", "daemon-reload"]);

    // Enable the service
    await runCommand("systemctl", ["--user", "enable", SYSTEMD_UNIT]);

    // Start the service
    const result = await runCommand("systemctl", ["--user", "start", SYSTEMD_UNIT]);

    return result.success
      ? { ok: true, message: `Daemon installed and started (systemd: ${SYSTEMD_UNIT})` }
      : { ok: false, message: `Failed to start daemon: ${result.stderr}` };
  }

  if (manager === "windows-service") {
    // On Windows, the install script (install.ps1 / install-from-source.ps1)
    // handles service compilation and registration. `triggerfish start` just
    // starts the already-installed service.
    const queryResult = await runCommand("sc", ["query", WINDOWS_SERVICE_NAME]);
    if (!queryResult.success) {
      return {
        ok: false,
        message: `Windows Service '${WINDOWS_SERVICE_NAME}' is not installed. Re-run the installer to set it up.`,
      };
    }

    if (queryResult.stdout.includes("RUNNING")) {
      return { ok: true, message: `Daemon is already running (Windows Service: ${WINDOWS_SERVICE_NAME})` };
    }

    // Start the service (needs elevation) and wait briefly for it to settle
    const startScript = [
      `Start-Service -Name '${WINDOWS_SERVICE_NAME}' -ErrorAction Stop`,
      `Start-Sleep -Seconds 2`,
    ].join("; ");
    const encoded = encodeUtf16Base64(startScript);
    await runElevatedCommand(encoded);

    // Verify it started
    const verifyResult = await runCommand("sc", ["query", WINDOWS_SERVICE_NAME]);
    const isRunning = verifyResult.success && verifyResult.stdout.includes("RUNNING");
    return isRunning
      ? { ok: true, message: `Daemon started (Windows Service: ${WINDOWS_SERVICE_NAME})` }
      : { ok: false, message: "Failed to start service. Try running from an admin terminal." };
  }

  return { ok: false, message: `Unsupported daemon manager: ${manager}` };
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
    const result = await runCommand("systemctl", ["--user", "stop", SYSTEMD_UNIT]);
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
    const verifyResult = await runCommand("sc", ["query", WINDOWS_SERVICE_NAME]);
    const stopped = verifyResult.stdout.includes("STOPPED") || !verifyResult.success;
    return stopped
      ? { ok: true, message: "Daemon stopped" }
      : { ok: false, message: "Failed to stop daemon. Try running from an admin terminal." };
  }

  return { ok: false, message: `Unsupported daemon manager: ${manager}` };
}

/**
 * Get the current status of the Triggerfish daemon.
 *
 * @returns Status information including whether the daemon is running.
 */
export async function getDaemonStatus(): Promise<DaemonStatus> {
  const manager = detectDaemonManager();

  if (manager === "launchd") {
    const result = await runCommand("launchctl", ["list", LAUNCHD_LABEL]);
    if (result.success) {
      // Parse PID from launchctl list output
      const pidMatch = result.stdout.match(/"PID"\s*=\s*(\d+)/);
      return {
        running: true,
        pid: pidMatch ? parseInt(pidMatch[1], 10) : undefined,
        manager,
        message: `Daemon is running (launchd: ${LAUNCHD_LABEL})`,
      };
    }
    return {
      running: false,
      manager,
      message: "Daemon is not running",
    };
  }

  if (manager === "systemd") {
    const result = await runCommand("systemctl", [
      "--user",
      "is-active",
      SYSTEMD_UNIT,
    ]);
    const isActive = result.stdout === "active";

    if (isActive) {
      // Get PID from show
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
        manager,
        message: `Daemon is running (systemd: ${SYSTEMD_UNIT})`,
      };
    }

    return {
      running: false,
      manager,
      message: "Daemon is not running",
    };
  }

  if (manager === "windows-service") {
    // sc query doesn't need admin
    const result = await runCommand("sc", ["query", WINDOWS_SERVICE_NAME]);

    if (result.success && result.stdout.includes("RUNNING")) {
      // Get PID via tasklist
      const tasklistResult = await runCommand("tasklist", [
        "/fi", "imagename eq triggerfish.exe", "/fo", "CSV", "/nh",
      ]);
      let pid: number | undefined;
      const pidMatch = tasklistResult.stdout.match(/"triggerfish\.exe","(\d+)"/);
      if (pidMatch) {
        pid = parseInt(pidMatch[1], 10);
      }

      return {
        running: true,
        pid,
        manager,
        message: `Daemon is running (Windows Service: ${WINDOWS_SERVICE_NAME})`,
      };
    }

    return {
      running: false,
      manager,
      message: "Daemon is not running",
    };
  }

  return {
    running: false,
    manager,
    message: `Unsupported daemon manager: ${manager}`,
  };
}

/**
 * Uninstall the Triggerfish daemon completely.
 *
 * Stops the daemon and removes the service definition.
 *
 * @returns Result indicating success or failure.
 */
export async function uninstallDaemon(): Promise<DaemonResult> {
  // Stop first
  await stopDaemon();

  const manager = detectDaemonManager();

  if (manager === "launchd") {
    const plistPath = launchdPlistPath();
    try {
      await Deno.remove(plistPath);
    } catch {
      // Already removed
    }
    return { ok: true, message: "Daemon uninstalled" };
  }

  if (manager === "systemd") {
    // Disable the service
    await runCommand("systemctl", ["--user", "disable", SYSTEMD_UNIT]);

    const unitPath = systemdUnitPath();
    try {
      await Deno.remove(unitPath);
    } catch {
      // Already removed
    }

    // Reload daemon
    await runCommand("systemctl", ["--user", "daemon-reload"]);

    return { ok: true, message: "Daemon uninstalled" };
  }

  if (manager === "windows-service") {
    const uninstallScript = [
      `Stop-Service -Name '${WINDOWS_SERVICE_NAME}' -Force -ErrorAction SilentlyContinue`,
      `Start-Sleep -Seconds 2`,
      `sc.exe delete '${WINDOWS_SERVICE_NAME}' | Out-Null`,
      `schtasks /delete /tn '${SCHTASKS_TASK_NAME}' /f 2>$null | Out-Null`,
    ].join("; ");
    const encoded = encodeUtf16Base64(uninstallScript);

    await runElevatedCommand(encoded);

    // Verify removal
    const verifyResult = await runCommand("sc", ["query", WINDOWS_SERVICE_NAME]);
    const removed = !verifyResult.success || verifyResult.stderr.includes("1060");
    return removed
      ? { ok: true, message: "Daemon uninstalled" }
      : { ok: false, message: "Failed to uninstall daemon. Try running from an admin terminal." };
  }

  return { ok: false, message: `Unsupported daemon manager: ${manager}` };
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
