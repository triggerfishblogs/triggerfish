/**
 * OS-native daemon management for Triggerfish.
 *
 * Detects the host daemon manager and generates service definitions
 * for launchd (macOS), systemd (Linux), and Windows Task Scheduler.
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
 * Generate a macOS launchd plist for the Triggerfish daemon.
 *
 * @param options - Daemon configuration including binary path.
 * @returns XML plist string for ~/Library/LaunchAgents/.
 */
export function generateLaunchdPlist(options: DaemonOptions): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>dev.triggerfish.agent</string>
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
  <string>/tmp/triggerfish.stdout.log</string>
  <key>StandardErrorPath</key>
  <string>/tmp/triggerfish.stderr.log</string>
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
