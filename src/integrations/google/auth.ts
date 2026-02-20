/**
 * Google OAuth2 authentication manager.
 *
 * Handles consent URL generation, authorization code exchange,
 * token refresh, and secure token storage via SecretStore.
 *
 * @module
 */

import type { SecretStore } from "../../core/secrets/keychain.ts";
import type {
  GoogleAuthConfig,
  GoogleAuthManager,
  GoogleAuthResult,
  GoogleTokens,
} from "./types.ts";

/** Key used in the SecretStore for Google tokens. */
const TOKEN_KEY = "google:tokens";

/** Seconds before expiry to trigger a proactive refresh. */
const REFRESH_MARGIN_SECONDS = 60;

/** Google OAuth2 token endpoint. */
const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";

/** Google OAuth2 authorization endpoint. */
const AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";

/**
 * Create a Google OAuth2 auth manager.
 *
 * @param secretStore - SecretStore for persisting tokens
 * @param fetchFn - Injectable fetch for testing (defaults to globalThis.fetch)
 */
export function createGoogleAuthManager(
  secretStore: SecretStore,
  fetchFn: typeof globalThis.fetch = globalThis.fetch,
): GoogleAuthManager {
  // Single in-flight refresh promise to prevent duplicate refreshes
  let refreshPromise: Promise<GoogleAuthResult> | null = null;

  function getConsentUrl(config: GoogleAuthConfig): string {
    const params = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: config.redirectUri,
      response_type: "code",
      scope: config.scopes.join(" "),
      access_type: "offline",
      prompt: "consent",
    });
    return `${AUTH_ENDPOINT}?${params.toString()}`;
  }

  async function exchangeCode(
    code: string,
    config: GoogleAuthConfig,
  ): Promise<GoogleAuthResult> {
    const body = new URLSearchParams({
      code,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: config.redirectUri,
      grant_type: "authorization_code",
    });

    const response = await fetchFn(TOKEN_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });

    if (!response.ok) {
      const text = await response.text();
      return {
        ok: false,
        error: {
          code: "TOKEN_EXCHANGE_FAILED",
          message: `Token exchange failed (${response.status}): ${text}`,
          status: response.status,
        },
      };
    }

    const data = await response.json();
    const tokens: GoogleTokens = {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_at: Date.now() + (data.expires_in ?? 3600) * 1000,
      scope: data.scope ?? "",
      token_type: data.token_type ?? "Bearer",
      clientId: config.clientId,
      clientSecret: config.clientSecret,
    };

    await storeTokens(tokens);
    return { ok: true, value: tokens.access_token };
  }

  async function getAccessToken(): Promise<GoogleAuthResult> {
    const stored = await loadTokens();
    if (!stored) {
      return {
        ok: false,
        error: {
          code: "NO_TOKENS",
          message:
            "No Google tokens found. Run 'triggerfish connect google' to authenticate.",
        },
      };
    }

    // Check if token is still valid (with margin)
    const now = Date.now();
    if (stored.expires_at > now + REFRESH_MARGIN_SECONDS * 1000) {
      return { ok: true, value: stored.access_token };
    }

    // Token expired or expiring soon — refresh
    if (!stored.refresh_token) {
      return {
        ok: false,
        error: {
          code: "NO_REFRESH_TOKEN",
          message: "No refresh token available. Reconnect Google account.",
        },
      };
    }

    // Deduplicate concurrent refresh calls
    if (refreshPromise) {
      return refreshPromise;
    }

    refreshPromise = refreshAccessToken(stored);
    try {
      return await refreshPromise;
    } finally {
      refreshPromise = null;
    }
  }

  async function refreshAccessToken(
    tokens: GoogleTokens,
  ): Promise<GoogleAuthResult> {
    const clientId = tokens.clientId;
    const clientSecret = tokens.clientSecret;

    const body = new URLSearchParams({
      refresh_token: tokens.refresh_token,
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "refresh_token",
    });

    const response = await fetchFn(TOKEN_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });

    if (!response.ok) {
      const text = await response.text();
      if (response.status === 400 || response.status === 401) {
        return {
          ok: false,
          error: {
            code: "REFRESH_REVOKED",
            message:
              "Google refresh token revoked or expired. Run 'triggerfish connect google' to reconnect.",
            status: response.status,
          },
        };
      }
      return {
        ok: false,
        error: {
          code: "REFRESH_FAILED",
          message: `Token refresh failed (${response.status}): ${text}`,
          status: response.status,
        },
      };
    }

    const data = await response.json();
    const updated: GoogleTokens = {
      access_token: data.access_token,
      refresh_token: tokens.refresh_token, // Google may not return a new refresh token
      expires_at: Date.now() + (data.expires_in ?? 3600) * 1000,
      scope: data.scope ?? tokens.scope,
      token_type: data.token_type ?? "Bearer",
      clientId: tokens.clientId,
      clientSecret: tokens.clientSecret,
    };

    await storeTokens(updated);
    return { ok: true, value: updated.access_token };
  }

  async function storeTokens(tokens: GoogleTokens): Promise<void> {
    await secretStore.setSecret(TOKEN_KEY, JSON.stringify(tokens));
  }

  async function clearTokens(): Promise<void> {
    await secretStore.deleteSecret(TOKEN_KEY);
  }

  async function hasTokens(): Promise<boolean> {
    const result = await secretStore.getSecret(TOKEN_KEY);
    return result.ok;
  }

  async function loadTokens(): Promise<GoogleTokens | null> {
    const result = await secretStore.getSecret(TOKEN_KEY);
    if (!result.ok) return null;
    try {
      return JSON.parse(result.value) as GoogleTokens;
    } catch {
      return null;
    }
  }

  return {
    getConsentUrl,
    exchangeCode,
    getAccessToken,
    storeTokens,
    clearTokens,
    hasTokens,
  };
}
