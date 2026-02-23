/**
 * Browser tool executor — dispatches browser_* tool calls.
 *
 * Creates a chain-compatible executor backed by a BrowserTools instance.
 * Returns null for unknown tool names, allowing chaining with other executors.
 * Individual tool handlers validate inputs and delegate to BrowserTools.
 *
 * @module
 */

import type { LlmProvider } from "../../core/types/llm.ts";
import type { BrowserTools, ScrollDirection } from "./tools.ts";
import { createLogger } from "../../core/logger/mod.ts";

const log = createLogger("browser-tools");

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

// ─── Individual Tool Handlers ───────────────────────────────────────────────

/** Handle browser_navigate: validate URL and navigate. */
async function dispatchNavigate(
  tools: BrowserTools,
  input: Record<string, unknown>,
): Promise<string> {
  const url = input.url;
  log.debug("browser_navigate", {
    inputKeys: Object.keys(input),
    urlType: typeof url,
    url: String(url),
  });
  if (typeof url !== "string" || url.trim().length === 0) {
    log.warn("browser_navigate validation failed", "url is missing or not a non-empty string");
    return "Error: browser_navigate requires a non-empty 'url' argument.";
  }
  const result = await tools.navigate(url);
  if (!result.ok) {
    log.warn("browser_navigate navigation error", result.error);
    return `Navigation error: ${result.error}`;
  }
  const responseJson = JSON.stringify(result.value);
  log.debug("browser_navigate success", { responseLength: responseJson.length });
  return responseJson;
}

/** Handle browser_snapshot: capture screenshot + text. */
async function dispatchSnapshot(
  tools: BrowserTools,
  lastScreenshotRef: { value: string | undefined },
): Promise<string> {
  const result = await tools.snapshot();
  if (!result.ok) return `Snapshot error: ${result.error}`;
  lastScreenshotRef.value = result.value.screenshot;
  return result.value.textContent;
}

/** Build a vision prompt for screenshot description. */
function buildDescribePrompt(input: Record<string, unknown>): string {
  if (typeof input.prompt === "string" && input.prompt.length > 0) {
    return input.prompt;
  }
  return "Describe this browser screenshot. Focus on the page layout, visible text, interactive elements (buttons, links, forms), and any errors or notable content. Be concise.";
}

/** Handle browser_describe: send screenshot to vision LLM. */
async function dispatchDescribe(
  tools: BrowserTools,
  input: Record<string, unknown>,
  opts: BrowserToolExecutorOptions,
  lastScreenshotRef: { value: string | undefined },
): Promise<string> {
  const provider = opts.visionProvider ?? opts.primaryProvider;
  if (!provider) {
    return "No vision model available for screenshot description.";
  }

  if (!lastScreenshotRef.value) {
    const snap = await tools.snapshot();
    if (!snap.ok) return `Snapshot error: ${snap.error}`;
    lastScreenshotRef.value = snap.value.screenshot;
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
              data: lastScreenshotRef.value,
            },
          },
          { type: "text", text: buildDescribePrompt(input) },
        ],
      },
    ];
    const result = await provider.complete(messages, [], {});
    return result.content;
  } catch (err) {
    return `Vision error: ${(err as Error).message}`;
  }
}

/** Handle browser_click: validate selector and click. */
async function dispatchClick(
  tools: BrowserTools,
  input: Record<string, unknown>,
): Promise<string> {
  const selector = input.selector;
  if (typeof selector !== "string" || selector.trim().length === 0) {
    return "Error: browser_click requires a non-empty 'selector' argument.";
  }
  const result = await tools.click(selector);
  if (!result.ok) return `Click error: ${result.error}`;
  return `Clicked: ${selector}`;
}

/** Handle browser_type: validate selector/text and type. */
async function dispatchType(
  tools: BrowserTools,
  input: Record<string, unknown>,
): Promise<string> {
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

/** Handle browser_select: validate selector/value and select. */
async function dispatchSelect(
  tools: BrowserTools,
  input: Record<string, unknown>,
): Promise<string> {
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

/** Handle browser_scroll: validate direction and scroll. */
async function dispatchScroll(
  tools: BrowserTools,
  input: Record<string, unknown>,
): Promise<string> {
  const direction = input.direction;
  if (
    typeof direction !== "string" ||
    !["up", "down", "left", "right"].includes(direction)
  ) {
    return 'Error: browser_scroll requires direction ("up", "down", "left", or "right").';
  }
  const amount = typeof input.amount === "number" ? input.amount : undefined;
  const result = await tools.scroll(direction as ScrollDirection, amount);
  if (!result.ok) return `Scroll error: ${result.error}`;
  return `Scrolled ${direction}${amount ? ` ${amount}px` : ""}`;
}

/** Handle browser_wait: wait for selector or timeout. */
async function dispatchWait(
  tools: BrowserTools,
  input: Record<string, unknown>,
): Promise<string> {
  const selector = typeof input.selector === "string" ? input.selector : undefined;
  const timeout = typeof input.timeout === "number" ? input.timeout : undefined;
  const result = await tools.wait(selector, timeout);
  if (!result.ok) return `Wait error: ${result.error}`;
  return selector ? `Element found: ${selector}` : "Wait completed";
}

/** Handle browser_close: close the browser session. */
async function dispatchClose(tools: BrowserTools): Promise<string> {
  const result = await tools.close();
  if (!result.ok) return `Browser close error: ${result.error}`;
  return "Browser closed.";
}

// ─── Dispatch Router ────────────────────────────────────────────────────────

/** Route a browser_* tool call to its handler. Returns null for unknown tools. */
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
