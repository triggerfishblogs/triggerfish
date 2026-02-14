/**
 * OS-native daemon management for Triggerfish.
 *
 * Detects the host daemon manager and provides install/start/stop/status/logs
 * operations for launchd (macOS), systemd (Linux), and Windows Task Scheduler.
 * @module
 */

import { join, dirname } from "@std/path";
import { resolveBaseDir } from "./paths.ts";
import { VERSION } from "./version.ts";

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
const WINDOWS_SERVICE_NAME = "Triggerfish";
/** @deprecated Legacy scheduled task name — kept for cleanup during upgrade. */
const SCHTASKS_TASK_NAME = "Triggerfish";

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
  return join(resolveBaseDir(), "logs");
}

/**
 * Get the stdout log file path.
 */
export function logFilePath(): string {
  return join(logDir(), "triggerfish.log");
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
 * Escape a string for use inside a PowerShell single-quoted string.
 *
 * PowerShell single-quoted strings only interpret `''` as a literal `'`.
 *
 * @param s - Raw string to escape.
 * @returns Escaped string safe for embedding in `'...'`.
 */
function psEscape(s: string): string {
  return s.replaceAll("'", "''");
}

/**
 * Encode a PowerShell command as UTF-16LE Base64 for use with -EncodedCommand.
 * This avoids all quoting/escaping issues when passing commands through
 * Start-Process -Verb RunAs.
 */
function encodeUtf16Base64(command: string): string {
  const bytes = new Uint8Array(command.length * 2);
  for (let i = 0; i < command.length; i++) {
    const code = command.charCodeAt(i);
    bytes[i * 2] = code & 0xFF;
    bytes[i * 2 + 1] = (code >> 8) & 0xFF;
  }
  // Process in chunks to avoid call stack overflow on large commands
  let binary = "";
  const CHUNK = 8192;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary);
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
 * Run an encoded PowerShell command with automatic elevation detection.
 *
 * If already running as admin, runs directly. Otherwise uses
 * Start-Process -Verb RunAs for UAC elevation.
 */
async function runElevatedCommand(encoded: string): Promise<void> {
  const isElevated = await runCommand("powershell", [
    "-NoProfile", "-Command",
    "([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)",
  ]);

  if (isElevated.stdout === "True") {
    await runCommand("powershell", [
      "-NoProfile", "-NonInteractive", "-EncodedCommand", encoded,
    ]);
  } else {
    await runCommand("powershell", [
      "-NoProfile", "-Command",
      `Start-Process powershell -Verb RunAs -Wait -ArgumentList '-NoProfile -NonInteractive -EncodedCommand ${encoded}'`,
    ]);
  }
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

    // Start the service (needs elevation)
    const startScript = `Start-Service -Name '${WINDOWS_SERVICE_NAME}' -ErrorAction Stop`;
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
    const stopScript = `Stop-Service -Name '${WINDOWS_SERVICE_NAME}' -Force -ErrorAction Stop`;
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

  if (Deno.build.os === "windows") {
    // PowerShell Get-Content is the Windows equivalent of tail
    const psArgs = follow
      ? `Get-Content -Path '${path}' -Tail ${lines} -Wait -Encoding UTF8`
      : `Get-Content -Path '${path}' -Tail ${lines} -Encoding UTF8`;
    const cmd = new Deno.Command("powershell", {
      args: ["-NoProfile", "-Command", psArgs],
      stdout: "inherit",
      stderr: "inherit",
    });
    const child = cmd.spawn();
    await child.status;
  } else if (follow) {
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
 * Compute SHA256 hex digest of a file.
 *
 * @param path - Absolute path to the file.
 * @returns Lowercase hex string of the SHA-256 hash.
 */
async function sha256File(path: string): Promise<string> {
  const file = await Deno.open(path, { read: true });
  try {
    const buf = await new Response(file.readable).arrayBuffer();
    const hash = await crypto.subtle.digest("SHA-256", buf);
    return [...new Uint8Array(hash)]
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  } catch (e) {
    // readable stream consumed — file auto-closed
    throw e;
  }
}

/**
 * Check whether we can write to a directory.
 *
 * @param dir - Directory path to check.
 * @returns true if the current process can create files in the directory.
 */
async function canWriteToDir(dir: string): Promise<boolean> {
  const probe = join(dir, `.triggerfish-write-test-${Date.now()}`);
  try {
    await Deno.writeTextFile(probe, "");
    await Deno.remove(probe);
    return true;
  } catch {
    return false;
  }
}

/**
 * Replace the binary file, handling cross-device moves and permission issues.
 *
 * On Unix: attempts atomic rename, falls back to copy+remove for cross-device.
 * If the target directory isn't writable, attempts via sudo.
 *
 * On Windows: renames current binary to .old, then moves new binary into place.
 *
 * @param tmpPath - Path to the downloaded replacement binary.
 * @param binaryPath - Path where the installed binary lives.
 */
async function replaceBinary(tmpPath: string, binaryPath: string): Promise<void> {
  const targetDir = dirname(binaryPath);

  if (Deno.build.os === "windows") {
    // Windows: rename current → .old, then move new → current
    const oldPath = `${binaryPath}.old`;
    try { await Deno.remove(oldPath); } catch { /* no old file */ }
    try {
      await Deno.rename(binaryPath, oldPath);
    } catch {
      // Binary may not exist yet (fresh install path)
    }
    await Deno.rename(tmpPath, binaryPath);
    return;
  }

  // Unix path
  const writable = await canWriteToDir(targetDir);

  if (writable) {
    // Try atomic rename (works when same filesystem)
    try {
      await Deno.rename(tmpPath, binaryPath);
    } catch {
      // Cross-device: copy + remove + chmod
      await Deno.copyFile(tmpPath, binaryPath);
      await Deno.remove(tmpPath);
    }
    await Deno.chmod(binaryPath, 0o755);
    // macOS: clear quarantine/provenance xattrs so Gatekeeper doesn't kill it
    if (Deno.build.os === "darwin") {
      await runCommand("xattr", ["-cr", binaryPath]);
    }
  } else {
    // Need elevated permissions
    console.log(`  Binary directory (${targetDir}) requires elevated permissions.`);
    console.log("  You may be prompted for your password.\n");
    const mv = new Deno.Command("sudo", {
      args: ["mv", tmpPath, binaryPath],
      stdin: "inherit",
      stdout: "inherit",
      stderr: "inherit",
    });
    const mvResult = await mv.output();
    if (!mvResult.success) {
      throw new Error("Failed to move binary with sudo. Check permissions and try again.");
    }
    const chmod = new Deno.Command("sudo", {
      args: ["chmod", "755", binaryPath],
      stdin: "inherit",
      stdout: "inherit",
      stderr: "inherit",
    });
    await chmod.output();
    // macOS: clear quarantine/provenance xattrs so Gatekeeper doesn't kill it
    if (Deno.build.os === "darwin") {
      await runCommand("sudo", ["xattr", "-cr", binaryPath]);
    }
  }
}

/**
 * Update Triggerfish to the latest tagged release.
 *
 * Downloads the platform binary from the latest GitHub release, verifies
 * its SHA256 checksum, stops the running daemon, replaces the binary
 * in-process (no detached child), and restarts the daemon if it was running.
 *
 * @returns Result indicating success or failure with version information.
 */
export async function updateTriggerfish(): Promise<UpdateResult> {
  const currentVersion = VERSION;

  // 1. Fetch latest release metadata
  console.log("Checking for updates...");
  let latestTag: string;
  let downloadUrl: string;
  let checksumsUrl: string | undefined;
  try {
    const resp = await fetch(`${GITHUB_API}/releases/latest`, {
      headers: { "User-Agent": "triggerfish-updater" },
    });
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

    const checksumsAsset = release.assets.find((a) => a.name === "SHA256SUMS.txt");
    if (checksumsAsset) {
      checksumsUrl = checksumsAsset.browser_download_url;
    }
  } catch (e) {
    return { ok: false, message: `Failed to check for updates: ${e}` };
  }

  // 2. Compare versions — skip if already on latest (unless dev build)
  if (currentVersion !== "dev" && currentVersion === latestTag) {
    return {
      ok: true,
      message: `Already up to date (${currentVersion})`,
      previousVersion: currentVersion,
      newVersion: latestTag,
    };
  }

  console.log(`  Current: ${currentVersion}`);
  console.log(`  Latest:  ${latestTag}`);

  // 3. Download new binary to temp file
  const tmpPath = join(resolveBaseDir(), ".update-tmp");
  try {
    const resp = await fetch(downloadUrl);
    if (!resp.ok || !resp.body) {
      return { ok: false, message: `Download failed: HTTP ${resp.status}` };
    }
    const totalBytes = Number(resp.headers.get("content-length") ?? 0);
    const file = await Deno.open(tmpPath, { write: true, create: true, truncate: true });
    const enc = new TextEncoder();
    let downloaded = 0;
    const reader = resp.body.getReader();
    const writer = file.writable.getWriter();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      await writer.write(value);
      downloaded += value.byteLength;
      if (totalBytes > 0) {
        const pct = Math.round((downloaded / totalBytes) * 100);
        const mb = (downloaded / 1_048_576).toFixed(1);
        const totalMb = (totalBytes / 1_048_576).toFixed(1);
        Deno.stderr.writeSync(enc.encode(`\r  Downloading... ${mb}/${totalMb} MB (${pct}%)`));
      } else {
        const mb = (downloaded / 1_048_576).toFixed(1);
        Deno.stderr.writeSync(enc.encode(`\r  Downloading... ${mb} MB`));
      }
    }
    await writer.close();
    Deno.stderr.writeSync(enc.encode("\n"));
    if (Deno.build.os !== "windows") {
      await Deno.chmod(tmpPath, 0o755);
    }
  } catch (e) {
    try { await Deno.remove(tmpPath); } catch { /* */ }
    return { ok: false, message: `Download failed: ${e}` };
  }

  // 4. Verify SHA256 checksum
  if (checksumsUrl) {
    console.log("  Verifying checksum...");
    try {
      const resp = await fetch(checksumsUrl);
      if (resp.ok) {
        const checksumsText = await resp.text();
        const assetName = resolveAssetName();
        const actualHash = await sha256File(tmpPath);

        // SHA256SUMS.txt format: "<hash>  <filename>" (two spaces)
        const expectedLine = checksumsText
          .split("\n")
          .find((line) => line.includes(assetName));

        if (expectedLine) {
          const expectedHash = expectedLine.split(/\s+/)[0].toLowerCase();
          if (actualHash !== expectedHash) {
            try { await Deno.remove(tmpPath); } catch { /* */ }
            return {
              ok: false,
              message: `Checksum verification failed.\n  Expected: ${expectedHash}\n  Got:      ${actualHash}`,
            };
          }
          console.log("  Checksum verified.");
        } else {
          console.log("  Warning: asset not found in SHA256SUMS.txt, skipping verification.");
        }
      } else {
        console.log("  Warning: could not download checksums, skipping verification.");
      }
    } catch {
      console.log("  Warning: checksum verification failed, skipping.");
    }
  } else {
    console.log("  Warning: no SHA256SUMS.txt in release, skipping checksum verification.");
  }

  // 5. Find where the current binary is installed
  const binaryPath = await findInstalledBinary();

  // 6. Stop daemon if running
  const status = await getDaemonStatus();
  const wasRunning = status.running;
  if (wasRunning) {
    console.log("  Stopping daemon...");
    await stopDaemon();
  }

  // 7. Replace binary
  console.log("  Replacing binary...");
  try {
    await replaceBinary(tmpPath, binaryPath);
  } catch (e) {
    // Attempt to restart daemon even if replacement failed
    if (wasRunning) {
      console.log("  Restarting daemon with old binary...");
      await installAndStartDaemon(binaryPath);
    }
    try { await Deno.remove(tmpPath); } catch { /* */ }
    return { ok: false, message: `Failed to replace binary: ${e}` };
  }

  // 8. Restart daemon if it was running
  if (wasRunning) {
    console.log("  Restarting daemon...");
    await installAndStartDaemon(binaryPath);
  }

  // 9. Return result
  return {
    ok: true,
    message: `Updated from ${currentVersion} to ${latestTag}`,
    previousVersion: currentVersion,
    newVersion: latestTag,
  };
}

/**
 * Find the installed triggerfish binary path.
 */
async function findInstalledBinary(): Promise<string> {
  // First, try to resolve from the currently running executable.
  // This handles custom install directories on any platform.
  try {
    const execPath = Deno.execPath();
    if (execPath && execPath.toLowerCase().includes("triggerfish")) {
      await Deno.stat(execPath);
      return execPath;
    }
  } catch {
    // Fall through to candidate search
  }

  // Check common locations in order of preference
  const candidates: string[] = [];

  if (Deno.build.os === "windows") {
    const localAppData = Deno.env.get("LOCALAPPDATA") ?? "";
    candidates.push(`${localAppData}\\Triggerfish\\triggerfish.exe`);
  } else {
    const home = Deno.env.get("HOME") ?? "";
    candidates.push("/usr/local/bin/triggerfish");
    candidates.push(`${home}/.local/bin/triggerfish`);
  }

  for (const path of candidates) {
    try {
      await Deno.stat(path);
      return path;
    } catch {
      continue;
    }
  }

  // Return platform-appropriate default
  if (Deno.build.os === "windows") {
    const localAppData = Deno.env.get("LOCALAPPDATA") ?? "";
    return `${localAppData}\\Triggerfish\\triggerfish.exe`;
  }
  const home = Deno.env.get("HOME") ?? "";
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
