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

/** Refresh the OAuth2 access token using the refresh token. */
export async function refreshAccessToken(
  clientId: string,
  clientSecret: string,
  refreshToken: string,
  doFetch: typeof fetch,
  baseTokenUrl: string,
): Promise<Result<TokenState, RedditError>> {
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });

  try {
    const response = await doFetch(`${baseTokenUrl}/api/v1/access_token`, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
    });

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

    return {
      ok: true,
      value: {
        accessToken: data.access_token,
        expiresAt: Date.now() + (data.expires_in * 1000) - 30_000,
      },
    };
  } catch (err) {
    return {
      ok: false,
      error: {
        status: 0,
        message: `Token refresh network error: ${
          err instanceof Error ? err.message : String(err)
        }`,
      },
    };
  }
}

// ─── API Request ─────────────────────────────────────────────────────────────

/** Send an authenticated GET request to the Reddit API. */
export async function sendRedditApiRequest<T>(
  doFetch: typeof fetch,
  baseUrl: string,
  accessToken: string,
  username: string,
  clientId: string,
  path: string,
  rateLimiter: RateLimiter,
): Promise<Result<T, RedditError>> {
  await rateLimiter.waitForSlot();

  try {
    const response = await doFetch(`${baseUrl}${path}`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "User-Agent": `triggerfish:${clientId}:1.0.0 (by /u/${username})`,
      },
    });

    if (!response.ok) {
      return parseApiErrorResponse(response);
    }

    const data = (await response.json()) as T;
    return { ok: true, value: data };
  } catch (err) {
    return {
      ok: false,
      error: {
        status: 0,
        message: `Reddit API request failed: ${
          err instanceof Error ? err.message : String(err)
        }`,
      },
    };
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
    const body = (await response.json()) as { message?: string; error?: string };
    message = body.message ?? body.error ?? `HTTP ${response.status}`;
  } catch {
    message = `HTTP ${response.status}`;
  }

  return {
    ok: false,
    error: { status: response.status, message, rateLimitRemaining: remaining, rateLimitReset: reset },
  };
}
