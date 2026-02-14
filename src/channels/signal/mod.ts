/**
 * Signal channel adapter module.
 *
 * Exports the Signal adapter factory, client factory, and types
 * for integration with the Triggerfish channel system.
 *
 * @module
 */

export type {
  SignalConfig,
  SignalGroupConfig,
  SignalNotification,
  SignalClientInterface,
  SignalGroupEntry,
  SignalContactEntry,
} from "./types.ts";
export { createSignalClient } from "./client.ts";
export type { SignalChannelAdapter } from "./adapter.ts";
export { createSignalChannel } from "./adapter.ts";
export type { SignalCliInstall } from "./setup.ts";
export {
  checkSignalCli,
  fetchLatestVersion,
  downloadSignalCli,
  downloadJre,
  checkJava,
  resolveSignalCliBinDir,
  resolveJavaHome,
  startLinkProcess,
  renderQrCode,
  isDaemonRunning,
  startDaemon,
  waitForDaemon,
} from "./setup.ts";
