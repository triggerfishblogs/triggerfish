/**
 * Notion API HTTP client.
 *
 * All fetch() calls to the Notion REST API v1 live here. Provides
 * rate limiting, 429 retry with exponential backoff, and typed error
 * handling. Never throws — all paths return Result<T, NotionError>.
 *
 * @module
 */

import type { Result } from "../../core/types/classification.ts";
import { createLogger } from "../../core/logger/mod.ts";
import type { NotionError } from "./types.ts";

const log = createLogger("notion:client");

/** Configuration for the Notion HTTP client. */
export interface NotionClientConfig {
  readonly token: string;
  readonly apiVersion?: string;
  readonly baseUrl?: string;
  readonly fetchFn?: typeof fetch;
  readonly rateLimitPerSecond?: number;
}

/** Low-level Notion API client. */
export interface NotionClient {
  readonly request: <T>(
    method: string,
    path: string,
    body?: unknown,
  ) => Promise<Result<T, NotionError>>;
}

/** Default Notion API version. */
const DEFAULT_API_VERSION = "2022-06-28";

/** Default Notion API base URL. */
const DEFAULT_BASE_URL = "https://api.notion.com/v1";

/** Maximum retry attempts for 429 responses. */
const MAX_RETRIES = 3;

/** Base backoff delay in milliseconds. */
const BASE_BACKOFF_MS = 1000;

/** Build standard Notion API request headers. */
function buildNotionHeaders(
  token: string,
  apiVersion: string,
  hasBody: boolean,
): Record<string, string> {
  const headers: Record<string, string> = {
    "Authorization": `Bearer ${token}`,
    "Notion-Version": apiVersion,
  };
  if (hasBody) {
    headers["Content-Type"] = "application/json";
  }
  return headers;
}

/** Parse an error response from the Notion API. */
async function parseNotionErrorResponse(
  response: Response,
): Promise<NotionError> {
  try {
    const body = (await response.json()) as {
      code?: string;
      message?: string;
    };
    return {
      status: response.status,
      code: body.code ?? `http_${response.status}`,
      message: body.message ?? `HTTP ${response.status}`,
    };
  } catch (err) {
    log.warn("Notion API error response JSON parse failed", {
      operation: "parseNotionErrorResponse",
      status: response.status,
      err,
    });
    return {
      status: response.status,
      code: `http_${response.status}`,
      message: `HTTP ${response.status}`,
    };
  }
}

/** Calculate backoff delay with jitter. */
function calculateBackoffMs(attempt: number, retryAfterMs?: number): number {
  if (retryAfterMs && retryAfterMs > 0) {
    return retryAfterMs;
  }
  const base = BASE_BACKOFF_MS * Math.pow(2, attempt);
  const jitter = Math.random() * base * 0.5;
  return base + jitter;
}

/** Extract Retry-After header value in milliseconds. */
function extractRetryAfterMs(response: Response): number | undefined {
  const retryAfter = response.headers.get("Retry-After");
  if (!retryAfter) return undefined;
  const seconds = Number(retryAfter);
  return isNaN(seconds) ? undefined : seconds * 1000;
}

/** Sleep for the given number of milliseconds. */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Create a rate-limited Notion API client.
 *
 * Rate limiting uses a minimum-interval pattern: each request waits
 * until enough time has passed since the previous request to stay
 * within the configured requests-per-second limit.
 */
export function createNotionClient(config: NotionClientConfig): NotionClient {
  const baseUrl = config.baseUrl ?? DEFAULT_BASE_URL;
  const apiVersion = config.apiVersion ?? DEFAULT_API_VERSION;
  const doFetch = config.fetchFn ?? fetch;
  const rateLimitMs = 1000 / (config.rateLimitPerSecond ?? 3);
  let lastRequestTime = 0;

  /** Enforce minimum interval between requests. */
  async function waitForRateLimit(): Promise<void> {
    const now = Date.now();
    const elapsed = now - lastRequestTime;
    lastRequestTime = now;
    if (elapsed < rateLimitMs) {
      await sleep(rateLimitMs - elapsed);
    }
  }

  /** Send a single HTTP request to the Notion API. */
  async function sendRequest<T>(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<Result<T, NotionError>> {
    const url = `${baseUrl}${path}`;
    const headers = buildNotionHeaders(config.token, apiVersion, !!body);

    let response: Response;
    try {
      response = await doFetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });
    } catch (err) {
      log.error("Notion API network request failed", { operation: "sendRequest", url, err });
      return {
        ok: false,
        error: {
          status: 0,
          code: "network_error",
          message: `Notion API request failed: ${
            err instanceof Error ? err.message : String(err)
          }`,
        },
      };
    }

    if (response.status === 429) {
      log.warn("Notion API rate limited", { operation: "sendRequest", url, status: 429 });
      return {
        ok: false,
        error: {
          status: 429,
          code: "rate_limited",
          message: "Rate limited by Notion API",
          retryAfterMs: extractRetryAfterMs(response),
        },
      };
    }

    if (!response.ok) {
      const error = await parseNotionErrorResponse(response);
      return { ok: false, error };
    }

    if (response.status === 204) {
      return { ok: true, value: undefined as unknown as T };
    }

    try {
      const data = (await response.json()) as T;
      return { ok: true, value: data };
    } catch {
      return {
        ok: false,
        error: {
          status: response.status,
          code: "parse_error",
          message: "Notion API response JSON parse failed",
        },
      };
    }
  }

  /** Send a request with automatic 429 retry and rate limiting. */
  async function requestWithRetry<T>(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<Result<T, NotionError>> {
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      await waitForRateLimit();
      const result = await sendRequest<T>(method, path, body);

      if (result.ok || result.error.code !== "rate_limited") {
        return result;
      }

      if (attempt < MAX_RETRIES) {
        const retryAfterMs = result.error.retryAfterMs;
        const backoff = calculateBackoffMs(attempt, retryAfterMs);
        log.warn("Notion API rate limited, retrying", {
          operation: "requestWithRetry",
          attempt,
          backoffMs: backoff,
        });
        await sleep(backoff);
      }
    }

    return {
      ok: false,
      error: {
        status: 429,
        code: "rate_limited",
        message: "Notion API rate limit exceeded after maximum retries",
      },
    };
  }

  return {
    request: requestWithRetry,
  };
}

/** Format a Notion API error into a user-friendly string. */
export function formatNotionError(error: NotionError): string {
  if (error.code === "unauthorized" || error.status === 401) {
    return "Notion authentication failed. Run: triggerfish connect notion";
  }
  if (error.code === "object_not_found" || error.status === 404) {
    return `Notion resource not found. Ensure the page/database is shared with your integration.`;
  }
  if (error.code === "rate_limited" || error.status === 429) {
    return "Notion API rate limit exceeded. Try again in a moment.";
  }
  if (error.code === "network_error") {
    return `Notion API network error: ${error.message}`;
  }
  return `Notion API error (${error.status}): ${error.message}`;
}
