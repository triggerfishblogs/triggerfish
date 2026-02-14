/**
 * OS-native daemon management for Triggerfish.
 *
 * Detects the host daemon manager and provides install/start/stop/status/logs
 * operations for launchd (macOS), systemd (Linux), and Windows Task Scheduler.
 * @module
 */

import { resolveBaseDir } from "./paths.ts";

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
  return `${resolveBaseDir()}/logs`;
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
 * Generate a Windows Task Scheduler XML definition for the Triggerfish daemon.
 *
 * @deprecated Use {@link generateWindowsTaskCommand} instead. The XML approach
 * fails due to MSXML encoding issues (`schtasks.exe` requires UTF-16LE with BOM,
 * which Deno cannot reliably produce). Kept for documentation only.
 *
 * @param options - Daemon configuration including binary path.
 * @returns Task Scheduler XML string.
 */
export function generateSchtasksXml(options: DaemonOptions): string {
  const logFile = logFilePath();
  return `<?xml version="1.0"?>
<Task version="1.2" xmlns="http://schemas.microsoft.com/windows/2004/02/mit/task">
  <RegistrationInfo>
    <Description>Triggerfish AI Agent</Description>
  </RegistrationInfo>
  <Triggers>
    <LogonTrigger>
      <Enabled>true</Enabled>
    </LogonTrigger>
  </Triggers>
  <Principals>
    <Principal id="Author">
      <LogonType>InteractiveToken</LogonType>
      <RunLevel>LeastPrivilege</RunLevel>
    </Principal>
  </Principals>
  <Settings>
    <MultipleInstancesPolicy>IgnoreNew</MultipleInstancesPolicy>
    <DisallowStartIfOnBatteries>false</DisallowStartIfOnBatteries>
    <StopIfGoingOnBatteries>false</StopIfGoingOnBatteries>
    <ExecutionTimeLimit>PT0S</ExecutionTimeLimit>
    <RestartOnFailure>
      <Interval>PT1M</Interval>
      <Count>3</Count>
    </RestartOnFailure>
  </Settings>
  <Actions Context="Author">
    <Exec>
      <Command>cmd.exe</Command>
      <Arguments>/c "${options.binaryPath}" run &gt;&gt; "${logFile}" 2&gt;&amp;1</Arguments>
    </Exec>
  </Actions>
</Task>
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
 * Generate a PowerShell command that registers a Windows Scheduled Task
 * for the Triggerfish daemon.
 *
 * Uses `Register-ScheduledTask` (available on Windows 8.1+ / PowerShell 5.1+)
 * to avoid the XML encoding issues with `schtasks /create /xml`.
 *
 * The `-Force` flag atomically overwrites any existing task with the same name,
 * so no separate delete step is needed.
 *
 * @param options - Daemon configuration including binary path.
 * @returns PowerShell command string suitable for `powershell -Command`.
 */
export function generateWindowsTaskCommand(options: DaemonOptions): string {
  const logFile = logFilePath();
  const logDirectory = logDir();
  const escapedBinary = psEscape(options.binaryPath);
  const escapedLog = psEscape(logFile);
  const escapedLogDir = psEscape(logDirectory);

  // Double quotes pass through PowerShell single-quoted strings literally,
  // and are what cmd.exe expects for path quoting. The mkdir ensures the log
  // directory exists when the task fires (at logon, the dir may not exist yet).
  return [
    `$action = New-ScheduledTaskAction -Execute 'cmd.exe' -Argument '/c mkdir "${escapedLogDir}" 2>nul & "${escapedBinary}" run >> "${escapedLog}" 2>&1'`,
    `$trigger = New-ScheduledTaskTrigger -AtLogon`,
    `$principal = New-ScheduledTaskPrincipal -UserId ([System.Security.Principal.WindowsIdentity]::GetCurrent().Name) -LogonType Interactive -RunLevel Limited`,
    `$settings = New-ScheduledTaskSettingsSet -MultipleInstances IgnoreNew -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -ExecutionTimeLimit (New-TimeSpan) -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1)`,
    `Register-ScheduledTask -TaskName '${SCHTASKS_TASK_NAME}' -Action $action -Trigger $trigger -Principal $principal -Settings $settings -Description 'Triggerfish AI Agent' -Force`,
  ].join("; ");
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
 * Escape a path for embedding in a C# verbatim string literal (@"...").
 * In C# verbatim strings, the only escape is "" for a literal double-quote.
 * Backslashes are literal. Forward slashes are normalized to backslashes.
 */
function csEscape(path: string): string {
  return path.replaceAll("/", "\\").replaceAll('"', '""');
}

/**
 * Generate C# source code for the Windows Service wrapper.
 *
 * The wrapper implements the SCM (Service Control Manager) protocol so Windows
 * can properly start/stop the daemon. It spawns triggerfish.exe as a child
 * process and redirects stdout/stderr to the log file.
 *
 * Runs as LocalSystem with TRIGGERFISH_DATA_DIR set to the user's data directory
 * so the config file is found correctly.
 *
 * @param binaryPath - Absolute path to triggerfish.exe
 * @param dataDir - Absolute path to the .triggerfish data directory
 * @param logDirectory - Absolute path to the logs directory
 * @returns C# source code string
 */
export function generateServiceSource(
  binaryPath: string,
  dataDir: string,
  logDirectory: string,
): string {
  const csBin = csEscape(binaryPath);
  const csData = csEscape(dataDir);
  const csLogDir = csEscape(logDirectory);

  return `using System;
using System.Diagnostics;
using System.IO;
using System.ServiceProcess;
public class TriggerFishService : ServiceBase
{
    private Process _proc;
    public TriggerFishService() { ServiceName = "${WINDOWS_SERVICE_NAME}"; CanStop = true; CanShutdown = true; }
    protected override void OnStart(string[] args)
    {
        var logDir = @"${csLogDir}";
        var logFile = Path.Combine(logDir, "triggerfish.log");
        Directory.CreateDirectory(logDir);
        _proc = new Process();
        _proc.StartInfo.FileName = @"${csBin}";
        _proc.StartInfo.Arguments = "run";
        _proc.StartInfo.UseShellExecute = false;
        _proc.StartInfo.RedirectStandardOutput = true;
        _proc.StartInfo.RedirectStandardError = true;
        _proc.StartInfo.CreateNoWindow = true;
        _proc.StartInfo.EnvironmentVariables["TRIGGERFISH_DATA_DIR"] = @"${csData}";
        var w = new StreamWriter(logFile, true) { AutoFlush = true };
        _proc.OutputDataReceived += (s, e) => { if (e.Data != null) try { w.WriteLine(e.Data); } catch {} };
        _proc.ErrorDataReceived += (s, e) => { if (e.Data != null) try { w.WriteLine(e.Data); } catch {} };
        _proc.Start();
        _proc.BeginOutputReadLine();
        _proc.BeginErrorReadLine();
    }
    protected override void OnStop() { Kill(); }
    protected override void OnShutdown() { Kill(); }
    void Kill() { try { if (_proc != null && !_proc.HasExited) { _proc.Kill(); _proc.WaitForExit(5000); } } catch {} }
    public static void Main() { ServiceBase.Run(new TriggerFishService()); }
}`;
}

/**
 * Generate a PowerShell script that compiles the C# service wrapper,
 * installs it as a Windows Service, and starts it.
 *
 * The script is designed to run elevated (as Administrator) via UAC.
 *
 * @param binaryPath - Absolute path to triggerfish.exe
 * @returns PowerShell script string
 */
export function generateServiceInstallScript(binaryPath: string): string {
  const dataDir = resolveBaseDir();
  const logDirectory = logDir();
  const csSource = generateServiceSource(binaryPath, dataDir, logDirectory);

  // Service wrapper .exe goes next to the triggerfish binary
  const binDir = binaryPath.replace(/[/\\][^/\\]+$/, "");
  const serviceExePath = `${binDir}\\TriggerFishService.exe`.replaceAll("/", "\\");
  const psServiceExe = psEscape(serviceExePath);

  return `$ErrorActionPreference = 'Stop'
$svc = Get-Service -Name '${WINDOWS_SERVICE_NAME}' -ErrorAction SilentlyContinue
if ($svc) {
    Stop-Service -Name '${WINDOWS_SERVICE_NAME}' -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
    sc.exe delete '${WINDOWS_SERVICE_NAME}' | Out-Null
    Start-Sleep -Seconds 1
}
schtasks /delete /tn '${SCHTASKS_TASK_NAME}' /f 2>$null | Out-Null
$csSource = @'
${csSource}
'@
$tempCs = Join-Path $env:TEMP 'TriggerFishService.cs'
Set-Content -Path $tempCs -Value $csSource -Encoding UTF8
$csc = Join-Path $env:windir 'Microsoft.NET\\Framework64\\v4.0.30319\\csc.exe'
if (-not (Test-Path $csc)) { $csc = Join-Path $env:windir 'Microsoft.NET\\Framework\\v4.0.30319\\csc.exe' }
if (-not (Test-Path $csc)) { throw 'C# compiler (csc.exe) not found. .NET Framework 4.x is required.' }
& $csc /nologo /target:exe /reference:System.ServiceProcess.dll /out:'${psServiceExe}' $tempCs 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) { throw 'Failed to compile service wrapper' }
Remove-Item $tempCs -Force -ErrorAction SilentlyContinue
New-Service -Name '${WINDOWS_SERVICE_NAME}' -BinaryPathName '${psServiceExe}' -DisplayName 'Triggerfish AI Agent' -Description 'Triggerfish AI Agent daemon' -StartupType Automatic
Start-Service -Name '${WINDOWS_SERVICE_NAME}'`;
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

  if (manager === "windows-service") {
    const installScript = generateServiceInstallScript(binaryPath);
    const encoded = encodeUtf16Base64(installScript);

    // Service installation requires admin — elevate via UAC prompt
    console.log("  Requesting administrator privileges...");
    await runCommand("powershell", [
      "-NoProfile", "-Command",
      `Start-Process powershell -Verb RunAs -Wait -ArgumentList '-NoProfile -NonInteractive -EncodedCommand ${encoded}'`,
    ]);

    // Verify the service was created and started (user may have declined UAC)
    const verifyResult = await runCommand("sc", ["query", WINDOWS_SERVICE_NAME]);

    if (!verifyResult.success) {
      return { ok: false, message: "Failed to install service. Administrator privileges are required." };
    }

    const isRunning = verifyResult.stdout.includes("RUNNING");
    return isRunning
      ? { ok: true, message: `Daemon installed and started (Windows Service: ${WINDOWS_SERVICE_NAME})` }
      : { ok: false, message: "Service installed but failed to start. Check 'triggerfish logs' for details." };
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
    // Stopping a service requires admin — elevate via UAC
    const stopScript = `Stop-Service -Name '${WINDOWS_SERVICE_NAME}' -Force -ErrorAction Stop`;
    const encoded = encodeUtf16Base64(stopScript);
    await runCommand("powershell", [
      "-NoProfile", "-Command",
      `Start-Process powershell -Verb RunAs -Wait -ArgumentList '-NoProfile -NonInteractive -EncodedCommand ${encoded}'`,
    ]);

    // Verify it stopped
    const verifyResult = await runCommand("sc", ["query", WINDOWS_SERVICE_NAME]);
    const stopped = verifyResult.stdout.includes("STOPPED") || !verifyResult.success;
    return stopped
      ? { ok: true, message: "Daemon stopped" }
      : { ok: false, message: "Failed to stop daemon" };
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
  const tmpPath = `${resolveBaseDir()}/.update-tmp`;
  console.log("Downloading...");
  try {
    const resp = await fetch(downloadUrl);
    if (!resp.ok || !resp.body) {
      return { ok: false, message: `Download failed: HTTP ${resp.status}` };
    }
    const file = await Deno.open(tmpPath, { write: true, create: true, truncate: true });
    await resp.body.pipeTo(file.writable);
    if (Deno.build.os !== "windows") {
      await Deno.chmod(tmpPath, 0o755);
    }
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
      `Stop-Service -Name '${WINDOWS_SERVICE_NAME}' -Force -ErrorAction SilentlyContinue`,
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
    // Uninstalling a service requires admin — elevate via UAC
    const uninstallScript = [
      `Stop-Service -Name '${WINDOWS_SERVICE_NAME}' -Force -ErrorAction SilentlyContinue`,
      `Start-Sleep -Seconds 2`,
      `sc.exe delete '${WINDOWS_SERVICE_NAME}' | Out-Null`,
      `schtasks /delete /tn '${SCHTASKS_TASK_NAME}' /f 2>$null | Out-Null`,
    ].join("; ");
    const encoded = encodeUtf16Base64(uninstallScript);
    await runCommand("powershell", [
      "-NoProfile", "-Command",
      `Start-Process powershell -Verb RunAs -Wait -ArgumentList '-NoProfile -NonInteractive -EncodedCommand ${encoded}'`,
    ]);

    // Verify removal
    const verifyResult = await runCommand("sc", ["query", WINDOWS_SERVICE_NAME]);
    const removed = !verifyResult.success || verifyResult.stderr.includes("1060");
    return removed
      ? { ok: true, message: "Daemon uninstalled" }
      : { ok: false, message: "Failed to uninstall daemon. Administrator privileges are required." };
  }

  return { ok: false, message: `Unsupported daemon manager: ${manager}` };
}
