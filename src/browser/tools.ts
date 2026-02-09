/**
 * Browser interaction tools for CDP-based automation.
 *
 * Provides navigate, snapshot, click, type, select, upload,
 * evaluate, and wait operations. All navigation passes through
 * PRE_TOOL_CALL hooks. Screenshots are classified at session taint.
 * Scraped content creates lineage records.
 *
 * @module
 */

import type { Result } from "../core/types/classification.ts";

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
 * Create browser tools for page interaction.
 *
 * Note: Actual CDP integration requires puppeteer-core or playwright.
 * This provides the interface and type definitions.
 *
 * @returns A BrowserTools stub (CDP integration pending)
 */
export function createBrowserTools(): BrowserTools {
  const notConnected = (): Result<BrowserToolResult, string> => ({
    ok: false,
    error: "Browser not connected",
  });

  return {
    async navigate(_url: string) {
      return notConnected();
    },
    async snapshot() {
      return { ok: false as const, error: "Browser not connected" };
    },
    async click(_selector: string) {
      return notConnected();
    },
    async type(_selector: string, _text: string) {
      return notConnected();
    },
    async select(_selector: string, _value: string) {
      return notConnected();
    },
    async upload(_selector: string, _filePath: string) {
      return notConnected();
    },
    async evaluate(_js: string) {
      return { ok: false as const, error: "Browser not connected" };
    },
    async wait(_selectorOrCondition: string) {
      return notConnected();
    },
  };
}
