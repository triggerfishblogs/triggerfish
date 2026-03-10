/**
 * Reddit API request helpers and OAuth2 token management.
 *
 * Handles token refresh, authenticated API requests, and credential
 * resolution from the OS keychain.
 *
 * @module
 */

import type { Result } from "../../core/types/classification.ts";
import type { RedditError } from "./types.ts";
import type { SecretStore } from "../../core/secrets/keychain/keychain.ts";
import type { RateLimiter } from "./rate_limiter.ts";

// ─── Auth ────────────────────────────────────────────────────────────────────

/** Options for resolving Reddit OAuth2 credentials. */
export interface ResolveRedditTokenOptions {
  readonly secretStore: SecretStore;
}

/**
 * Resolve Reddit OAuth2 credentials from the OS keychain.
 *
 * Returns an error with setup instructions if the secret is not stored.
 */
export async function resolveRedditToken(
  options: ResolveRedditTokenOptions,
): Promise<Result<string, string>> {
  const keychainResult = await options.secretStore.getSecret("reddit-token");
  if (keychainResult.ok) {
    return { ok: true, value: keychainResult.value };
  }

  return {
    ok: false,
    error: "Reddit token not found in keychain. Run:\n" +
      "  triggerfish connect reddit",
  };
}

// ─── Token Refresh ───────────────────────────────────────────────────────────

/** @internal Token state managed by the client. */
export interface TokenState {
  accessToken: string;
  expiresAt: number;
}

/** Options for refreshing a Reddit OAuth2 access token. */
export interface RefreshTokenOptions {
  readonly clientId: string;
  readonly clientSecret: string;
  readonly refreshToken: string;
  readonly fetchFn: typeof fetch;
  readonly baseTokenUrl: string;
}

function buildTokenRequest(
  opts: RefreshTokenOptions,
): { url: string; init: RequestInit } {
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: opts.refreshToken,
  });

  return {
    url: `${opts.baseTokenUrl}/api/v1/access_token`,
    init: {
      method: "POST",
      headers: {
        "Authorization": `Basic ${
          btoa(`${opts.clientId}:${opts.clientSecret}`)
        }`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
    },
  };
}

function parseTokenResponse(
  data: { access_token: string; expires_in: number },
): TokenState {
  return {
    accessToken: data.access_token,
    expiresAt: Date.now() + (data.expires_in * 1000) - 30_000,
  };
}

function wrapNetworkError(
  err: unknown,
  context: string,
): Result<never, RedditError> {
  return {
    ok: false,
    error: {
      status: 0,
      message: `${context}: ${
        err instanceof Error ? err.message : String(err)
      }`,
    },
  };
}

/** Refresh the OAuth2 access token using the refresh token. */
export async function refreshAccessToken(
  opts: RefreshTokenOptions,
): Promise<Result<TokenState, RedditError>> {
  const { url, init } = buildTokenRequest(opts);

  try {
    const response = await opts.fetchFn(url, init);
    if (!response.ok) {
      return {
        ok: false,
        error: {
          status: response.status,
          message: `Token refresh failed: HTTP ${response.status}`,
        },
      };
    }
    const data = await response.json() as {
      access_token: string;
      expires_in: number;
    };
    return { ok: true, value: parseTokenResponse(data) };
  } catch (err) {
    return wrapNetworkError(err, "Token refresh network error");
  }
}

// ─── API Request ─────────────────────────────────────────────────────────────

/** Options for sending an authenticated Reddit API request. */
export interface RedditApiRequestOptions {
  readonly fetchFn: typeof fetch;
  readonly baseUrl: string;
  readonly accessToken: string;
  readonly username: string;
  readonly clientId: string;
  readonly path: string;
  readonly rateLimiter: RateLimiter;
}

function buildApiHeaders(
  opts: RedditApiRequestOptions,
): Record<string, string> {
  return {
    "Authorization": `Bearer ${opts.accessToken}`,
    "User-Agent": `triggerfish:${opts.clientId}:1.0.0 (by /u/${opts.username})`,
  };
}

/** Send an authenticated GET request to the Reddit API. */
export async function sendRedditApiRequest<T>(
  opts: RedditApiRequestOptions,
): Promise<Result<T, RedditError>> {
  await opts.rateLimiter.waitForSlot();

  try {
    const response = await opts.fetchFn(`${opts.baseUrl}${opts.path}`, {
      method: "GET",
      headers: buildApiHeaders(opts),
    });

    if (!response.ok) return parseApiErrorResponse(response);
    const data = (await response.json()) as T;
    return { ok: true, value: data };
  } catch (err) {
    return wrapNetworkError(err, "Reddit API request failed");
  }
}

async function parseApiErrorResponse<T>(
  response: Response,
): Promise<Result<T, RedditError>> {
  const remaining = response.headers.get("x-ratelimit-remaining")
    ? Number(response.headers.get("x-ratelimit-remaining"))
    : undefined;
  const reset = response.headers.get("x-ratelimit-reset")
    ? Number(response.headers.get("x-ratelimit-reset"))
    : undefined;

  let message: string;
  try {
    const body = (await response.json()) as {
      message?: string;
      error?: string;
    };
    message = body.message ?? body.error ?? `HTTP ${response.status}`;
  } catch {
    message = `HTTP ${response.status}`;
  }

  return {
    ok: false,
    error: {
      status: response.status,
      message,
      rateLimitRemaining: remaining,
      rateLimitReset: reset,
    },
  };
}
