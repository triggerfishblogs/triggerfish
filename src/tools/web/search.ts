/**
 * Web search provider interface and Brave Search implementation.
 *
 * Defines a pluggable SearchProvider interface with a default Brave Search
 * backend. Other providers (SearXNG, Google, etc.) can implement the same
 * interface.
 *
 * @module
 */

import type { Result } from "../../core/types/classification.ts";
import { createLogger } from "../../core/logger/logger.ts";

const log = createLogger("search");

// ─── Interfaces ─────────────────────────────────────────────────────────────

/** Options for a web search query. */
export interface SearchOptions {
  readonly maxResults?: number;
  readonly language?: string;
  readonly region?: string;
  readonly safeSearch?: "off" | "moderate" | "strict";
}

/** A single search result item. */
export interface SearchResultItem {
  readonly title: string;
  readonly url: string;
  readonly snippet: string;
  readonly publishedDate?: string;
}

/** The complete result of a search query. */
export interface SearchResult {
  readonly query: string;
  readonly results: readonly SearchResultItem[];
  readonly totalEstimate?: number;
}

/** A pluggable web search provider. */
export interface SearchProvider {
  readonly id: string;
  readonly name: string;
  /** Execute a search query. */
  search(
    query: string,
    options?: SearchOptions,
  ): Promise<Result<SearchResult, string>>;
}

// ─── Brave Search Implementation ────────────────────────────────────────────

/** Configuration for the Brave Search provider. */
export interface BraveSearchConfig {
  readonly apiKey: string;
  readonly endpoint?: string;
}

/** Shape of a Brave API web search result. */
interface BraveWebResult {
  readonly title?: string;
  readonly url?: string;
  readonly description?: string;
  readonly page_age?: string;
}

/** Shape of the Brave API response. */
interface BraveApiResponse {
  readonly web?: {
    readonly results?: readonly BraveWebResult[];
    readonly totalEstimatedMatches?: number;
  };
}

/**
 * Wrap a SearchProvider with minimum-interval rate limiting.
 *
 * Concurrent calls are serialized — each waits for the previous to start
 * before beginning its own delay. This prevents bursts from exceeding the
 * configured requests-per-second limit.
 *
 * @param provider - The underlying search provider to wrap
 * @param requestsPerSecond - Maximum requests per second (e.g. 1 for Brave free tier)
 * @returns A rate-limited SearchProvider with the same interface
 */
export function createRateLimitedSearchProvider(
  provider: SearchProvider,
  requestsPerSecond: number,
): SearchProvider {
  const minIntervalMs = 1000 / requestsPerSecond;
  let lastRequestTime = 0;
  let pending: Promise<unknown> = Promise.resolve();

  return {
    id: provider.id,
    name: provider.name,
    search(query, options) {
      const job = pending.then(async () => {
        const now = Date.now();
        const elapsed = now - lastRequestTime;
        if (elapsed < minIntervalMs) {
          await new Promise((resolve) =>
            setTimeout(resolve, minIntervalMs - elapsed)
          );
        }
        lastRequestTime = Date.now();
        return provider.search(query, options);
      });
      pending = job.catch((err: unknown) => {
        log.debug("Rate-limited search job failed", {
          error: err instanceof Error ? err.message : String(err),
        });
      });
      return job;
    },
  };
}

function buildSearchParams(
  query: string,
  options?: SearchOptions,
): URLSearchParams {
  const params = new URLSearchParams({ q: query });
  if (options?.maxResults !== undefined) {
    params.set("count", String(Math.min(options.maxResults, 20)));
  }
  if (options?.language) params.set("search_lang", options.language);
  if (options?.region) params.set("country", options.region);
  if (options?.safeSearch) params.set("safesearch", options.safeSearch);
  return params;
}

async function fetchBraveResults(
  endpoint: string,
  apiKey: string,
  params: URLSearchParams,
): Promise<Result<BraveApiResponse, string>> {
  const url = `${endpoint}?${params.toString()}`;

  let response: Response;
  try {
    response = await fetch(url, {
      headers: {
        "Accept": "application/json",
        "Accept-Encoding": "gzip",
        "X-Subscription-Token": apiKey,
      },
      signal: AbortSignal.timeout(15_000),
    });
  } catch (err) {
    return {
      ok: false,
      error: `Brave Search request failed: ${
        err instanceof Error ? err.message : String(err)
      }`,
    };
  }

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    log.warn("Brave Search API error", {
      operation: "fetchBraveResults",
      status: response.status,
      body: body.slice(0, 200),
      query: params.get("q"),
    });
    return {
      ok: false,
      error: `Brave Search API error ${response.status}: ${body}`,
    };
  }

  try {
    return { ok: true, value: (await response.json()) as BraveApiResponse };
  } catch {
    return { ok: false, error: "Failed to parse Brave Search response" };
  }
}

function parseBraveResults(
  query: string,
  data: BraveApiResponse,
): SearchResult {
  const items: SearchResultItem[] = (data.web?.results ?? [])
    .filter(
      (r): r is BraveWebResult & { title: string; url: string } =>
        typeof r.title === "string" && typeof r.url === "string",
    )
    .map((r) => ({
      title: r.title,
      url: r.url,
      snippet: r.description ?? "",
      ...(r.page_age ? { publishedDate: r.page_age } : {}),
    }));

  return {
    query,
    results: items,
    totalEstimate: data.web?.totalEstimatedMatches,
  };
}

// ─── Cloud Search Implementation ────────────────────────────────────────────

/** Configuration for the Triggerfish Cloud search provider. */
export interface CloudSearchConfig {
  /** Gateway base URL. Falls back to TRIGGERFISH_GATEWAY_URL env var. */
  readonly gatewayUrl?: string;
  /** License key. Falls back to TRIGGERFISH_LICENSE_KEY env var. */
  readonly licenseKey?: string;
}

/** Shape of the cloud search API response. */
interface CloudSearchResponse {
  readonly query?: string;
  readonly results?: readonly {
    readonly title?: string;
    readonly url?: string;
    readonly snippet?: string;
    readonly publishedDate?: string;
  }[];
  readonly totalEstimate?: number;
}

/**
 * Create a Triggerfish Cloud search provider.
 *
 * Routes search queries through the Triggerfish Cloud gateway's search proxy,
 * which provides Brave Search access using the subscriber's license key.
 *
 * @param config - Gateway URL and license key
 * @returns A SearchProvider backed by the Triggerfish Cloud gateway
 */
export function createCloudSearchProvider(
  config: CloudSearchConfig,
): SearchProvider {
  const gatewayUrl = config.gatewayUrl ??
    Deno.env.get("TRIGGERFISH_GATEWAY_URL") ??
    "https://api.trigger.fish";
  const licenseKey = config.licenseKey ??
    Deno.env.get("TRIGGERFISH_LICENSE_KEY") ?? "";
  const endpoint = `${gatewayUrl}/v1/search/web`;

  return {
    id: "cloud",
    name: "Triggerfish Cloud Search",

    async search(
      query: string,
      options?: SearchOptions,
    ): Promise<Result<SearchResult, string>> {
      if (query.trim().length === 0) {
        return { ok: false, error: "Search query cannot be empty" };
      }

      const body: Record<string, unknown> = { query };
      if (options?.maxResults !== undefined) {
        body.max_results = Math.min(options.maxResults, 20);
      }
      if (options?.language) body.language = options.language;
      if (options?.region) body.region = options.region;
      if (options?.safeSearch) body.safe_search = options.safeSearch;

      let response: Response;
      try {
        response = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${licenseKey}`,
          },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(15_000),
        });
      } catch (err) {
        return {
          ok: false,
          error: `Cloud search request failed: ${
            err instanceof Error ? err.message : String(err)
          }`,
        };
      }

      if (!response.ok) {
        const text = await response.text().catch(() => "");
        log.warn("Cloud Search API error", {
          operation: "cloudSearch",
          status: response.status,
          body: text.slice(0, 200),
          query,
        });
        return {
          ok: false,
          error: `Cloud Search API error ${response.status}: ${text}`,
        };
      }

      let data: CloudSearchResponse;
      try {
        data = (await response.json()) as CloudSearchResponse;
      } catch {
        return { ok: false, error: "Failed to parse Cloud Search response" };
      }

      const items: SearchResultItem[] = (data.results ?? [])
        .filter(
          (
            r,
          ): r is {
            readonly title: string;
            readonly url: string;
            readonly snippet?: string;
            readonly publishedDate?: string;
          } => typeof r.title === "string" && typeof r.url === "string",
        )
        .map((r) => ({
          title: r.title,
          url: r.url,
          snippet: r.snippet ?? "",
          ...(r.publishedDate ? { publishedDate: r.publishedDate } : {}),
        }));

      return {
        ok: true,
        value: {
          query,
          results: items,
          totalEstimate: data.totalEstimate,
        },
      };
    },
  };
}

// ─── Brave Search Implementation ────────────────────────────────────────────

/**
 * Create a Brave Search provider.
 *
 * @param config - API key and optional endpoint override
 * @returns A SearchProvider backed by the Brave Web Search API
 */
export function createBraveSearchProvider(
  config: BraveSearchConfig,
): SearchProvider {
  const endpoint = config.endpoint ??
    "https://api.search.brave.com/res/v1/web/search";

  return {
    id: "brave",
    name: "Brave Search",

    async search(
      query: string,
      options?: SearchOptions,
    ): Promise<Result<SearchResult, string>> {
      if (query.trim().length === 0) {
        return { ok: false, error: "Search query cannot be empty" };
      }

      const params = buildSearchParams(query, options);
      const fetchResult = await fetchBraveResults(
        endpoint,
        config.apiKey,
        params,
      );
      if (!fetchResult.ok) return fetchResult;

      return { ok: true, value: parseBraveResults(query, fetchResult.value) };
    },
  };
}
