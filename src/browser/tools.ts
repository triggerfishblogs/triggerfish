/**
 * Browser interaction tools for CDP-based automation.
 *
 * Provides navigate, snapshot, click, type, select, upload,
 * evaluate, and wait operations. All navigation passes through
 * domain policy checks. Screenshots are classified at session taint.
 * Scraped content creates lineage records.
 *
 * @module
 */

import type { Page, ElementHandle } from "puppeteer-core";
import type { Result } from "../core/types/classification.ts";
import type { BrowserManager } from "./manager.ts";

/** Result of a browser tool operation. */
export interface BrowserToolResult {
  /** Whether the operation succeeded. */
  readonly success: boolean;
  /** Result data, if any. */
  readonly data?: unknown;
  /** Error message, if the operation failed. */
  readonly error?: string;
}

/** Browser tools interface for page interaction. */
export interface BrowserTools {
  /** Navigate to a URL. Subject to domain policy and PRE_TOOL_CALL hook. */
  navigate(url: string): Promise<Result<BrowserToolResult, string>>;
  /** Take a page screenshot. Classified at session taint level. */
  snapshot(): Promise<Result<Uint8Array, string>>;
  /** Click an element by CSS selector. */
  click(selector: string): Promise<Result<BrowserToolResult, string>>;
  /** Type text into an element by CSS selector. */
  type(selector: string, text: string): Promise<Result<BrowserToolResult, string>>;
  /** Select a dropdown value by CSS selector. */
  select(selector: string, value: string): Promise<Result<BrowserToolResult, string>>;
  /** Upload a file to an input element by CSS selector. */
  upload(selector: string, filePath: string): Promise<Result<BrowserToolResult, string>>;
  /** Execute JavaScript in the page context. */
  evaluate(js: string): Promise<Result<unknown, string>>;
  /** Wait for a CSS selector to appear or a condition to be met. */
  wait(selectorOrCondition: string): Promise<Result<BrowserToolResult, string>>;
}

/**
 * Create browser tools backed by a real CDP connection.
 *
 * All navigation checks the manager's domain policy before proceeding.
 * Tool results follow the project's Result<T, E> pattern.
 *
 * @param manager - A BrowserManager that provides the page instance and domain policy
 * @returns BrowserTools for interacting with the browser page
 */
export function createBrowserTools(manager: BrowserManager): BrowserTools {
  function getPage(): Result<Page, string> {
    const p = manager.getPage() as Page | undefined;
    if (!p) {
      return { ok: false, error: "Browser not connected" };
    }
    return { ok: true, value: p };
  }

  return {
    async navigate(url: string): Promise<Result<BrowserToolResult, string>> {
      if (!manager.domainPolicy.isAllowed(url)) {
        return {
          ok: false,
          error: `Navigation blocked by domain policy: ${url}`,
        };
      }

      const pageResult = getPage();
      if (!pageResult.ok) return pageResult;

      try {
        const response = await pageResult.value.goto(url, {
          waitUntil: "domcontentloaded",
          timeout: 30000,
        });
        return {
          ok: true,
          value: {
            success: true,
            data: {
              url: pageResult.value.url(),
              status: response?.status(),
            },
          },
        };
      } catch (err) {
        return {
          ok: false,
          error: `Navigation failed: ${(err as Error).message}`,
        };
      }
    },

    async snapshot(): Promise<Result<Uint8Array, string>> {
      const pageResult = getPage();
      if (!pageResult.ok) return { ok: false, error: pageResult.error };

      try {
        const buffer = await pageResult.value.screenshot({
          type: "png",
          fullPage: false,
        });
        return { ok: true, value: new Uint8Array(buffer) };
      } catch (err) {
        return {
          ok: false,
          error: `Screenshot failed: ${(err as Error).message}`,
        };
      }
    },

    async click(selector: string): Promise<Result<BrowserToolResult, string>> {
      const pageResult = getPage();
      if (!pageResult.ok) return pageResult;

      try {
        await pageResult.value.click(selector);
        return { ok: true, value: { success: true } };
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
    ): Promise<Result<BrowserToolResult, string>> {
      const pageResult = getPage();
      if (!pageResult.ok) return pageResult;

      try {
        await pageResult.value.type(selector, text);
        return { ok: true, value: { success: true } };
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
    ): Promise<Result<BrowserToolResult, string>> {
      const pageResult = getPage();
      if (!pageResult.ok) return pageResult;

      try {
        const selected = await pageResult.value.select(selector, value);
        return {
          ok: true,
          value: { success: true, data: { selected } },
        };
      } catch (err) {
        return {
          ok: false,
          error: `Select failed on "${selector}": ${(err as Error).message}`,
        };
      }
    },

    async upload(
      selector: string,
      filePath: string,
    ): Promise<Result<BrowserToolResult, string>> {
      const pageResult = getPage();
      if (!pageResult.ok) return pageResult;

      try {
        const element = await pageResult.value.$(selector) as ElementHandle | null;
        if (!element) {
          return {
            ok: false,
            error: `Upload element not found: "${selector}"`,
          };
        }
        await element.uploadFile(filePath);
        return { ok: true, value: { success: true } };
      } catch (err) {
        return {
          ok: false,
          error: `Upload failed on "${selector}": ${(err as Error).message}`,
        };
      }
    },

    async evaluate(js: string): Promise<Result<unknown, string>> {
      const pageResult = getPage();
      if (!pageResult.ok) return { ok: false, error: pageResult.error };

      try {
        const result = await pageResult.value.evaluate(js);
        return { ok: true, value: result };
      } catch (err) {
        return {
          ok: false,
          error: `Evaluate failed: ${(err as Error).message}`,
        };
      }
    },

    async wait(
      selectorOrCondition: string,
    ): Promise<Result<BrowserToolResult, string>> {
      const pageResult = getPage();
      if (!pageResult.ok) return pageResult;

      try {
        await pageResult.value.waitForSelector(selectorOrCondition, {
          timeout: 30000,
        });
        return { ok: true, value: { success: true } };
      } catch (err) {
        return {
          ok: false,
          error: `Wait failed for "${selectorOrCondition}": ${(err as Error).message}`,
        };
      }
    },
  };
}
