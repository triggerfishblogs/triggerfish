/**
 * Authenticated HTTP client for X API v2.
 *
 * Wraps fetch with automatic Bearer token injection from the auth manager.
 * Reads rate limit headers from every response and feeds them to the
 * rate limiter. Retries once on 401 after refreshing the token.
 *
 * @module
 */

import { createLogger } from "../../../core/logger/logger.ts";
import type { XRateLimiter } from "../client/rate_limiter.ts";
import type {
  XApiClient,
  XApiResult,
  XAuthManager,
} from "./types_auth.ts";

const log = createLogger("x-client");

/** X API v2 base URL. */
const X_API_BASE = "https://api.twitter.com";

/** Build fetch RequestInit with Bearer auth header and optional JSON body. */
function buildXApiRequestInit(
  method: string,
  token: string,
  body?: unknown,
  opts?: { readonly raw?: boolean },
): RequestInit {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
  };
  const init: RequestInit = { method, headers };
  if (body !== undefined) {
    if (opts?.raw) {
      init.body = body as BodyInit;
    } else {
      headers["Content-Type"] = "application/json";
      init.body = JSON.stringify(body);
    }
  }
  return init;
}

/** Extract the endpoint path from a full URL for rate limit tracking. */
function extractEndpoint(url: string): string {
  try {
    const parsed = new URL(url, X_API_BASE);
    return parsed.pathname;
  } catch (_err: unknown) {
    log.warn("URL parse failed for rate limit tracking, using raw URL", {
      operation: "extractEndpoint",
      url,
    });
    return url;
  }
}

/** Parse an X API response into a Result. */
async function parseXApiResponse<T>(
  response: Response,
): Promise<XApiResult<T>> {
  if (!response.ok) {
    let errorMessage: string;
    let errorCode = `HTTP_${response.status}`;
    try {
      const errorData = await response.json();
      errorMessage = errorData?.detail ?? errorData?.title ??
        response.statusText;
      if (errorData?.type) {
        errorCode = errorData.type;
      }
    } catch (_err: unknown) {
      errorMessage = response.statusText;
    }

    const retryAfter = response.headers.get("retry-after");
    return {
      ok: false,
      error: {
        code: errorCode,
        message: errorMessage,
        status: response.status,
        retryAfterSeconds: retryAfter ? parseInt(retryAfter, 10) : undefined,
      },
    };
  }

  if (response.status === 204) {
    return { ok: true, value: {} as T };
  }

  const data = await response.json();
  return { ok: true, value: data as T };
}

/**
 * Create an authenticated X API v2 client.
 *
 * @param authManager - Provides access tokens with auto-refresh
 * @param rateLimiter - Tracks per-endpoint rate limits from response headers
 * @param opts - Optional overrides for fetch function and base URL
 */
export function createXApiClient(
  authManager: XAuthManager,
  rateLimiter: XRateLimiter,
  opts?: {
    readonly fetchFn?: typeof globalThis.fetch;
    readonly baseUrl?: string;
  },
): XApiClient {
  const fetchFn = opts?.fetchFn ?? globalThis.fetch;
  const baseUrl = opts?.baseUrl ?? X_API_BASE;

  async function request<T>(
    method: string,
    url: string,
    body?: unknown,
    params?: Record<string, string>,
    isRetry = false,
    requestOpts?: { readonly raw?: boolean },
  ): Promise<XApiResult<T>> {
    let fullUrl = url.startsWith("http") ? url : `${baseUrl}${url}`;
    if (params && Object.keys(params).length > 0) {
      fullUrl = `${fullUrl}?${new URLSearchParams(params).toString()}`;
    }

    const endpoint = extractEndpoint(fullUrl);

    const limitCheck = rateLimiter.checkLimit(endpoint);
    if (!limitCheck.ok) {
      return {
        ok: false,
        error: {
          code: "RATE_LIMITED",
          message: limitCheck.error.message,
          retryAfterSeconds: limitCheck.error.resetAt -
            Math.floor(Date.now() / 1000),
        },
      };
    }

    const tokenResult = await authManager.getAccessToken();
    if (!tokenResult.ok) return { ok: false, error: tokenResult.error };

    const init = buildXApiRequestInit(method, tokenResult.value, body, requestOpts);
    const response = await fetchFn(fullUrl, init);

    rateLimiter.recordResponse(endpoint, response.headers);

    if (response.status === 401 && !isRetry) {
      log.info("X API 401, forcing token refresh before retry", {
        operation: "xApiRequest",
        endpoint,
      });
      const refreshResult = await authManager.forceRefresh();
      if (!refreshResult.ok) return { ok: false, error: refreshResult.error };
      return request<T>(method, url, body, params, true, requestOpts);
    }

    if (response.status === 429) {
      const retryAfter = response.headers.get("retry-after");
      log.warn("X API rate limited by server", {
        operation: "xApiRequest",
        endpoint,
        retryAfter,
      });
    }

    return parseXApiResponse<T>(response);
  }

  return {
    get<T>(
      url: string,
      params?: Record<string, string>,
    ): Promise<XApiResult<T>> {
      return request<T>("GET", url, undefined, params);
    },

    post<T>(url: string, body: unknown): Promise<XApiResult<T>> {
      return request<T>("POST", url, body);
    },

    postRaw<T>(url: string, body: BodyInit): Promise<XApiResult<T>> {
      return request<T>("POST", url, body, undefined, false, { raw: true });
    },

    put<T>(url: string, body: unknown): Promise<XApiResult<T>> {
      return request<T>("PUT", url, body);
    },

    del<T>(url: string): Promise<XApiResult<T>> {
      return request<T>("DELETE", url);
    },
  };
}
