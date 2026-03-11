/**
 * Browser tool executor — dispatches browser_* tool calls.
 *
 * Creates a chain-compatible executor backed by a BrowserTools instance.
 * Returns null for unknown tool names, allowing chaining with other executors.
 *
 * @module
 */

import type { LlmProvider } from "../../../core/types/llm.ts";
import type { BrowserTools } from "../tools/tools.ts";
import {
  dispatchClick,
  dispatchClose,
  dispatchDescribe,
  dispatchNavigate,
  dispatchScroll,
  dispatchSelect,
  dispatchSnapshot,
  dispatchType,
  dispatchWait,
} from "./tools_dispatch_handlers.ts";

// ─── Types ──────────────────────────────────────────────────────────────────

/** Options for the browser tool executor. */
export interface BrowserToolExecutorOptions {
  /** BrowserTools instance, or undefined if browser is not connected. */
  readonly tools: BrowserTools | undefined;
  /** Vision-capable LLM provider for describing screenshots. */
  readonly visionProvider?: LlmProvider;
  /** Primary LLM provider — fallback for screenshot description when no vision provider. */
  readonly primaryProvider?: LlmProvider;
}

/** Executor function signature for browser tool dispatch. */
export type BrowserToolExecutorFn = (
  name: string,
  input: Record<string, unknown>,
) => Promise<string | null>;

// ─── Input Normalisation ────────────────────────────────────────────────────

/** Normalise raw optsOrTools into a canonical BrowserToolExecutorOptions. */
function normaliseExecutorOptions(
  optsOrTools: BrowserToolExecutorOptions | BrowserTools | undefined,
): BrowserToolExecutorOptions {
  if (optsOrTools === undefined || optsOrTools === null) {
    return { tools: undefined };
  }
  if ("navigate" in optsOrTools) {
    return { tools: optsOrTools as BrowserTools };
  }
  return optsOrTools as BrowserToolExecutorOptions;
}

// ─── Dispatch Router ────────────────────────────────────────────────────────

/** Route a browser_* tool call to its handler. Returns null for unknown tools. */
// deno-lint-ignore require-await
async function routeBrowserToolCall(
  name: string,
  input: Record<string, unknown>,
  tools: BrowserTools,
  opts: BrowserToolExecutorOptions,
  lastScreenshotRef: { value: string | undefined },
): Promise<string | null> {
  switch (name) {
    case "browser_navigate":
      lastScreenshotRef.value = undefined;
      return dispatchNavigate(tools, input);
    case "browser_snapshot":
      return dispatchSnapshot(tools, lastScreenshotRef);
    case "browser_describe":
      return dispatchDescribe(tools, input, opts, lastScreenshotRef);
    case "browser_click":
      return dispatchClick(tools, input);
    case "browser_type":
      return dispatchType(tools, input);
    case "browser_select":
      return dispatchSelect(tools, input);
    case "browser_scroll":
      return dispatchScroll(tools, input);
    case "browser_wait":
      return dispatchWait(tools, input);
    case "browser_close":
      return dispatchClose(tools);
    default:
      return null;
  }
}

// ─── Public API ─────────────────────────────────────────────────────────────

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
): BrowserToolExecutorFn {
  const opts = normaliseExecutorOptions(optsOrTools);
  const tools = opts.tools;
  const lastScreenshotRef: { value: string | undefined } = { value: undefined };

  // deno-lint-ignore require-await
  return async (
    name: string,
    input: Record<string, unknown>,
  ): Promise<string | null> => {
    if (!name.startsWith("browser_")) return null;
    if (!tools) {
      return "Browser is not connected. Launch the browser first.";
    }
    return routeBrowserToolCall(name, input, tools, opts, lastScreenshotRef);
  };
}
