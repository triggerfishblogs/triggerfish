/**
 * Browser interaction tools for CDP-based automation.
 *
 * Provides navigate, snapshot, click, type, select, scroll, and wait
 * operations. Navigation enforces SSRF prevention (DNS resolve + IP
 * denylist) and domain policy checks. Screenshots return base64 PNG
 * with extracted text content.
 *
 * @module
 */

import type { Page } from "puppeteer-core";
import type { Result } from "../core/types/classification.ts";
import type { DomainPolicy } from "./domains.ts";
import type { ToolDefinition } from "../agent/orchestrator.ts";
import { resolveAndCheck } from "../web/domains.ts";

// ─── Types ───────────────────────────────────────────────────────────────────

/** DNS resolver + SSRF checker function signature. */
export type DnsChecker = (
  hostname: string,
) => Promise<Result<string, string>>;

/** Result returned by navigate. */
export interface NavigateResult {
  /** The final URL after navigation (may differ from input due to redirects). */
  readonly url: string;
  /** The page title. */
  readonly title: string;
  /** HTTP status code from the navigation response. */
  readonly statusCode: number;
}

/** Result returned by snapshot. */
export interface SnapshotResult {
  /** Base64-encoded PNG screenshot. */
  readonly screenshot: string;
  /** Extracted visible text content from the page. */
  readonly textContent: string;
}

/** Scroll direction. */
export type ScrollDirection = "up" | "down" | "left" | "right";

/** Configuration for creating browser tools. */
export interface BrowserToolsConfig {
  /** The puppeteer Page instance (opaque). */
  readonly page: unknown;
  /** Domain security policy. */
  readonly domainPolicy: DomainPolicy;
  /** DNS resolver + SSRF checker. Defaults to resolveAndCheck. */
  readonly dnsChecker?: DnsChecker;
}

/** Browser tools interface for page interaction. */
export interface BrowserTools {
  /** Navigate to a URL. Subject to SSRF check and domain policy. */
  navigate(url: string): Promise<Result<NavigateResult, string>>;
  /** Take a page screenshot with text extraction. */
  snapshot(): Promise<Result<SnapshotResult, string>>;
  /** Click an element by CSS selector. */
  click(selector: string): Promise<Result<void, string>>;
  /** Type text into an element by CSS selector. */
  type(selector: string, text: string): Promise<Result<void, string>>;
  /** Select a dropdown value by CSS selector. */
  select(selector: string, value: string): Promise<Result<void, string>>;
  /** Scroll the page in a given direction. */
  scroll(
    direction: ScrollDirection,
    amount?: number,
  ): Promise<Result<void, string>>;
  /** Wait for a selector to appear or a fixed duration. */
  wait(selector?: string, timeout?: number): Promise<Result<boolean, string>>;
}

// ─── Default scroll amount (pixels) ─────────────────────────────────────────

const DEFAULT_SCROLL_PX = 500;

// ─── Implementation ──────────────────────────────────────────────────────────

/**
 * Create browser tools backed by a CDP page connection.
 *
 * All navigation checks SSRF denylist (via DNS resolution) and domain
 * policy before proceeding. Tool results follow the Result<T, E> pattern.
 *
 * @param config - Page, domain policy, and optional DNS checker
 * @returns BrowserTools for interacting with the browser page
 */
export function createBrowserTools(config: BrowserToolsConfig): BrowserTools {
  const page = config.page as Page;
  const dnsCheck: DnsChecker = config.dnsChecker ?? resolveAndCheck;

  return {
    async navigate(url: string): Promise<Result<NavigateResult, string>> {
      // Validate URL scheme
      let parsed: URL;
      try {
        parsed = new URL(url);
      } catch {
        return { ok: false, error: `Invalid URL: ${url}` };
      }

      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        return {
          ok: false,
          error: `Only http/https URLs are allowed, got: ${parsed.protocol}`,
        };
      }

      // SSRF check: resolve DNS and verify IP
      const dnsResult = await dnsCheck(parsed.hostname);
      if (!dnsResult.ok) {
        return { ok: false, error: dnsResult.error };
      }

      // Domain policy check
      if (!config.domainPolicy.isAllowed(url)) {
        return {
          ok: false,
          error: `Navigation blocked by domain policy: ${url}`,
        };
      }

      try {
        const response = await page.goto(url, {
          waitUntil: "domcontentloaded",
          timeout: 30000,
        });
        return {
          ok: true,
          value: {
            url: page.url(),
            title: await page.title(),
            statusCode: response?.status() ?? 0,
          },
        };
      } catch (err) {
        return {
          ok: false,
          error: `Navigation failed: ${(err as Error).message}`,
        };
      }
    },

    async snapshot(): Promise<Result<SnapshotResult, string>> {
      try {
        const buffer = await page.screenshot({
          type: "png",
          fullPage: false,
        }) as Uint8Array;

        // Base64 encode — chunk to avoid call stack overflow on large buffers
        const chunks: string[] = [];
        const chunkSize = 8192;
        for (let i = 0; i < buffer.length; i += chunkSize) {
          const slice = buffer.subarray(i, i + chunkSize);
          chunks.push(String.fromCharCode(...slice));
        }
        const screenshot = btoa(chunks.join(""));

        // deno-lint-ignore no-explicit-any
        const textContent: string = await page.evaluate(
          () => (globalThis as any).document?.body?.innerText ?? "",
        );

        return { ok: true, value: { screenshot, textContent } };
      } catch (err) {
        return {
          ok: false,
          error: `Snapshot failed: ${(err as Error).message}`,
        };
      }
    },

    async click(selector: string): Promise<Result<void, string>> {
      try {
        await page.click(selector);
        return { ok: true, value: undefined };
      } catch (err) {
        return {
          ok: false,
          error: `Click failed on "${selector}": ${(err as Error).message}`,
        };
      }
    },

    async type(
      selector: string,
      text: string,
    ): Promise<Result<void, string>> {
      try {
        await page.type(selector, text);
        return { ok: true, value: undefined };
      } catch (err) {
        return {
          ok: false,
          error: `Type failed on "${selector}": ${(err as Error).message}`,
        };
      }
    },

    async select(
      selector: string,
      value: string,
    ): Promise<Result<void, string>> {
      try {
        await page.select(selector, value);
        return { ok: true, value: undefined };
      } catch (err) {
        return {
          ok: false,
          error: `Select failed on "${selector}": ${(err as Error).message}`,
        };
      }
    },

    async scroll(
      direction: ScrollDirection,
      amount?: number,
    ): Promise<Result<void, string>> {
      const px = amount ?? DEFAULT_SCROLL_PX;

      let dx = 0;
      let dy = 0;
      switch (direction) {
        case "down":
          dy = px;
          break;
        case "up":
          dy = -px;
          break;
        case "right":
          dx = px;
          break;
        case "left":
          dx = -px;
          break;
      }

      try {
        await page.evaluate(
          // deno-lint-ignore no-explicit-any
          (scrollX: number, scrollY: number) =>
            (globalThis as any).scrollBy(scrollX, scrollY),
          dx,
          dy,
        );
        return { ok: true, value: undefined };
      } catch (err) {
        return {
          ok: false,
          error: `Scroll failed: ${(err as Error).message}`,
        };
      }
    },

    async wait(
      selector?: string,
      timeout?: number,
    ): Promise<Result<boolean, string>> {
      try {
        if (selector) {
          await page.waitForSelector(selector, {
            timeout: timeout ?? 10000,
          });
          return { ok: true, value: true };
        }

        // No selector — just wait for the given duration
        await new Promise<void>((r) =>
          setTimeout(r, timeout ?? 10000)
        );
        return { ok: true, value: true };
      } catch (err) {
        return {
          ok: false,
          error: `Wait failed: ${(err as Error).message}`,
        };
      }
    },
  };
}

// ─── Tool Definitions ────────────────────────────────────────────────────────

/**
 * Get browser tool definitions for the agent orchestrator.
 */
export function getBrowserToolDefinitions(): readonly ToolDefinition[] {
  return [
    {
      name: "browser_navigate",
      description:
        "Navigate the browser to a URL. Subject to SSRF prevention and domain policy.",
      parameters: {
        url: {
          type: "string",
          description: "The URL to navigate to (http or https only)",
          required: true,
        },
      },
    },
    {
      name: "browser_snapshot",
      description:
        "Take a screenshot of the current page and extract visible text content.",
      parameters: {},
    },
    {
      name: "browser_click",
      description: "Click an element on the page by CSS selector.",
      parameters: {
        selector: {
          type: "string",
          description: "CSS selector of the element to click",
          required: true,
        },
      },
    },
    {
      name: "browser_type",
      description: "Type text into an input element by CSS selector.",
      parameters: {
        selector: {
          type: "string",
          description: "CSS selector of the input element",
          required: true,
        },
        text: {
          type: "string",
          description: "The text to type",
          required: true,
        },
      },
    },
    {
      name: "browser_select",
      description: "Select a value in a dropdown by CSS selector.",
      parameters: {
        selector: {
          type: "string",
          description: "CSS selector of the select element",
          required: true,
        },
        value: {
          type: "string",
          description: "The option value to select",
          required: true,
        },
      },
    },
    {
      name: "browser_scroll",
      description: "Scroll the page in a given direction.",
      parameters: {
        direction: {
          type: "string",
          description: 'Scroll direction: "up", "down", "left", or "right"',
          required: true,
        },
        amount: {
          type: "number",
          description: "Pixels to scroll (default: 500)",
          required: false,
        },
      },
    },
    {
      name: "browser_wait",
      description:
        "Wait for a CSS selector to appear, or wait for a fixed duration if no selector is given.",
      parameters: {
        selector: {
          type: "string",
          description: "CSS selector to wait for (optional)",
          required: false,
        },
        timeout: {
          type: "number",
          description: "Timeout in milliseconds (default: 10000)",
          required: false,
        },
      },
    },
  ];
}

// ─── System Prompt ───────────────────────────────────────────────────────────

/** System prompt section explaining browser tools to the LLM. */
export const BROWSER_TOOLS_SYSTEM_PROMPT = `## Browser Automation

You have access to a Chromium browser via CDP for web interaction.

- Use browser_navigate to go to a URL. Only http/https URLs are allowed. SSRF protection blocks private/reserved IPs.
- Use browser_snapshot to take a screenshot and extract visible text from the page.
- Use browser_click, browser_type, and browser_select to interact with page elements using CSS selectors.
- Use browser_scroll to scroll the page (directions: up, down, left, right).
- Use browser_wait to wait for an element to appear or pause for a duration.
- Some domains may be blocked by policy. If navigation fails, try a different approach.
- The browser profile is classification-aware. Accessing classified domains escalates the profile watermark.`;

// ─── Executor ────────────────────────────────────────────────────────────────

/**
 * Create a tool executor for browser tools.
 *
 * Returns null for unknown tool names (allowing chaining with other executors).
 * Returns an error string if tools are not available (browser not connected).
 *
 * @param tools - BrowserTools instance, or undefined if browser is not connected
 * @returns An executor function: (name, input) => Promise<string | null>
 */
export function createBrowserToolExecutor(
  tools: BrowserTools | undefined,
): (name: string, input: Record<string, unknown>) => Promise<string | null> {
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
        if (typeof url !== "string" || url.trim().length === 0) {
          return "Error: browser_navigate requires a non-empty 'url' argument.";
        }
        const result = await tools.navigate(url);
        if (!result.ok) return `Navigation error: ${result.error}`;
        return JSON.stringify(result.value);
      }

      case "browser_snapshot": {
        const result = await tools.snapshot();
        if (!result.ok) return `Snapshot error: ${result.error}`;
        // Return text content (screenshot is for vision models)
        return `[Screenshot captured]\n\n${result.value.textContent}`;
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

      default:
        return null;
    }
  };
}
