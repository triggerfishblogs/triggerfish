/**
 * X (Twitter) OAuth 2.0 PKCE authentication types.
 *
 * Configuration, token storage, auth manager interface, and result types
 * for X API v2 authentication flows.
 *
 * @module
 */

// ─── Auth ────────────────────────────────────────────────────────────────────

/** OAuth 2.0 PKCE client configuration for X API. */
export interface XAuthConfig {
  readonly clientId: string;
  readonly redirectUri: string;
  readonly scopes: readonly string[];
}

/**
 * OAuth 2.0 tokens stored in the secret store.
 *
 * X OAuth 2.0 PKCE does not use a client_secret (public client).
 * The refresh_token has no expiry but can be revoked by the user.
 */
export interface XTokens {
  readonly access_token: string;
  readonly refresh_token: string;
  readonly expires_at: number;
  readonly scope: string;
  readonly token_type: string;
  readonly clientId: string;
}

/** X auth manager for obtaining and refreshing OAuth 2.0 PKCE tokens. */
export interface XAuthManager {
  /** Build the X OAuth 2.0 PKCE consent URL for user authorization. */
  readonly getConsentUrl: (config: XAuthConfig) => Promise<XAuthConsentResult>;
  /** Exchange an authorization code for tokens (includes PKCE code_verifier). */
  readonly exchangeCode: (
    code: string,
    config: XAuthConfig,
    codeVerifier: string,
  ) => Promise<XAuthResult>;
  /** Get a valid access token, refreshing if needed. */
  readonly getAccessToken: () => Promise<XAuthResult>;
  /** Force a token refresh regardless of expiry. Use after server-side revocation (401). */
  readonly forceRefresh: () => Promise<XAuthResult>;
  /** Store tokens in the secret store. */
  readonly storeTokens: (tokens: XTokens) => Promise<void>;
  /** Clear stored tokens. */
  readonly clearTokens: () => Promise<void>;
  /** Check if tokens are stored. */
  readonly hasTokens: () => Promise<boolean>;
}

/** Result of a consent URL generation — includes the code_verifier for PKCE. */
export type XAuthConsentResult =
  | {
    readonly ok: true;
    readonly value: {
      readonly url: string;
      readonly codeVerifier: string;
      readonly state: string;
    };
  }
  | { readonly ok: false; readonly error: XApiError };

/** Result of an auth operation — either a token string or an error. */
export type XAuthResult =
  | { readonly ok: true; readonly value: string }
  | { readonly ok: false; readonly error: XApiError };

// ─── API Client ──────────────────────────────────────────────────────────────

/** Authenticated HTTP client for X API v2. */
export interface XApiClient {
  /** HTTP GET with query parameters. */
  readonly get: <T>(
    url: string,
    params?: Record<string, string>,
  ) => Promise<XApiResult<T>>;
  /** HTTP POST with JSON body. */
  readonly post: <T>(
    url: string,
    body: unknown,
  ) => Promise<XApiResult<T>>;
  /** HTTP POST with raw body (FormData, streams, etc.) — no JSON serialization. */
  readonly postRaw: <T>(
    url: string,
    body: BodyInit,
  ) => Promise<XApiResult<T>>;
  /** HTTP PUT with JSON body. */
  readonly put: <T>(
    url: string,
    body: unknown,
  ) => Promise<XApiResult<T>>;
  /** HTTP DELETE. */
  readonly del: <T>(
    url: string,
  ) => Promise<XApiResult<T>>;
}

/** Result of an X API call. */
export type XApiResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: XApiError };

/** Error from an X API call. */
export interface XApiError {
  readonly code: string;
  readonly message: string;
  readonly status?: number;
  /** Seconds until the rate limit resets (from X response headers). */
  readonly retryAfterSeconds?: number;
}

// ─── Configuration ───────────────────────────────────────────────────────────

/** X API pricing tier. Determines tool availability and rate limits. */
export type XApiTier = "free" | "basic" | "pro" | "pay_per_use";
