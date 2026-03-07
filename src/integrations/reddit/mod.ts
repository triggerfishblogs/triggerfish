/**
 * Reddit integration — OAuth2 API access with classification-gated taint propagation.
 *
 * Provides tools for reading subreddits, posts, comments, mod queues, and user info.
 * Content type maps to classification levels (public_content->PUBLIC,
 * modqueue/modlog->INTERNAL, user_pii->CONFIDENTIAL).
 *
 * @module
 */

export type {
  PostSort,
  RedditComment,
  RedditContentType,
  RedditError,
  RedditModAction,
  RedditModQueueItem,
  RedditPost,
  RedditRule,
  RedditSubreddit,
  RedditTokens,
  RedditUser,
  TimeFilter,
} from "./types.ts";

export type {
  RedditClient,
  RedditClientConfig,
} from "./client.ts";

export {
  createRedditClient,
  redditContentClassification,
} from "./client.ts";

export type { RateLimiter } from "./rate_limiter.ts";

export { createRateLimiter } from "./rate_limiter.ts";

export type { ResolveRedditTokenOptions } from "./api.ts";

export { resolveRedditToken } from "./api.ts";

export type { RedditToolContext } from "./tools.ts";

export {
  createRedditToolExecutor,
  formatRedditError,
  getRedditToolDefinitions,
  REDDIT_TOOLS_SYSTEM_PROMPT,
} from "./tools.ts";
