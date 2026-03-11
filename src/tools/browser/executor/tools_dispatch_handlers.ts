/**
 * Individual browser tool handler functions.
 *
 * Each handler validates inputs and delegates to a BrowserTools instance.
 * Used by the dispatch router in tools_executor_dispatch.ts.
 *
 * @module
 */

import type { LlmProvider } from "../../../core/types/llm.ts";
import type { BrowserTools, ScrollDirection } from "../tools/tools.ts";
import { createLogger } from "../../../core/logger/mod.ts";

const log = createLogger("browser-tools");

/** Options for vision-powered screenshot description. */
export interface DescribeOptions {
  readonly visionProvider?: LlmProvider;
  readonly primaryProvider?: LlmProvider;
}

/** Handle browser_navigate: validate URL and navigate. */
export async function dispatchNavigate(
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
    log.warn(
      "browser_navigate validation failed",
      "url is missing or not a non-empty string",
    );
    return "Error: browser_navigate requires a non-empty 'url' argument.";
  }
  const result = await tools.navigate(url);
  if (!result.ok) {
    log.warn("browser_navigate navigation error", result.error);
    return `Navigation error: ${result.error}`;
  }
  const responseJson = JSON.stringify(result.value);
  log.debug("browser_navigate success", {
    responseLength: responseJson.length,
  });
  return responseJson;
}

/** Format snapshot links as a readable section for the LLM. */
function formatSnapshotLinks(
  links: ReadonlyArray<{ readonly text: string; readonly href: string }>,
): string {
  if (links.length === 0) return "";
  const lines = links.map((l) =>
    `- [${l.text.replace(/[[\]]/g, "")}](<${l.href}>)`
  );
  return `\n\n## Links on page\n${lines.join("\n")}`;
}

/** Handle browser_snapshot: capture screenshot + text + links. */
export async function dispatchSnapshot(
  tools: BrowserTools,
  lastScreenshotRef: { value: string | undefined },
): Promise<string> {
  const result = await tools.snapshot();
  if (!result.ok) return `Snapshot error: ${result.error}`;
  lastScreenshotRef.value = result.value.screenshot;
  return result.value.textContent + formatSnapshotLinks(result.value.links);
}

/** Build a vision prompt for screenshot description. */
function buildDescribePrompt(input: Record<string, unknown>): string {
  if (typeof input.prompt === "string" && input.prompt.length > 0) {
    return input.prompt;
  }
  return "Describe this browser screenshot. Focus on the page layout, visible text, interactive elements (buttons, links, forms), and any errors or notable content. Be concise.";
}

/** Handle browser_describe: send screenshot to vision LLM. */
export async function dispatchDescribe(
  tools: BrowserTools,
  input: Record<string, unknown>,
  opts: DescribeOptions,
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
export async function dispatchClick(
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
export async function dispatchType(
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
export async function dispatchSelect(
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
export async function dispatchScroll(
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
export async function dispatchWait(
  tools: BrowserTools,
  input: Record<string, unknown>,
): Promise<string> {
  const selector = typeof input.selector === "string"
    ? input.selector
    : undefined;
  const timeout = typeof input.timeout === "number" ? input.timeout : undefined;
  const result = await tools.wait(selector, timeout);
  if (!result.ok) return `Wait error: ${result.error}`;
  return selector ? `Element found: ${selector}` : "Wait completed";
}

/** Handle browser_close: close the browser session. */
export async function dispatchClose(tools: BrowserTools): Promise<string> {
  const result = await tools.close();
  if (!result.ok) return `Browser close error: ${result.error}`;
  return "Browser closed.";
}
