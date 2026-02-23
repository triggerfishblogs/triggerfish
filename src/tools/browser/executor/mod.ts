/**
 * Browser tool executor — tool definitions, dispatch routing,
 * auto-launch lifecycle, and profile watermarking.
 *
 * @module
 */

export {
  BROWSER_TOOLS_SYSTEM_PROMPT,
  getBrowserToolDefinitions,
} from "./tools_defs.ts";

export {
  createBrowserToolExecutor,
  type BrowserToolExecutorFn,
  type BrowserToolExecutorOptions,
} from "./tools_executor_dispatch.ts";

export {
  createAutoLaunchBrowserExecutor,
  type AutoLaunchBrowserConfig,
  type BrowserExecutorHandle,
} from "./tools_executor_autolaunch.ts";

export {
  canAccessProfile,
  escalateWatermark,
  getWatermark,
  type ProfileWatermark,
  watermarkKey,
} from "./watermark.ts";
