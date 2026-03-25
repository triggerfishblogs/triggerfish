/**
 * X OAuth 2.0 PKCE authentication module.
 *
 * Auth manager, API client, and token types.
 *
 * @module
 */

export type {
  XApiClient,
  XApiError,
  XApiResult,
  XApiTier,
  XAuthConfig,
  XAuthConsentResult,
  XAuthManager,
  XAuthResult,
  XTokens,
} from "./types_auth.ts";

export { createXAuthManager } from "./auth.ts";

export { createXApiClient } from "./client.ts";

export { verifyAndStoreXUser } from "./user_verify.ts";
