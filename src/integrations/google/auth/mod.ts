/**
 * Google OAuth2 authentication module.
 *
 * Auth manager, API client, token types, and tool context.
 *
 * @module
 */

export type {
  GoogleAuthConfig,
  GoogleAuthManager,
  GoogleAuthResult,
  GoogleTokens,
  GoogleApiClient,
  GoogleApiResult,
  GoogleApiError,
} from "./types_auth.ts";

export type { GoogleToolContext } from "./types_context.ts";

export { createGoogleAuthManager } from "./auth.ts";

export { createGoogleApiClient } from "./client.ts";
