/**
 * Browser tool executor and auto-launch wiring.
 *
 * Creates chain-compatible executors for `browser_*` tools. Includes
 * the basic executor (backed by a BrowserTools instance) and the
 * auto-launching variant that lazily starts Chrome on first use.
 *
 * @module
 */

import type { ClassificationLevel } from "../../core/types/classification.ts";
import type { LlmProvider } from "../../agent/llm.ts";
import type { BrowserManager } from "./manager.ts";
import type { BrowserTools, ScrollDirection } from "./tools.ts";
import { createBrowserTools } from "./tools.ts";
import { createLogger } from "../../core/logger/mod.ts";

const log = createLogger("browser-tools");

// ─── Basic Executor ─────────────────────────────────────────────────────────

/** Options for the browser tool executor. */
export interface BrowserToolExecutorOptions {
  /** BrowserTools instance, or undefined if browser is not connected. */
  readonly tools: BrowserTools | undefined;
  /** Vision-capable LLM provider for describing screenshots. */
  readonly visionProvider?: LlmProvider;
  /** Primary LLM provider — fallback for screenshot description when no vision provider. */
  readonly primaryProvider?: LlmProvider;
}

/**
 * Create a tool executor for browser tools.
 *
 * Returns null for unknown tool names (allowing chaining with other executors).
 * Returns an error string if tools are not available (browser not connected).
 *
 * browser_snapshot returns extracted text instantly. browser_describe sends
 * the last screenshot to the vision (or primary) LLM for a visual description.
 *
 * @param optsOrTools - Options object, or BrowserTools for backwards compatibility
 * @returns An executor function: (name, input) => Promise<string | null>
 */
export function createBrowserToolExecutor(
  optsOrTools: BrowserToolExecutorOptions | BrowserTools | undefined,
): (name: string, input: Record<string, unknown>) => Promise<string | null> {
  // Backwards compatibility: bare BrowserTools or undefined
  const opts: BrowserToolExecutorOptions =
    optsOrTools === undefined || optsOrTools === null
      ? { tools: undefined }
      : "navigate" in optsOrTools
        ? { tools: optsOrTools as BrowserTools }
        : optsOrTools as BrowserToolExecutorOptions;

  const tools = opts.tools;

  // Last screenshot stored for browser_describe
  let lastScreenshot: string | undefined;

  return async (
    name: string,
    input: Record<string, unknown>,
  ): Promise<string | null> => {
    // Only handle browser_* tools
    if (!name.startsWith("browser_")) return null;

    if (!tools) {
      return "Browser is not connected. Launch the browser first.";
    }

    switch (name) {
      case "browser_navigate": {
        const url = input.url;
        log.debug("browser_navigate", { inputKeys: Object.keys(input), urlType: typeof url, url: String(url) });
        if (typeof url !== "string" || url.trim().length === 0) {
          log.warn("browser_navigate validation failed", "url is missing or not a non-empty string");
          return "Error: browser_navigate requires a non-empty 'url' argument.";
        }
        const result = await tools.navigate(url);
        if (!result.ok) {
          log.warn("browser_navigate navigation error", result.error);
          return `Navigation error: ${result.error}`;
        }
        lastScreenshot = undefined;
        const responseJson = JSON.stringify(result.value);
        log.debug("browser_navigate success", { responseLength: responseJson.length });
        return responseJson;
      }

      case "browser_snapshot": {
        const result = await tools.snapshot();
        if (!result.ok) return `Snapshot error: ${result.error}`;
        lastScreenshot = result.value.screenshot;
        return result.value.textContent;
      }

      case "browser_describe": {
        const provider = opts.visionProvider ?? opts.primaryProvider;
        if (!provider) {
          return "No vision model available for screenshot description.";
        }

        // Take a fresh screenshot if we don't have one
        if (!lastScreenshot) {
          const snap = await tools.snapshot();
          if (!snap.ok) return `Snapshot error: ${snap.error}`;
          lastScreenshot = snap.value.screenshot;
        }

        try {
          // deno-lint-ignore no-explicit-any
          const messages: any[] = [
            {
              role: "user",
              content: [
                {
                  type: "image",
                  source: {
                    type: "base64",
                    media_type: "image/png",
                    data: lastScreenshot,
                  },
                },
                {
                  type: "text",
                  text: typeof input.prompt === "string" && input.prompt.length > 0
                    ? input.prompt
                    : "Describe this browser screenshot. Focus on the page layout, visible text, interactive elements (buttons, links, forms), and any errors or notable content. Be concise.",
                },
              ],
            },
          ];
          const result = await provider.complete(messages, [], {});
          return result.content;
        } catch (err) {
          return `Vision error: ${(err as Error).message}`;
        }
      }

      case "browser_click": {
        const selector = input.selector;
        if (typeof selector !== "string" || selector.trim().length === 0) {
          return "Error: browser_click requires a non-empty 'selector' argument.";
        }
        const result = await tools.click(selector);
        if (!result.ok) return `Click error: ${result.error}`;
        return `Clicked: ${selector}`;
      }

      case "browser_type": {
        const selector = input.selector;
        const text = input.text;
        if (typeof selector !== "string" || selector.trim().length === 0) {
          return "Error: browser_type requires a non-empty 'selector' argument.";
        }
        if (typeof text !== "string") {
          return "Error: browser_type requires a 'text' argument.";
        }
        const result = await tools.type(selector, text);
        if (!result.ok) return `Type error: ${result.error}`;
        return `Typed into ${selector}`;
      }

      case "browser_select": {
        const selector = input.selector;
        const value = input.value;
        if (typeof selector !== "string" || selector.trim().length === 0) {
          return "Error: browser_select requires a non-empty 'selector' argument.";
        }
        if (typeof value !== "string") {
          return "Error: browser_select requires a 'value' argument.";
        }
        const result = await tools.select(selector, value);
        if (!result.ok) return `Select error: ${result.error}`;
        return `Selected "${value}" in ${selector}`;
      }

      case "browser_scroll": {
        const direction = input.direction;
        if (
          typeof direction !== "string" ||
          !["up", "down", "left", "right"].includes(direction)
        ) {
          return 'Error: browser_scroll requires direction ("up", "down", "left", or "right").';
        }
        const amount = typeof input.amount === "number"
          ? input.amount
          : undefined;
        const result = await tools.scroll(
          direction as ScrollDirection,
          amount,
        );
        if (!result.ok) return `Scroll error: ${result.error}`;
        return `Scrolled ${direction}${amount ? ` ${amount}px` : ""}`;
      }

      case "browser_wait": {
        const selector = typeof input.selector === "string"
          ? input.selector
          : undefined;
        const timeout = typeof input.timeout === "number"
          ? input.timeout
          : undefined;
        const result = await tools.wait(selector, timeout);
        if (!result.ok) return `Wait error: ${result.error}`;
        return selector ? `Element found: ${selector}` : "Wait completed";
      }

      case "browser_close": {
        const result = await tools.close();
        if (!result.ok) return `Browser close error: ${result.error}`;
        return "Browser closed.";
      }

      default:
        return null;
    }
  };
}

// ─── Auto-launch Browser Executor ─────────────────────────────────────────────

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
  readonly executor: (name: string, input: Record<string, unknown>) => Promise<string | null>;
  /** Close the browser and reset state. Call on session reset. */
  readonly close: () => Promise<void>;
}

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
  let tools: BrowserTools | undefined;
  let inner: ((name: string, input: Record<string, unknown>) => Promise<string | null>) | undefined;

  const ensureLaunched = async (): Promise<string | null> => {
    if (tools) return null;

    const result = await config.manager.launch(
      config.agentId,
      config.getSessionTaint(),
    );
    if (!result.ok) {
      return `Browser launch failed: ${result.error}`;
    }

    tools = createBrowserTools({
      page: result.value.page,
      domainPolicy: config.manager.domainPolicy,
    });
    inner = createBrowserToolExecutor({
      tools,
      visionProvider: config.visionProvider,
      primaryProvider: config.primaryProvider,
    });
    return null;
  };

  const close = async (): Promise<void> => {
    if (tools || config.manager.isRunning(config.agentId)) {
      await config.manager.close(config.agentId);
    }
    tools = undefined;
    inner = undefined;
  };

  const executor = async (
    name: string,
    input: Record<string, unknown>,
  ): Promise<string | null> => {
    if (!name.startsWith("browser_")) return null;

    // Handle browser_close without auto-launching the browser.
    // Delegates to the handle's close() which resets all state via BrowserManager.
    if (name === "browser_close") {
      if (tools || config.manager.isRunning(config.agentId)) {
        await close();
        return "Browser closed.";
      }
      return "Browser is not running.";
    }

    const launchError = await ensureLaunched();
    if (launchError) return launchError;

    return inner!(name, input);
  };

  return { executor, close };
}
