/**
 * Browser automation module for Chromium CDP control.
 *
 * Provides domain classification policy, multi-agent browser lifecycle
 * management with watermarking, and page interaction tools with SSRF
 * prevention and security enforcement.
 *
 * @module
 */

export {
  createDomainPolicy,
  type DomainPolicy,
  type DomainPolicyConfig,
} from "./domains.ts";

export {
  createBrowserManager,
  type BrowserInstance,
  type BrowserManager,
  type BrowserManagerConfig,
} from "./manager.ts";

export {
  BROWSER_TOOLS_SYSTEM_PROMPT,
  createBrowserToolExecutor,
  createBrowserTools,
  type BrowserTools,
  type BrowserToolsConfig,
  type DnsChecker,
  getBrowserToolDefinitions,
  type NavigateResult,
  type ScrollDirection,
  type SnapshotResult,
} from "./tools.ts";

export {
  canAccessProfile,
  escalateWatermark,
  getWatermark,
  type ProfileWatermark,
  watermarkKey,
} from "./watermark.ts";
