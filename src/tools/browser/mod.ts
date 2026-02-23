/**
 * Browser automation module for Chromium CDP control.
 *
 * Provides domain classification policy, multi-agent browser lifecycle
 * management with watermarking, and page interaction tools with SSRF
 * prevention and security enforcement.
 *
 * Sub-modules:
 * - manager/  — Chrome detection, launch strategies, profile isolation
 * - tools/    — Navigation, snapshot, click, type, select, scroll, wait
 * - executor/ — Tool definitions, dispatch, auto-launch, watermarking
 *
 * @module
 */

export {
  createDomainPolicy,
  type DomainPolicy,
  type DomainPolicyConfig,
} from "./domains.ts";

export {
  applyStealthPatches,
  baseChromeArgs,
  createBrowserManager,
  type BrowserInstance,
  type BrowserManager,
  type BrowserManagerConfig,
} from "./manager/mod.ts";

export {
  BROWSER_TOOLS_SYSTEM_PROMPT,
  createAutoLaunchBrowserExecutor,
  createBrowserToolExecutor,
  createBrowserTools,
  type AutoLaunchBrowserConfig,
  type BrowserExecutorHandle,
  type BrowserToolExecutorOptions,
  type BrowserTools,
  type BrowserToolsConfig,
  type DnsChecker,
  getBrowserToolDefinitions,
  type NavigateResult,
  type ScrollDirection,
  type SnapshotResult,
} from "./tools/mod.ts";

export {
  canAccessProfile,
  escalateWatermark,
  getWatermark,
  type ProfileWatermark,
  watermarkKey,
} from "./executor/mod.ts";
