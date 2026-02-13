/**
 * OS-native daemon management for Triggerfish.
 *
 * Detects the host daemon manager and provides install/start/stop/status/logs
 * operations for launchd (macOS), systemd (Linux), and Windows Task Scheduler.
 * @module
 */

/** Supported daemon manager types. */
export type DaemonManagerType =
  | "launchd"
  | "systemd"
  | "windows-service"
  | "unsupported";

/** Options for generating daemon service definitions. */
export interface DaemonOptions {
  readonly binaryPath: string;
}

/** Result of a daemon operation. */
export interface DaemonResult {
  readonly ok: boolean;
  readonly message: string;
}

/** Daemon status information. */
export interface DaemonStatus {
  readonly running: boolean;
  readonly pid?: number;
  readonly uptime?: string;
  readonly manager: DaemonManagerType;
  readonly message: string;
}

/** Service name constants. */
const LAUNCHD_LABEL = "dev.triggerfish.agent";
const SYSTEMD_UNIT = "triggerfish.service";

/**
 * Detect the OS-native daemon manager on the current system.
 *
 * @returns The daemon manager type for the host OS.
 */
export function detectDaemonManager(): DaemonManagerType {
  const os = Deno.build.os;
  switch (os) {
    case "darwin":
      return "launchd";
    case "linux":
      return "systemd";
    case "windows":
      return "windows-service";
    default:
      return "unsupported";
  }
}

/**
 * Get the path where the launchd plist is installed.
 */
function launchdPlistPath(): string {
  return `${Deno.env.get("HOME")}/Library/LaunchAgents/${LAUNCHD_LABEL}.plist`;
}

/**
 * Get the path where the systemd unit file is installed.
 */
function systemdUnitPath(): string {
  return `${Deno.env.get("HOME")}/.config/systemd/user/${SYSTEMD_UNIT}`;
}

/**
 * Get the log directory path.
 */
export function logDir(): string {
  return `${Deno.env.get("HOME")}/.triggerfish/logs`;
}

/**
 * Get the stdout log file path.
 */
export function logFilePath(): string {
  return `${logDir()}/triggerfish.log`;
}

/**
 * Generate a macOS launchd plist for the Triggerfish daemon.
 *
 * @param options - Daemon configuration including binary path.
 * @returns XML plist string for ~/Library/LaunchAgents/.
 */
export function generateLaunchdPlist(options: DaemonOptions): string {
  const logFile = logFilePath();
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>${LAUNCHD_LABEL}</string>
  <key>ProgramArguments</key>
  <array>
    <string>${options.binaryPath}</string>
    <string>run</string>
  </array>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <true/>
  <key>StandardOutPath</key>
  <string>${logFile}</string>
  <key>StandardErrorPath</key>
  <string>${logFile}</string>
</dict>
</plist>
`;
}

/**
 * Generate a Linux systemd user unit file for the Triggerfish daemon.
 *
 * @param options - Daemon configuration including binary path.
 * @returns Systemd unit file content for ~/.config/systemd/user/.
 */
export function generateSystemdUnit(options: DaemonOptions): string {
  return `[Unit]
Description=Triggerfish AI Agent
After=network.target

[Service]
Type=simple
ExecStart=${options.binaryPath} run
Restart=on-failure
RestartSec=5
Environment=DENO_DIR=%h/.cache/deno

[Install]
WantedBy=default.target
`;
}

/**
 * Run a shell command and capture output.
 *
 * @param cmd - Command name.
 * @param args - Command arguments.
 * @returns Decoded stdout, stderr, and success flag.
 */
async function runCommand(
  cmd: string,
  args: string[],
): Promise<{ stdout: string; stderr: string; success: boolean }> {
  const command = new Deno.Command(cmd, {
    args,
    stdout: "piped",
    stderr: "piped",
  });
  const output = await command.output();
  return {
    stdout: new TextDecoder().decode(output.stdout).trim(),
    stderr: new TextDecoder().decode(output.stderr).trim(),
    success: output.success,
  };
}

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
        "  ⚠ Could not enable linger (daemon will stop on logout):",
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

  return {
    running: false,
    manager,
    message: `Unsupported daemon manager: ${manager}`,
  };
}

/**
 * Tail the Triggerfish log file. Streams output to stdout.
 *
 * Uses journalctl on systemd systems, falls back to reading
 * the log file directly on other platforms.
 *
 * @param follow - Whether to follow (tail -f) the log. Default: true.
 * @param lines - Number of lines to show. Default: 50.
 */
export async function tailLogs(
  follow = true,
  lines = 50,
): Promise<void> {
  const manager = detectDaemonManager();

  if (manager === "systemd") {
    // Use journalctl for systemd
    const args = [
      "--user",
      "-u",
      SYSTEMD_UNIT,
      `-n${lines}`,
    ];
    if (follow) args.push("-f");

    const cmd = new Deno.Command("journalctl", {
      args,
      stdout: "inherit",
      stderr: "inherit",
    });
    const child = cmd.spawn();
    await child.status;
    return;
  }

  // Fallback: read log file directly
  const path = logFilePath();
  try {
    await Deno.stat(path);
  } catch {
    console.log(`No log file found at ${path}`);
    console.log("Start the daemon first: triggerfish start");
    return;
  }

  if (follow) {
    const cmd = new Deno.Command("tail", {
      args: ["-f", `-n${lines}`, path],
      stdout: "inherit",
      stderr: "inherit",
    });
    const child = cmd.spawn();
    await child.status;
  } else {
    const cmd = new Deno.Command("tail", {
      args: [`-n${lines}`, path],
      stdout: "inherit",
      stderr: "inherit",
    });
    const child = cmd.spawn();
    await child.status;
  }
}

/** Result of an update operation. */
export interface UpdateResult {
  readonly ok: boolean;
  readonly message: string;
  readonly previousVersion?: string;
  readonly newVersion?: string;
}

const GITHUB_REPO = "greghavens/triggerfish";
const GITHUB_API = `https://api.github.com/repos/${GITHUB_REPO}`;

/**
 * Resolve the platform-specific asset name for the current OS and architecture.
 */
function resolveAssetName(): string {
  const os = Deno.build.os === "darwin" ? "macos" : Deno.build.os;
  const arch = Deno.build.arch === "aarch64" ? "arm64" : "x64";
  const ext = Deno.build.os === "windows" ? ".exe" : "";
  return `triggerfish-${os}-${arch}${ext}`;
}

/**
 * Update Triggerfish to the latest tagged release.
 *
 * Downloads the platform binary from the latest GitHub release,
 * stops the running daemon, replaces the binary, and restarts.
 *
 * @returns Result indicating success or failure.
 */
export async function updateTriggerfish(): Promise<UpdateResult> {
  // Fetch latest release tag
  console.log("Checking for updates...");
  let latestTag: string;
  let downloadUrl: string;
  try {
    const resp = await fetch(`${GITHUB_API}/releases/latest`);
    if (!resp.ok) {
      return { ok: false, message: `Failed to check for updates: HTTP ${resp.status}` };
    }
    const release = await resp.json() as {
      tag_name: string;
      assets: readonly { name: string; browser_download_url: string }[];
    };
    latestTag = release.tag_name;

    const assetName = resolveAssetName();
    const asset = release.assets.find((a) => a.name === assetName);
    if (!asset) {
      return {
        ok: false,
        message: `No binary for this platform (${assetName}) in release ${latestTag}`,
      };
    }
    downloadUrl = asset.browser_download_url;
  } catch (e) {
    return { ok: false, message: `Failed to check for updates: ${e}` };
  }

  console.log(`  Updating to ${latestTag}`);

  // Download new binary to temp file
  const tmpPath = `${Deno.env.get("HOME")}/.triggerfish/.update-tmp`;
  console.log("Downloading...");
  try {
    const resp = await fetch(downloadUrl);
    if (!resp.ok || !resp.body) {
      return { ok: false, message: `Download failed: HTTP ${resp.status}` };
    }
    const file = await Deno.open(tmpPath, { write: true, create: true, truncate: true });
    await resp.body.pipeTo(file.writable);
    await Deno.chmod(tmpPath, 0o755);
  } catch (e) {
    try { await Deno.remove(tmpPath); } catch { /* */ }
    return { ok: false, message: `Download failed: ${e}` };
  }

  // Find where the current binary is installed
  const binaryPath = await findInstalledBinary();

  // Check daemon state before we exit
  const status = await getDaemonStatus();
  const wasRunning = status.running;

  // Spawn a detached child process to:
  //   1. Wait for this process to exit
  //   2. Stop the daemon
  //   3. Replace the binary
  //   4. Restart the daemon if it was running
  if (Deno.build.os === "windows") {
    const ps = [
      `Start-Sleep 1`,
      `Stop-Process -Name triggerfish -Force -ErrorAction SilentlyContinue`,
      `Start-Sleep 1`,
      `Copy-Item '${tmpPath}' '${binaryPath}' -Force`,
      `Remove-Item '${tmpPath}' -Force`,
      ...(wasRunning
        ? [`& '${binaryPath}' start`]
        : []),
      `Write-Host 'Update complete.'`,
    ].join("; ");
    const cmd = new Deno.Command("powershell", {
      args: ["-NoProfile", "-Command", ps],
      stdin: "null",
      stdout: "null",
      stderr: "null",
    });
    cmd.spawn().unref();
  } else {
    const stopCmd = wasRunning
      ? detectDaemonManager() === "systemd"
        ? `systemctl --user stop ${SYSTEMD_UNIT};`
        : `launchctl unload '${launchdPlistPath()}';`
      : "";
    const startCmd = wasRunning
      ? detectDaemonManager() === "systemd"
        ? `systemctl --user daemon-reload; systemctl --user start ${SYSTEMD_UNIT};`
        : `launchctl load '${launchdPlistPath()}';`
      : "";
    const sh = [
      `sleep 1`,
      stopCmd,
      `rm -f '${binaryPath}'`,
      `mv '${tmpPath}' '${binaryPath}'`,
      `chmod 755 '${binaryPath}'`,
      startCmd,
    ].filter(Boolean).join(" && ");
    const cmd = new Deno.Command("sh", {
      args: ["-c", sh],
      stdin: "null",
      stdout: "null",
      stderr: "null",
    });
    cmd.spawn().unref();
  }

  console.log(`\n✓ Update to ${latestTag} in progress.`);
  console.log("  Binary will be replaced momentarily after this process exits.");
  Deno.exit(0);
}

/**
 * Find the installed triggerfish binary path.
 */
async function findInstalledBinary(): Promise<string> {
  // Check common locations in order of preference
  const home = Deno.env.get("HOME") ?? "";
  const candidates = [
    "/usr/local/bin/triggerfish",
    `${home}/.local/bin/triggerfish`,
  ];

  for (const path of candidates) {
    try {
      await Deno.stat(path);
      return path;
    } catch {
      continue;
    }
  }

  // Default to ~/.local/bin
  return `${home}/.local/bin/triggerfish`;
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

  return { ok: false, message: `Unsupported daemon manager: ${manager}` };
}
