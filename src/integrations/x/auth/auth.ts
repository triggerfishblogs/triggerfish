/**
 * X OAuth 2.0 PKCE authentication manager.
 *
 * Handles consent URL generation with PKCE code challenge,
 * authorization code exchange, token refresh, and secure token
 * storage via SecretStore.
 *
 * X OAuth 2.0 PKCE is for public clients — no client_secret is used.
 *
 * @module
 */

import type { SecretStore } from "../../../core/secrets/keychain/keychain.ts";
import { createLogger } from "../../../core/logger/logger.ts";
import { resolveAndCheck } from "../../../core/security/ssrf.ts";
import type {
  XAuthConfig,
  XAuthManager,
  XAuthResult,
  XTokens,
} from "./types_auth.ts";
import { buildConsentUrl } from "./auth_pkce.ts";

const log = createLogger("x-auth");

/** Key used in the SecretStore for X tokens. */
const TOKEN_KEY = "x:tokens";

/** Seconds before expiry to trigger a proactive refresh. */
const REFRESH_MARGIN_SECONDS = 60;

/** Validate and build XTokens from a raw API response, returning error Result on missing access_token. */
function buildTokensFromResponse(
  data: Record<string, unknown>,
  clientId: string,
  fallbackRefreshToken: string,
  operation: string,
): { ok: false; error: { code: string; message: string } } | { ok: true; value: string; tokens: XTokens } {
  if (typeof data.access_token !== "string" || !data.access_token) {
    log.error("X token response missing access_token", {
      operation,
      err: { keys: Object.keys(data) },
    });
    return {
      ok: false,
      error: {
        code: "TOKEN_EXCHANGE_FAILED",
        message: `X ${operation} succeeded but response missing access_token`,
      },
    };
  }
  const tokens: XTokens = {
    access_token: data.access_token,
    refresh_token: typeof data.refresh_token === "string"
      ? data.refresh_token
      : fallbackRefreshToken,
    expires_at: Date.now() +
      (typeof data.expires_in === "number" ? data.expires_in : 7200) * 1000,
    scope: (data.scope as string) ?? "",
    token_type: (data.token_type as string) ?? "Bearer",
    clientId,
  };
  return { ok: true, value: tokens.access_token, tokens };
}

/** X OAuth 2.0 token endpoint. */
const TOKEN_ENDPOINT = "https://api.twitter.com/2/oauth2/token";
const TOKEN_ENDPOINT_HOST = "api.twitter.com";

/** Run SSRF DNS check on the token endpoint, returning error Result on failure. */
async function checkTokenEndpointSsrf(operation: string): Promise<XAuthResult | null> {
  const dnsCheck = await resolveAndCheck(TOKEN_ENDPOINT_HOST);
  if (!dnsCheck.ok) {
    log.error("SSRF check failed for X token endpoint", { operation, err: dnsCheck.error });
    return { ok: false, error: { code: "SSRF_BLOCKED", message: dnsCheck.error } };
  }
  return null;
}

/** Exchange an authorization code for X OAuth 2.0 tokens. */
async function exchangeAuthorizationCode(
  code: string,
  config: XAuthConfig,
  codeVerifier: string,
  fetchFn: typeof globalThis.fetch,
  persistTokens: (tokens: XTokens) => Promise<void>,
): Promise<XAuthResult> {
  const body = new URLSearchParams({
    code,
    grant_type: "authorization_code",
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    code_verifier: codeVerifier,
  });

  log.info("Exchanging X authorization code", { operation: "exchangeXAuthCode" });

  const ssrfBlock = await checkTokenEndpointSsrf("exchangeXAuthCode");
  if (ssrfBlock) return ssrfBlock;

  const response = await fetchFn(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!response.ok) {
    const text = (await response.text()).slice(0, 200);
    log.error("X token exchange failed", {
      operation: "exchangeXAuthCode",
      err: { status: response.status, body: text },
    });
    return {
      ok: false,
      error: {
        code: "TOKEN_EXCHANGE_FAILED",
        message: `X token exchange failed (HTTP ${response.status})`,
        status: response.status,
      },
    };
  }

  let data: Record<string, unknown>;
  try {
    data = await response.json();
  } catch (parseErr: unknown) {
    log.error("X token exchange response JSON parse failed", {
      operation: "exchangeXAuthCode",
      err: parseErr,
    });
    return {
      ok: false,
      error: { code: "PARSE_FAILED", message: "X token response was not valid JSON" },
    };
  }
  const built = buildTokensFromResponse(data, config.clientId, "", "exchangeXAuthCode");
  if (!built.ok) return built;
  await persistTokens(built.tokens);
  log.info("X tokens stored successfully", { operation: "exchangeXAuthCode" });
  return { ok: true, value: built.value };
}

/** Refresh an expired X access token using the refresh token. */
async function refreshXAccessToken(
  tokens: XTokens,
  fetchFn: typeof globalThis.fetch,
  persistTokens: (tokens: XTokens) => Promise<void>,
): Promise<XAuthResult> {
  log.info("Refreshing X access token", { operation: "refreshXToken" });

  const ssrfBlock = await checkTokenEndpointSsrf("refreshXToken");
  if (ssrfBlock) return ssrfBlock;

  const body = new URLSearchParams({
    refresh_token: tokens.refresh_token,
    grant_type: "refresh_token",
    client_id: tokens.clientId,
  });

  const response = await fetchFn(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!response.ok) {
    const text = (await response.text()).slice(0, 200);
    log.error("X token refresh failed", {
      operation: "refreshXToken",
      err: { status: response.status, body: text },
    });
    if (response.status === 400 || response.status === 401) {
      return {
        ok: false,
        error: {
          code: "REFRESH_REVOKED",
          message: "X refresh token revoked or expired. Run 'triggerfish connect x' to reconnect.",
          status: response.status,
        },
      };
    }
    return {
      ok: false,
      error: {
        code: "REFRESH_FAILED",
        message: `X token refresh failed (HTTP ${response.status})`,
        status: response.status,
      },
    };
  }

  let data: Record<string, unknown>;
  try {
    data = await response.json();
  } catch (parseErr: unknown) {
    log.error("X token refresh response JSON parse failed", {
      operation: "refreshXToken",
      err: parseErr,
    });
    return {
      ok: false,
      error: { code: "PARSE_FAILED", message: "X refresh response was not valid JSON" },
    };
  }
  const built = buildTokensFromResponse(
    data,
    tokens.clientId,
    tokens.refresh_token,
    "refreshXToken",
  );
  if (!built.ok) return built;

  await persistTokens(built.tokens);
  log.info("X token refreshed successfully", { operation: "refreshXToken" });
  return { ok: true, value: built.value };
}

/** Load stored X tokens from the secret store. */
async function loadXTokens(secretStore: SecretStore): Promise<XTokens | null> {
  const result = await secretStore.getSecret(TOKEN_KEY);
  if (!result.ok) return null;
  try {
    return JSON.parse(result.value) as XTokens;
  } catch (err: unknown) {
    log.warn("X token JSON parse failed, clearing corrupt entry", {
      operation: "loadXTokens",
      err,
    });
    await secretStore.deleteSecret(TOKEN_KEY);
    return null;
  }
}

/**
 * Create an X OAuth 2.0 PKCE auth manager.
 *
 * @param secretStore - SecretStore for persisting tokens
 * @param fetchFn - Injectable fetch for testing (defaults to globalThis.fetch)
 */
export function createXAuthManager(
  secretStore: SecretStore,
  fetchFn: typeof globalThis.fetch = globalThis.fetch,
): XAuthManager {
  let refreshPromise: Promise<XAuthResult> | null = null;

  async function persistTokens(tokens: XTokens): Promise<void> {
    await secretStore.setSecret(TOKEN_KEY, JSON.stringify(tokens));
  }

  /** Deduplicated refresh — checks refresh_token, coalesces concurrent calls. */
  function doRefresh(stored: XTokens): Promise<XAuthResult> {
    if (!stored.refresh_token) {
      return Promise.resolve({
        ok: false,
        error: { code: "NO_REFRESH_TOKEN", message: "No X refresh token available. Reconnect X account." },
      });
    }
    if (refreshPromise) return refreshPromise;
    refreshPromise = refreshXAccessToken(stored, fetchFn, persistTokens);
    return refreshPromise.finally(() => { refreshPromise = null; });
  }

  return {
    getConsentUrl: buildConsentUrl,

    exchangeCode: (code, config, codeVerifier) =>
      exchangeAuthorizationCode(code, config, codeVerifier, fetchFn, persistTokens),

    async getAccessToken(): Promise<XAuthResult> {
      const stored = await loadXTokens(secretStore);
      if (!stored) {
        return { ok: false, error: { code: "NO_TOKENS", message: "No X tokens found. Run 'triggerfish connect x' to authenticate." } };
      }
      if (stored.expires_at > Date.now() + REFRESH_MARGIN_SECONDS * 1000) {
        return { ok: true, value: stored.access_token };
      }
      return doRefresh(stored);
    },

    async forceRefresh(): Promise<XAuthResult> {
      const stored = await loadXTokens(secretStore);
      if (!stored) {
        return { ok: false, error: { code: "NO_TOKENS", message: "No X tokens found. Run 'triggerfish connect x' to authenticate." } };
      }
      return doRefresh(stored);
    },

    storeTokens: persistTokens,

    async clearTokens(): Promise<void> {
      await secretStore.deleteSecret(TOKEN_KEY);
      await secretStore.deleteSecret("x:client_id");
    },

    async hasTokens(): Promise<boolean> {
      return (await secretStore.getSecret(TOKEN_KEY)).ok;
    },
  };
}
