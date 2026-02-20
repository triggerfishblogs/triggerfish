/**
 * Signal channel guided setup — re-export barrel.
 *
 * Sub-modules:
 * - setup_resolver.ts: Binary and Java resolution
 * - setup_installer.ts: Download and install signal-cli + JRE
 * - setup_link.ts: Device linking and QR code rendering
 * - setup_daemon.ts: Daemon TCP/Unix lifecycle management
 *
 * @module
 */

// ─── Resolver: binary + Java resolution ─────────────────────────
export {
  checkJava,
  checkSignalCli,
  type GitHubRelease,
  javaHomeBin,
  resolveJavaHome,
  resolveSignalCliBinDir,
  SIGNAL_CLI_KNOWN_GOOD_VERSION,
  type SignalSetupResult,
  tryJava,
  trySignalCli,
  warnIfOldVersion,
} from "./setup_resolver.ts";

// ─── Installer: download + install ──────────────────────────────
export {
  downloadJre,
  downloadSignalCli,
  fetchLatestVersion,
  type SignalCliInstall,
} from "./setup_installer.ts";

// ─── Link: device linking + QR ──────────────────────────────────
export {
  renderQrCode,
  startLinkProcess,
} from "./setup_link.ts";

// ─── Daemon: TCP + Unix socket lifecycle ────────────────────────
export {
  type DaemonHandle,
  isDaemonHealthy,
  isDaemonRunning,
  isDaemonRunningUnix,
  startDaemon,
  startDaemonUnix,
  waitForDaemon,
  waitForDaemonUnix,
} from "./setup_daemon.ts";
