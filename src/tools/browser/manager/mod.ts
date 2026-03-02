/**
 * Browser lifecycle management — Chrome detection, launch strategies,
 * and multi-agent profile isolation.
 *
 * @module
 */

export {
  applyStealthPatches,
  baseChromeArgs,
  type BrowserInstance,
  type BrowserManager,
  type BrowserManagerConfig,
  createBrowserManager,
  detectChrome,
  findFreePort,
  pollCdpReady,
  withTimeout,
} from "./manager.ts";

export type {
  CdpVersionResponse,
  ChromeDetection,
} from "./manager_detection.ts";

export {
  CDP_POLL_INTERVAL_MS,
  DEFAULT_LAUNCH_TIMEOUT_MS,
  DEFAULT_VIEWPORT,
  findFlatpakBin,
} from "./manager_detection.ts";

export { launchDirect, launchFlatpak } from "./manager_launch.ts";
