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
import type { Result } from "../../core/types/classification.ts";
import { createLogger } from "../../core/logger/logger.ts";
import type { DomainPolicy } from "./policy.ts";
import { resolveAndCheck as defaultResolveAndCheck } from "./ssrf.ts";

const log = createLogger("web.fetch");

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
  fetch(
    url: string,
    options?: FetchOptions,
  ): Promise<Result<FetchResult, string>>;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const DEFAULT_MAX_CONTENT_LENGTH = 512 * 1024; // 512 KB
const DEFAULT_TIMEOUT = 30_000; // 30 seconds
const DEFAULT_USER_AGENT = "Triggerfish/1.0 (Web Fetch; +https://trigger.fish)";
const MIN_READABILITY_LENGTH = 100;

// ─── Implementation ─────────────────────────────────────────────────────────

/** Configuration for the web fetcher. */
export interface WebFetcherConfig {
  readonly domainPolicy: DomainPolicy;
  /** Override DNS resolution for testing. Defaults to resolveAndCheck. */
  readonly dnsChecker?: DnsChecker;
}

/** Options for the internal page fetch operation. */
interface FetchPageOptions {
  readonly url: string;
  readonly userAgent: string;
  readonly timeout: number;
  readonly maxBytes: number;
}

/** Validate URL format and protocol. */
function validateFetchUrl(url: string): Result<URL, string> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { ok: false, error: `Invalid URL: ${url}` };
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return { ok: false, error: `Unsupported protocol: ${parsed.protocol}` };
  }
  return { ok: true, value: parsed };
}

/** Check SSRF prevention and domain policy for a hostname. */
async function enforceFetchPolicy(
  hostname: string,
  url: string,
  domainPolicy: DomainPolicy,
  dnsChecker: DnsChecker,
): Promise<Result<void, string>> {
  const dnsResult = await dnsChecker(hostname);
  if (!dnsResult.ok) {
    log.warn("SSRF check blocked outbound request", {
      operation: "enforceFetchPolicy",
      hostname,
      reason: dnsResult.error,
    });
    return { ok: false, error: dnsResult.error };
  }
  log.debug("SSRF check passed", { operation: "enforceFetchPolicy", hostname });
  if (!domainPolicy.isAllowed(url)) {
    log.warn("Domain policy blocked outbound request", {
      operation: "enforceFetchPolicy",
      hostname,
    });
    return { ok: false, error: `Domain blocked by policy: ${hostname}` };
  }
  return { ok: true, value: undefined };
}

/**
 * Read a ReadableStream in chunks, cancelling when totalBytes reaches maxBytes.
 * Returns collected chunks and a truncated flag.
 */
async function consumeStreamWithLimit(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  maxBytes: number,
): Promise<{ readonly chunks: Uint8Array[]; readonly truncated: boolean }> {
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) return { chunks, truncated: false };
    const remaining = maxBytes - totalBytes;
    if (value.length >= remaining) {
      chunks.push(value.subarray(0, remaining));
      await reader.cancel();
      return { chunks, truncated: true };
    }
    chunks.push(value);
    totalBytes += value.length;
  }
}

/** Merge Uint8Array chunks into a single buffer and UTF-8 decode to string. */
function decodeStreamChunks(
  chunks: Uint8Array[],
): { readonly text: string; readonly byteLength: number } {
  const byteLength = chunks.reduce((n, c) => n + c.length, 0);
  const merged = new Uint8Array(byteLength);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.length;
  }
  return { text: new TextDecoder().decode(merged), byteLength };
}

/** Fetch a URL and stream the response body up to maxBytes. */
async function fetchPageContent(
  options: FetchPageOptions,
): Promise<
  Result<
    {
      response: Response;
      rawBody: string;
      contentType: string;
      byteLength: number;
      bodyTruncated: boolean;
    },
    string
  >
> {
  let response: Response;
  try {
    response = await fetch(options.url, {
      headers: {
        "User-Agent": options.userAgent,
        "Accept": "text/html,application/xhtml+xml,*/*",
      },
      signal: AbortSignal.timeout(options.timeout),
      redirect: "follow",
    });
  } catch (err) {
    return {
      ok: false,
      error: `Fetch failed: ${
        err instanceof Error ? err.message : String(err)
      }`,
    };
  }
  if (!response.ok) {
    return {
      ok: false,
      error: `HTTP ${response.status}: ${response.statusText}`,
    };
  }
  const reader = response.body?.getReader();
  if (!reader) {
    return { ok: false, error: "Response body is not readable" };
  }
  let rawBody: string;
  let byteLength: number;
  let bodyTruncated: boolean;
  try {
    const { chunks, truncated } = await consumeStreamWithLimit(
      reader,
      options.maxBytes,
    );
    const decoded = decodeStreamChunks(chunks);
    rawBody = decoded.text;
    byteLength = decoded.byteLength;
    bodyTruncated = truncated;
  } catch (err) {
    return {
      ok: false,
      error: `Failed to read response body: ${
        err instanceof Error ? err.message : String(err)
      }`,
    };
  }
  const contentType = response.headers.get("content-type") ?? "text/html";
  return {
    ok: true,
    value: { response, rawBody, contentType, byteLength, bodyTruncated },
  };
}

/** Extract readable content from HTML, falling back to raw on failure. */
function extractPageContent(
  rawBody: string,
  contentType: string,
  mode: FetchMode,
): { readonly title: string; readonly content: string } {
  if (mode !== "readability" || !contentType.includes("text/html")) {
    return { title: extractTitleFromHtml(rawBody), content: rawBody };
  }
  try {
    // deno-lint-ignore no-explicit-any
    const { document } = parseHTML(rawBody) as any;
    const reader = new Readability(document);
    const article = reader.parse();
    if (
      article?.textContent &&
      article.textContent.length >= MIN_READABILITY_LENGTH
    ) {
      return { title: article.title ?? "", content: article.textContent };
    }
  } catch (err) {
    log.debug("Readability parse failed, falling back to raw content", {
      error: err,
    });
  }
  return { title: extractTitleFromHtml(rawBody), content: rawBody };
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
      const urlResult = validateFetchUrl(url);
      if (!urlResult.ok) return urlResult;
      const policyResult = await enforceFetchPolicy(
        urlResult.value.hostname,
        url,
        domainPolicy,
        resolveAndCheck,
      );
      if (!policyResult.ok) return policyResult;
      const timeout = options?.timeout ?? DEFAULT_TIMEOUT;
      const userAgent = options?.userAgent ?? DEFAULT_USER_AGENT;
      const mode = options?.mode ?? "readability";
      const maxLen = options?.maxContentLength ?? DEFAULT_MAX_CONTENT_LENGTH;
      const pageResult = await fetchPageContent(
        { url, userAgent, timeout, maxBytes: maxLen },
      );
      if (!pageResult.ok) return pageResult;
      const { response, rawBody, contentType, byteLength, bodyTruncated } =
        pageResult.value;
      const extracted = extractPageContent(rawBody, contentType, mode);
      const content = bodyTruncated
        ? extracted.content + "\n[truncated]"
        : extracted.content.length > maxLen
        ? extracted.content.slice(0, maxLen) + "\n[truncated]"
        : extracted.content;
      return {
        ok: true,
        value: {
          url: response.url,
          title: extracted.title,
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
