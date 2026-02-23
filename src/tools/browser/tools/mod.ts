/**
 * Browser interaction tools — navigate, snapshot, click, type, select,
 * scroll, wait, and close operations with SSRF prevention.
 *
 * @module
 */

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
} from "./tools.ts";

export {
  enforceBrowserNavigationPolicy,
  executeBrowserNavigation,
  parseNavigationUrl,
} from "./tools_navigation.ts";

export {
  captureBrowserSnapshot,
  computeScrollDeltas,
  DEFAULT_SCROLL_PX,
  encodeBufferToBase64,
  scrollBrowserPage,
} from "./tools_page.ts";
