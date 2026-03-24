/**
 * X integration type re-exports.
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
} from "./auth/types_auth.ts";

export type {
  PostsService,
  XCreatePostOptions,
  XMediaAttachment,
  XMediaUploadResult,
  XPost,
  XPostMetrics,
  XPostPage,
  XReferencedTweet,
  XSearchOptions,
  XTimelineOptions,
  XUserPostsOptions,
} from "./posts/types_posts.ts";

export type {
  UsersService,
  XFollowListOptions,
  XUser,
  XUserMetrics,
  XUserPage,
} from "./users/types_users.ts";

export type {
  EngageService,
  XBookmarkListOptions,
} from "./engage/types_engage.ts";

export type {
  ListsService,
  XCreateListOptions,
  XList,
  XListMembersOptions,
  XListPage,
} from "./lists/types_lists.ts";

export type { XToolContext } from "./tools_shared.ts";
