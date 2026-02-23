/**
 * Type definitions for browser interaction tools.
 *
 * Defines the interfaces and types shared across navigation,
 * page interaction, and factory modules. All result types follow
 * the Result<T, E> pattern from core.
 *
 * @module
 */

import type { Result } from "../../../core/types/classification.ts";
import type { DomainPolicy } from "../domains.ts";

// ─── DNS ─────────────────────────────────────────────────────────────────────

/** DNS resolver + SSRF checker function signature. */
export type DnsChecker = (
  hostname: string,
) => Promise<Result<string, string>>;

// ─── Navigation ──────────────────────────────────────────────────────────────

/** Result returned by navigate. */
export interface NavigateResult {
  /** The final URL after navigation (may differ from input due to redirects). */
  readonly url: string;
  /** The page title. */
  readonly title: string;
  /** HTTP status code from the navigation response. */
  readonly statusCode: number;
}

// ─── Snapshot ────────────────────────────────────────────────────────────────

/** Result returned by snapshot. */
export interface SnapshotResult {
  /** Base64-encoded PNG screenshot. */
  readonly screenshot: string;
  /** Extracted visible text content from the page. */
  readonly textContent: string;
}

// ─── Scroll ──────────────────────────────────────────────────────────────────

/** Scroll direction. */
export type ScrollDirection = "up" | "down" | "left" | "right";

// ─── Configuration ───────────────────────────────────────────────────────────

/** Configuration for creating browser tools. */
export interface BrowserToolsConfig {
  /** The puppeteer Page instance (opaque). */
  readonly page: unknown;
  /** Domain security policy. */
  readonly domainPolicy: DomainPolicy;
  /** DNS resolver + SSRF checker. Defaults to resolveAndCheck. */
  readonly dnsChecker?: DnsChecker;
}

// ─── Tools Interface ─────────────────────────────────────────────────────────

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
