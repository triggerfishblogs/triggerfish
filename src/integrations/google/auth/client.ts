/**
 * Authenticated HTTP client for Google APIs.
 *
 * Wraps fetch with automatic Bearer token injection from the auth manager.
 * Retries once on 401 after refreshing the token.
 *
 * @module
 */

import type {
  GoogleApiClient,
  GoogleApiResult,
  GoogleAuthManager,
} from "../types.ts";

/** Build fetch RequestInit with auth header and optional JSON body. */
function buildGoogleApiRequestInit(
  method: string,
  token: string,
  body?: unknown,
): RequestInit {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
  };
  const init: RequestInit = { method, headers };
  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    init.body = JSON.stringify(body);
  }
  return init;
}

/** Parse a Google API response into a Result. Handles errors, 204, and JSON. */
async function parseGoogleApiResponse<T>(
  response: Response,
): Promise<GoogleApiResult<T>> {
  if (!response.ok) {
    let errorMessage: string;
    try {
      const errorData = await response.json();
      errorMessage = errorData?.error?.message ?? response.statusText;
    } catch {
      errorMessage = response.statusText;
    }
    return {
      ok: false,
      error: {
        code: `HTTP_${response.status}`,
        message: errorMessage,
        status: response.status,
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
 * Create an authenticated Google API client.
 *
 * @param authManager - Provides access tokens
 * @param fetchFn - Injectable fetch for testing (defaults to globalThis.fetch)
 */
export function createGoogleApiClient(
  authManager: GoogleAuthManager,
  fetchFn: typeof globalThis.fetch = globalThis.fetch,
): GoogleApiClient {
  async function request<T>(
    method: string,
    url: string,
    body?: unknown,
    params?: Record<string, string>,
    isRetry = false,
  ): Promise<GoogleApiResult<T>> {
    const tokenResult = await authManager.getAccessToken();
    if (!tokenResult.ok) return { ok: false, error: tokenResult.error };

    let fullUrl = url;
    if (params && Object.keys(params).length > 0) {
      fullUrl = `${url}?${new URLSearchParams(params).toString()}`;
    }

    const init = buildGoogleApiRequestInit(method, tokenResult.value, body);
    const response = await fetchFn(fullUrl, init);

    if (response.status === 401 && !isRetry) {
      return request<T>(method, url, body, params, true);
    }
    return parseGoogleApiResponse<T>(response);
  }

  return {
    get<T>(
      url: string,
      params?: Record<string, string>,
    ): Promise<GoogleApiResult<T>> {
      return request<T>("GET", url, undefined, params);
    },

    post<T>(url: string, body: unknown): Promise<GoogleApiResult<T>> {
      return request<T>("POST", url, body);
    },

    patch<T>(url: string, body: unknown): Promise<GoogleApiResult<T>> {
      return request<T>("PATCH", url, body);
    },

    put<T>(url: string, body: unknown): Promise<GoogleApiResult<T>> {
      return request<T>("PUT", url, body);
    },
  };
}
