/**
 * Signal channel adapter module.
 *
 * Exports the Signal adapter factory, client factory, and types
 * for integration with the Triggerfish channel system.
 *
 * @module
 */

export type {
  SignalClientInterface,
  SignalConfig,
  SignalContactEntry,
  SignalGroupConfig,
  SignalGroupEntry,
  SignalNotification,
} from "./types.ts";
export { createSignalClient } from "./protocol/client.ts";
export type { SignalChannelAdapter } from "./adapter.ts";
export { createSignalChannel } from "./adapter.ts";
export type { DaemonHandle, SignalCliInstall } from "./setup/setup.ts";
export {
  checkJava,
  checkSignalCli,
  downloadJre,
  downloadSignalCli,
  fetchKnownGoodRelease,
  isDaemonRunning,
  renderQrCode,
  resolveJavaHome,
  resolveSignalCliBinDir,
  startDaemon,
  startLinkProcess,
  waitForDaemon,
} from "./setup/setup.ts";
