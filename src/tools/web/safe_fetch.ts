/**
 * safeFetch — SSRF-enforced HTTP fetch wrapper.
 *
 * Validates a URL against the SSRF denylist (DNS resolution + IP check)
 * before making any outbound HTTP request. Returns a Result to avoid
 * thrown exceptions.
 *
 * Use this as the building block for any new code that needs outbound HTTP.
 * Never call `fetch()` directly on user-controlled or config-provided URLs.
 *
 * @module
 */

import type { Result } from "../../core/types/classification.ts";
import { resolveAndCheck } from "./ssrf.ts";

/** DNS resolver + SSRF checker function signature (injectable for testing). */
export type SsrfChecker = (hostname: string) => Promise<Result<string, string>>;

/**
 * Fetch a URL with SSRF prevention enforced.
 *
 * Resolves the URL's hostname via DNS and checks all returned IP addresses
 * against the hardcoded SSRF denylist before making the request. Blocks
 * if any resolved IP is private/reserved.
 *
 * @param url - The URL to fetch (must be http or https)
 * @param options - Standard RequestInit fetch options
 * @param ssrfChecker - Override SSRF checker for testing (default: resolveAndCheck)
 * @returns Result<Response, string> — Err if SSRF check fails, URL is invalid, or fetch throws
 */
export async function safeFetch(
  url: string | URL,
  options?: RequestInit,
  ssrfChecker: SsrfChecker = resolveAndCheck,
): Promise<Result<Response, string>> {
  const urlStr = url instanceof URL ? url.href : url;
  let parsed: URL;
  try {
    parsed = new URL(urlStr);
  } catch {
    return { ok: false, error: `Invalid URL: ${urlStr}` };
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return { ok: false, error: `Unsupported protocol: ${parsed.protocol}` };
  }

  const ssrfResult = await ssrfChecker(parsed.hostname);
  if (!ssrfResult.ok) {
    return { ok: false, error: ssrfResult.error };
  }

  try {
    const response = await fetch(urlStr, options);
    return { ok: true, value: response };
  } catch (err) {
    return {
      ok: false,
      error: `Fetch failed: ${
        err instanceof Error ? err.message : String(err)
      }`,
    };
  }
}
