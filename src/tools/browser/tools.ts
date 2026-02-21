/**
 * Browser interaction tools for CDP-based automation.
 *
 * Provides navigate, snapshot, click, type, select, scroll, and wait
 * operations. Navigation enforces SSRF prevention (DNS resolve + IP
 * denylist) and domain policy checks. Screenshots return base64 PNG
 * with extracted text content.
 *
 * Tool definitions live in `tools_defs.ts`; executor logic in
 * `tools_executor.ts`.
 *
 * @module
 */

import type { Page } from "puppeteer-core";
import type { Result } from "../../core/types/classification.ts";
import type { DomainPolicy } from "./domains.ts";
import { resolveAndCheck } from "../web/domains.ts";

// ─── Barrel re-exports ──────────────────────────────────────────────────────

export { getBrowserToolDefinitions, BROWSER_TOOLS_SYSTEM_PROMPT } from "./tools_defs.ts";
export {
  createAutoLaunchBrowserExecutor,
  createBrowserToolExecutor,
  type AutoLaunchBrowserConfig,
  type BrowserExecutorHandle,
  type BrowserToolExecutorOptions,
} from "./tools_executor.ts";

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
  /** Close the browser and end the session. */
  close(): Promise<Result<void, string>>;
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
          error:
            `Only http/https URLs are allowed. Got: ${parsed.protocol} — if the user asked to open a browser or a browser tab, navigate to a URL like https://example.com instead.`,
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

        const textContent: string = await page.evaluate(
          // deno-lint-ignore no-explicit-any
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
          (scrollX: number, scrollY: number) =>
            // deno-lint-ignore no-explicit-any
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

    async close(): Promise<Result<void, string>> {
      try {
        await page.browser().close();
        return { ok: true, value: undefined };
      } catch (err) {
        return {
          ok: false,
          error: `Browser close failed: ${(err as Error).message}`,
        };
      }
    },
  };
}
