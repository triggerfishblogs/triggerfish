/**
 * X (Twitter) integration module.
 *
 * Classification-enforced social media integration using X API v2.
 * OAuth 2.0 PKCE authentication, tier-aware tool availability,
 * per-endpoint rate limiting, and monthly quota tracking.
 *
 * @module
 */

// ─── Auth ────────────────────────────────────────────────────────────────────
export { createXAuthManager } from "./auth/mod.ts";
export { createXApiClient } from "./auth/mod.ts";

// ─── Client utilities ────────────────────────────────────────────────────────
export { createXRateLimiter } from "./client/mod.ts";
export { createXQuotaTracker } from "./client/mod.ts";

// ─── Services ────────────────────────────────────────────────────────────────
export { createPostsService } from "./posts/mod.ts";
export { createUsersService } from "./users/mod.ts";
export { createEngageService } from "./engage/mod.ts";
export { createListsService } from "./lists/mod.ts";

// ─── Tools ───────────────────────────────────────────────────────────────────
export {
  buildXToolDefinitions,
  createXToolExecutor,
  getXToolDefinitions,
  X_TOOLS_SYSTEM_PROMPT,
} from "./tools.ts";

// ─── Types ───────────────────────────────────────────────────────────────────
export type {
  EngageService,
  ListsService,
  PostsService,
  UsersService,
  XApiClient,
  XApiError,
  XApiResult,
  XApiTier,
  XAuthConfig,
  XAuthConsentResult,
  XAuthManager,
  XAuthResult,
  XBookmarkListOptions,
  XCreateListOptions,
  XCreatePostOptions,
  XFollowListOptions,
  XIntegrationConfig,
  XList,
  XListMembersOptions,
  XListPage,
  XMediaAttachment,
  XMediaUploadResult,
  XPost,
  XPostMetrics,
  XPostPage,
  XReferencedTweet,
  XSearchOptions,
  XTimelineOptions,
  XTokens,
  XToolContext,
  XUser,
  XUserMetrics,
  XUserPage,
  XUserPostsOptions,
} from "./types.ts";

export type { QuotaUsage, XQuotaTracker } from "./client/mod.ts";
export type { XRateLimiter } from "./client/mod.ts";
