/**
 * Brave Search provider implementation.
 *
 * Wraps the Brave Web Search API behind the SearchProvider interface.
 * Includes request building, response parsing, and HTTP error handling.
 *
 * @module
 */

import type { Result } from "../../core/types/classification.ts";
import { createLogger } from "../../core/logger/logger.ts";
import type {
  SearchOptions,
  SearchProvider,
  SearchResult,
  SearchResultItem,
} from "./search_types.ts";

const log = createLogger("search");

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

/** Build URL search params from query and options. */
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

/** Execute a Brave Search API request and return the raw response. */
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

/** Parse a Brave API response into a SearchResult. */
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
