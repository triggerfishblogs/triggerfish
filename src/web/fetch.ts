/**
 * Web fetch with content extraction via Mozilla Readability.
 *
 * Fetches web pages with SSRF prevention, domain policy checks,
 * and optional article content extraction using Readability.
 *
 * @module
 */

import { Readability } from "@mozilla/readability";
import { parseHTML } from "linkedom";
import type { Result } from "../core/types/classification.ts";
import type { DomainPolicy } from "./domains.ts";
import { resolveAndCheck as defaultResolveAndCheck } from "./domains.ts";

/** DNS resolution + SSRF check function signature. */
export type DnsChecker = (hostname: string) => Promise<Result<string, string>>;

// ─── Interfaces ─────────────────────────────────────────────────────────────

/** Content extraction mode. */
export type FetchMode = "readability" | "raw";

/** Options for fetching a web page. */
export interface FetchOptions {
  readonly mode?: FetchMode;
  readonly maxContentLength?: number;
  readonly timeout?: number;
  readonly userAgent?: string;
}

/** Result of fetching a web page. */
export interface FetchResult {
  readonly url: string;
  readonly title: string;
  readonly content: string;
  readonly contentType: string;
  readonly statusCode: number;
  readonly mode: FetchMode;
  readonly byteLength: number;
}

/** Web fetcher interface. */
export interface WebFetcher {
  /** Fetch a URL and extract content. */
  fetch(url: string, options?: FetchOptions): Promise<Result<FetchResult, string>>;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const DEFAULT_MAX_CONTENT_LENGTH = 512 * 1024; // 512 KB
const DEFAULT_TIMEOUT = 30_000; // 30 seconds
const DEFAULT_USER_AGENT =
  "Triggerfish/1.0 (Web Fetch; +https://triggerfish.sh)";
const MIN_READABILITY_LENGTH = 100;

// ─── Implementation ─────────────────────────────────────────────────────────

/** Configuration for the web fetcher. */
export interface WebFetcherConfig {
  readonly domainPolicy: DomainPolicy;
  /** Override DNS resolution for testing. Defaults to resolveAndCheck. */
  readonly dnsChecker?: DnsChecker;
}

/**
 * Create a web fetcher with domain policy enforcement and SSRF prevention.
 *
 * @param configOrPolicy - WebFetcherConfig or DomainPolicy for backwards compatibility
 * @returns A WebFetcher instance
 */
export function createWebFetcher(
  configOrPolicy: WebFetcherConfig | DomainPolicy,
): WebFetcher {
  const domainPolicy = "isAllowed" in configOrPolicy
    ? configOrPolicy
    : configOrPolicy.domainPolicy;
  const resolveAndCheck = "isAllowed" in configOrPolicy
    ? defaultResolveAndCheck
    : (configOrPolicy.dnsChecker ?? defaultResolveAndCheck);
  return {
    async fetch(
      url: string,
      options?: FetchOptions,
    ): Promise<Result<FetchResult, string>> {
      // 1. Parse URL and extract hostname
      let parsed: URL;
      try {
        parsed = new URL(url);
      } catch {
        return { ok: false, error: `Invalid URL: ${url}` };
      }

      // Only allow http/https
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        return {
          ok: false,
          error: `Unsupported protocol: ${parsed.protocol}`,
        };
      }

      const hostname = parsed.hostname;

      // 2. SSRF prevention — resolve DNS and check IP
      const dnsResult = await resolveAndCheck(hostname);
      if (!dnsResult.ok) {
        return { ok: false, error: dnsResult.error };
      }

      // 3. Check domain against policy
      if (!domainPolicy.isAllowed(url)) {
        return {
          ok: false,
          error: `Domain blocked by policy: ${hostname}`,
        };
      }

      // 4. Fetch with timeout
      const timeout = options?.timeout ?? DEFAULT_TIMEOUT;
      const maxContentLength =
        options?.maxContentLength ?? DEFAULT_MAX_CONTENT_LENGTH;
      const mode = options?.mode ?? "readability";
      const userAgent = options?.userAgent ?? DEFAULT_USER_AGENT;

      let response: Response;
      try {
        response = await fetch(url, {
          headers: {
            "User-Agent": userAgent,
            "Accept": "text/html,application/xhtml+xml,*/*",
          },
          signal: AbortSignal.timeout(timeout),
          redirect: "follow",
        });
      } catch (err) {
        return {
          ok: false,
          error: `Fetch failed: ${err instanceof Error ? err.message : String(err)}`,
        };
      }

      if (!response.ok) {
        return {
          ok: false,
          error: `HTTP ${response.status}: ${response.statusText}`,
        };
      }

      const contentType = response.headers.get("content-type") ?? "text/html";

      // Read body as text
      let rawBody: string;
      try {
        rawBody = await response.text();
      } catch (err) {
        return {
          ok: false,
          error: `Failed to read response body: ${err instanceof Error ? err.message : String(err)}`,
        };
      }

      const byteLength = new TextEncoder().encode(rawBody).length;

      // 5. Content extraction
      let title = "";
      let content: string;

      if (mode === "readability" && contentType.includes("text/html")) {
        try {
          const { document } = parseHTML(rawBody);
          const reader = new Readability(document);
          const article = reader.parse();

          if (article && article.textContent && article.textContent.length >= MIN_READABILITY_LENGTH) {
            title = article.title ?? "";
            content = article.textContent;
          } else {
            // Fallback to raw HTML if Readability extraction is too short
            title = extractTitleFromHtml(rawBody);
            content = rawBody;
          }
        } catch {
          // Fallback to raw on parse error
          title = extractTitleFromHtml(rawBody);
          content = rawBody;
        }
      } else {
        // Raw mode or non-HTML content
        title = extractTitleFromHtml(rawBody);
        content = rawBody;
      }

      // 6. Truncate at maxContentLength
      if (content.length > maxContentLength) {
        content = content.slice(0, maxContentLength) + "\n[truncated]";
      }

      return {
        ok: true,
        value: {
          url: response.url,
          title,
          content,
          contentType,
          statusCode: response.status,
          mode,
          byteLength,
        },
      };
    },
  };
}

/**
 * Extract <title> from raw HTML using a simple regex.
 * Returns empty string if no title found.
 */
function extractTitleFromHtml(html: string): string {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match ? match[1].trim() : "";
}
