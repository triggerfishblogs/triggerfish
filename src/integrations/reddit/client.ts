/**
 * Reddit REST API client.
 *
 * Wraps the Reddit OAuth2 API with typed methods that return `Result<T, RedditError>`.
 * Supports `fetchFn` injection for testing. Enforces 60 requests/minute rate limit.
 * Classification is derived from content type via `redditContentClassification()`.
 *
 * @module
 */

import type { Result } from "../../core/types/classification.ts";
import type {
  RedditComment,
  RedditError,
  RedditModAction,
  RedditModQueueItem,
  RedditPost,
  RedditRule,
  RedditSubreddit,
  RedditUser,
  PostSort,
  TimeFilter,
} from "./types.ts";
import type { RateLimiter } from "./rate_limiter.ts";
import { createRateLimiter } from "./rate_limiter.ts";
import type { TokenState } from "./api.ts";
import { refreshAccessToken, sendRedditApiRequest } from "./api.ts";
import {
  mapComment,
  mapModAction,
  mapModQueueItem,
  mapPost,
  mapUser,
  redditContentClassification,
  type RawCommentChild,
  type RawModAction,
  type RawModQueueItem,
  type RawPost,
  type RawRule,
  type RawSubreddit,
  type RawUser,
} from "./mappers.ts";

// Re-export for backwards compatibility with barrel imports
export { redditContentClassification } from "./mappers.ts";
export { createRateLimiter } from "./rate_limiter.ts";
export type { RateLimiter } from "./rate_limiter.ts";
export { resolveRedditToken } from "./api.ts";
export type { ResolveRedditTokenOptions } from "./api.ts";

/** Configuration for creating a Reddit client. */
export interface RedditClientConfig {
  readonly clientId: string;
  readonly clientSecret: string;
  readonly refreshToken: string;
  readonly username: string;
  readonly baseUrl?: string;
  readonly fetchFn?: typeof fetch;
  readonly rateLimiter?: RateLimiter;
}

/** Reddit API client interface. */
export interface RedditClient {
  readonly fetchSubredditInfo: (
    subreddit: string,
  ) => Promise<Result<RedditSubreddit, RedditError>>;
  readonly fetchPosts: (
    subreddit: string,
    opts?: {
      readonly sort?: PostSort;
      readonly limit?: number;
      readonly time?: TimeFilter;
    },
  ) => Promise<Result<readonly RedditPost[], RedditError>>;
  readonly fetchPost: (
    postId: string,
  ) => Promise<Result<{ readonly post: RedditPost; readonly comments: readonly RedditComment[] }, RedditError>>;
  readonly fetchModQueue: (
    subreddit: string,
    opts?: { readonly limit?: number },
  ) => Promise<Result<readonly RedditModQueueItem[], RedditError>>;
  readonly fetchModLog: (
    subreddit: string,
    opts?: { readonly limit?: number },
  ) => Promise<Result<readonly RedditModAction[], RedditError>>;
  readonly fetchUserInfo: (
    username: string,
  ) => Promise<Result<RedditUser, RedditError>>;
}

// ─── Token Management ────────────────────────────────────────────────────────

function createTokenManager(
  config: RedditClientConfig,
  doFetch: typeof fetch,
  tokenUrl: string,
) {
  let tokenState: TokenState = { accessToken: "", expiresAt: 0 };

  return {
    async ensureAccessToken(): Promise<Result<string, RedditError>> {
      if (tokenState.accessToken && Date.now() < tokenState.expiresAt) {
        return { ok: true, value: tokenState.accessToken };
      }

      const refreshResult = await refreshAccessToken(
        config.clientId,
        config.clientSecret,
        config.refreshToken,
        doFetch,
        tokenUrl,
      );

      if (!refreshResult.ok) return refreshResult;
      tokenState = refreshResult.value;
      return { ok: true, value: tokenState.accessToken };
    },
  };
}

// ─── Client Factory ──────────────────────────────────────────────────────────

/**
 * Create a Reddit API client.
 *
 * @param config - Client ID, secret, refresh token, username, optional base URL and fetch function
 * @returns A RedditClient with all 6 read API methods
 */
export function createRedditClient(config: RedditClientConfig): RedditClient {
  const baseUrl = config.baseUrl ?? "https://oauth.reddit.com";
  const doFetch = config.fetchFn ?? fetch;
  const rateLimiter = config.rateLimiter ?? createRateLimiter();
  const tokens = createTokenManager(config, doFetch, "https://www.reddit.com");

  async function apiGet<T>(path: string): Promise<Result<T, RedditError>> {
    const tokenResult = await tokens.ensureAccessToken();
    if (!tokenResult.ok) return tokenResult;

    return sendRedditApiRequest<T>(
      doFetch,
      baseUrl,
      tokenResult.value,
      config.username,
      config.clientId,
      path,
      rateLimiter,
    );
  }

  return {
    fetchSubredditInfo: (subreddit) => fetchSubredditInfo(apiGet, subreddit),
    fetchPosts: (subreddit, opts) => fetchPosts(apiGet, subreddit, opts),
    fetchPost: (postId) => fetchPostWithComments(apiGet, postId),
    fetchModQueue: (subreddit, opts) => fetchModQueue(apiGet, subreddit, opts),
    fetchModLog: (subreddit, opts) => fetchModLog(apiGet, subreddit, opts),
    fetchUserInfo: (username) => fetchUserInfo(apiGet, username),
  };
}

// ─── Method Implementations ─────────────────────────────────────────────────

type ApiGet = <T>(path: string) => Promise<Result<T, RedditError>>;

async function fetchSubredditInfo(
  apiGet: ApiGet,
  subreddit: string,
): Promise<Result<RedditSubreddit, RedditError>> {
  const encoded = encodeURIComponent(subreddit);
  const aboutResult = await apiGet<{ data: RawSubreddit }>(`/r/${encoded}/about`);
  if (!aboutResult.ok) return aboutResult;

  const rulesResult = await apiGet<{ rules: readonly RawRule[] }>(`/r/${encoded}/about/rules`);
  const rawRules = rulesResult.ok ? rulesResult.value.rules : undefined;
  const rules: RedditRule[] = rawRules
    ? rawRules.map((r) => ({ shortName: r.short_name, description: r.description }))
    : [];

  const raw = aboutResult.value.data;
  return {
    ok: true,
    value: {
      name: raw.display_name,
      title: raw.title,
      description: raw.public_description,
      subscribers: raw.subscribers,
      activeUsers: raw.accounts_active,
      subredditType: raw.subreddit_type,
      rules,
      classification: redditContentClassification("public_content"),
    },
  };
}

async function fetchPosts(
  apiGet: ApiGet,
  subreddit: string,
  opts?: { readonly sort?: PostSort; readonly limit?: number; readonly time?: TimeFilter },
): Promise<Result<readonly RedditPost[], RedditError>> {
  const sort = opts?.sort ?? "hot";
  const params = new URLSearchParams({ limit: String(opts?.limit ?? 25), t: opts?.time ?? "day" });

  type Listing = { data: { children: readonly { data: RawPost }[] } };
  const result = await apiGet<Listing>(`/r/${encodeURIComponent(subreddit)}/${sort}?${params}`);
  if (!result.ok) return result;

  return { ok: true, value: result.value.data.children.map((c) => mapPost(c.data)) };
}

async function fetchPostWithComments(
  apiGet: ApiGet,
  postId: string,
): Promise<Result<{ readonly post: RedditPost; readonly comments: readonly RedditComment[] }, RedditError>> {
  type PostResponse = readonly [
    { data: { children: readonly { data: RawPost }[] } },
    { data: { children: readonly RawCommentChild[] } },
  ];

  const result = await apiGet<PostResponse>(`/comments/${encodeURIComponent(postId)}`);
  if (!result.ok) return result;

  const [postListing, commentListing] = result.value;
  const rawPost = postListing.data.children[0]?.data;
  if (!rawPost) {
    return { ok: false, error: { status: 404, message: `Post not found: ${postId}` } };
  }

  const comments: RedditComment[] = [];
  for (const child of commentListing.data.children) {
    if (child.kind === "t1") {
      comments.push(mapComment(child.data));
    }
  }

  return { ok: true, value: { post: mapPost(rawPost), comments } };
}

async function fetchModQueue(
  apiGet: ApiGet,
  subreddit: string,
  opts?: { readonly limit?: number },
): Promise<Result<readonly RedditModQueueItem[], RedditError>> {
  const limit = opts?.limit ?? 25;
  type Listing = { data: { children: readonly { kind: string; data: RawModQueueItem }[] } };

  const result = await apiGet<Listing>(`/r/${encodeURIComponent(subreddit)}/about/modqueue?limit=${limit}`);
  if (!result.ok) return result;

  return {
    ok: true,
    value: result.value.data.children.map((c) => mapModQueueItem(c.data, c.kind === "t3" ? "post" : "comment")),
  };
}

async function fetchModLog(
  apiGet: ApiGet,
  subreddit: string,
  opts?: { readonly limit?: number },
): Promise<Result<readonly RedditModAction[], RedditError>> {
  const limit = opts?.limit ?? 25;
  type LogResponse = { data: { children: readonly { data: RawModAction }[] } };

  const result = await apiGet<LogResponse>(`/r/${encodeURIComponent(subreddit)}/about/log?limit=${limit}`);
  if (!result.ok) return result;

  return { ok: true, value: result.value.data.children.map((c) => mapModAction(c.data)) };
}

async function fetchUserInfo(
  apiGet: ApiGet,
  username: string,
): Promise<Result<RedditUser, RedditError>> {
  const result = await apiGet<{ data: RawUser }>(`/user/${encodeURIComponent(username)}/about`);
  if (!result.ok) return result;

  return { ok: true, value: mapUser(result.value.data) };
}
