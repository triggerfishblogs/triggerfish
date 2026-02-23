/**
 * Auto-launching browser tool executor.
 *
 * Wraps the basic browser tool executor with lazy Chrome lifecycle
 * management. The browser is launched on the first browser_* tool call
 * and reused for subsequent calls. browser_close is intercepted to
 * avoid unnecessary launches.
 *
 * @module
 */

import type { ClassificationLevel } from "../../../core/types/classification.ts";
import type { LlmProvider } from "../../../core/types/llm.ts";
import type { BrowserManager } from "../manager/manager.ts";
import type { BrowserTools } from "../tools/tools.ts";
import { createBrowserTools } from "../tools/tools.ts";
import {
  createBrowserToolExecutor,
  type BrowserToolExecutorFn,
} from "./tools_executor_dispatch.ts";

// ─── Types ──────────────────────────────────────────────────────────────────

/** Configuration for the auto-launching browser tool executor. */
export interface AutoLaunchBrowserConfig {
  /** The browser manager that handles Chrome lifecycle. */
  readonly manager: BrowserManager;
  /** Agent ID for browser profile isolation. */
  readonly agentId: string;
  /** Read current session taint for watermark checks. */
  readonly getSessionTaint: () => ClassificationLevel;
  /** Vision-capable LLM provider for describing screenshots. */
  readonly visionProvider?: LlmProvider;
  /** Primary LLM provider — used for screenshots when no dedicated vision provider is set. */
  readonly primaryProvider?: LlmProvider;
}

/** Handle returned by createAutoLaunchBrowserExecutor for lifecycle management. */
export interface BrowserExecutorHandle {
  /** The tool executor function — route browser_* tool calls through this. */
  readonly executor: BrowserToolExecutorFn;
  /** Close the browser and reset state. Call on session reset. */
  readonly close: () => Promise<void>;
}

// ─── Mutable State ──────────────────────────────────────────────────────────

/** Internal mutable state for the auto-launch executor. */
interface AutoLaunchState {
  tools: BrowserTools | undefined;
  inner: BrowserToolExecutorFn | undefined;
}

// ─── Launch & Close ─────────────────────────────────────────────────────────

/** Launch Chrome via BrowserManager and wire up the inner executor. */
async function launchBrowserForAgent(
  config: AutoLaunchBrowserConfig,
  state: AutoLaunchState,
): Promise<string | null> {
  if (state.tools) return null;

  const result = await config.manager.launch(
    config.agentId,
    config.getSessionTaint(),
  );
  if (!result.ok) {
    return `Browser launch failed: ${result.error}`;
  }

  state.tools = createBrowserTools({
    page: result.value.page,
    domainPolicy: config.manager.domainPolicy,
  });
  state.inner = createBrowserToolExecutor({
    tools: state.tools,
    visionProvider: config.visionProvider,
    primaryProvider: config.primaryProvider,
  });
  return null;
}

/** Close the browser via BrowserManager and reset state. */
async function closeBrowserForAgent(
  config: AutoLaunchBrowserConfig,
  state: AutoLaunchState,
): Promise<void> {
  if (state.tools || config.manager.isRunning(config.agentId)) {
    await config.manager.close(config.agentId);
  }
  state.tools = undefined;
  state.inner = undefined;
}

/** Handle browser_close without auto-launching the browser. */
async function dispatchAutoLaunchClose(
  config: AutoLaunchBrowserConfig,
  state: AutoLaunchState,
): Promise<string> {
  if (state.tools || config.manager.isRunning(config.agentId)) {
    await closeBrowserForAgent(config, state);
    return "Browser closed.";
  }
  return "Browser is not running.";
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Create a browser tool executor that auto-launches Chrome on first use.
 *
 * This is the primary entry point for wiring browser tools into any
 * orchestrator or channel. The browser is launched lazily on the first
 * `browser_*` tool call, using the BrowserManager for detection and
 * lifecycle. Subsequent calls reuse the existing connection.
 *
 * @param config - Manager, agent ID, and taint accessor
 * @returns Handle with the executor function and a close() for cleanup
 */
export function createAutoLaunchBrowserExecutor(
  config: AutoLaunchBrowserConfig,
): BrowserExecutorHandle {
  const state: AutoLaunchState = { tools: undefined, inner: undefined };

  const executor: BrowserToolExecutorFn = async (
    name: string,
    input: Record<string, unknown>,
  ): Promise<string | null> => {
    if (!name.startsWith("browser_")) return null;

    if (name === "browser_close") {
      return dispatchAutoLaunchClose(config, state);
    }

    const launchError = await launchBrowserForAgent(config, state);
    if (launchError) return launchError;

    return state.inner!(name, input);
  };

  const close = (): Promise<void> => closeBrowserForAgent(config, state);

  return { executor, close };
}
