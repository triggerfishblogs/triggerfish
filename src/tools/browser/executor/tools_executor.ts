/**
 * Browser tool executor barrel — re-exports dispatch and auto-launch.
 *
 * Maintains backward compatibility for all existing imports from
 * `tools_executor.ts`. The actual implementation is split across
 * `tools_executor_dispatch.ts` (basic executor) and
 * `tools_executor_autolaunch.ts` (lazy Chrome lifecycle).
 *
 * @module
 */

export {
  type BrowserToolExecutorFn,
  type BrowserToolExecutorOptions,
  createBrowserToolExecutor,
} from "./tools_executor_dispatch.ts";

export {
  type AutoLaunchBrowserConfig,
  type BrowserExecutorHandle,
  createAutoLaunchBrowserExecutor,
} from "./tools_executor_autolaunch.ts";
