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
  RateLimiter,
  ResolveRedditTokenOptions,
} from "./client.ts";

export {
  createRateLimiter,
  createRedditClient,
  redditContentClassification,
  resolveRedditToken,
} from "./client.ts";

export type { RedditToolContext } from "./tools.ts";

export {
  createRedditToolExecutor,
  formatRedditError,
  getRedditToolDefinitions,
  REDDIT_TOOLS_SYSTEM_PROMPT,
} from "./tools.ts";
