/**
 * Reddit REST API client.
 *
 * Wraps the Reddit OAuth2 API with typed methods that return `Result<T, RedditError>`.
 * Supports `fetchFn` injection for testing. Enforces 60 requests/minute rate limit.
 * Classification is derived from content type via `redditContentClassification()`.
 *
 * @module
 */

import type {
  ClassificationLevel,
  Result,
} from "../../core/types/classification.ts";
import type {
  RedditComment,
  RedditContentType,
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
import type { SecretStore } from "../../core/secrets/keychain/keychain.ts";

// ─── Classification ──────────────────────────────────────────────────────────

/**
 * Map Reddit content type to classification level.
 *
 * Pure function. Maps content categories to security levels:
 * - public_content (posts, comments, subreddit info) -> PUBLIC
 * - modqueue, modlog -> INTERNAL
 * - user_pii (email, IP from modlog) -> CONFIDENTIAL
 */
export function redditContentClassification(
  contentType: RedditContentType,
): ClassificationLevel {
  switch (contentType) {
    case "public_content":
      return "PUBLIC";
    case "modqueue":
    case "modlog":
      return "INTERNAL";
    case "user_pii":
      return "CONFIDENTIAL";
  }
}

// ─── Rate Limiter ────────────────────────────────────────────────────────────

/** Sliding-window rate limiter for Reddit's 60 requests/minute ceiling. */
export interface RateLimiter {
  readonly tryAcquire: () => boolean;
  readonly waitForSlot: () => Promise<void>;
}

/** Create a rate limiter that enforces the given requests-per-window limit. */
export function createRateLimiter(
  opts: {
    readonly maxRequests?: number;
    readonly windowMs?: number;
    readonly nowFn?: () => number;
  } = {},
): RateLimiter {
  const maxRequests = opts.maxRequests ?? 60;
  const windowMs = opts.windowMs ?? 60_000;
  const nowFn = opts.nowFn ?? (() => Date.now());
  const timestamps: number[] = [];

  function pruneOld(): void {
    const cutoff = nowFn() - windowMs;
    while (timestamps.length > 0 && timestamps[0] < cutoff) {
      timestamps.shift();
    }
  }

  return {
    tryAcquire(): boolean {
      pruneOld();
      if (timestamps.length >= maxRequests) return false;
      timestamps.push(nowFn());
      return true;
    },
    async waitForSlot(): Promise<void> {
      pruneOld();
      if (timestamps.length < maxRequests) {
        timestamps.push(nowFn());
        return;
      }
      const oldest = timestamps[0];
      const waitMs = oldest + windowMs - nowFn() + 1;
      if (waitMs > 0) {
        await new Promise((r) => setTimeout(r, waitMs));
      }
      pruneOld();
      timestamps.push(nowFn());
    },
  };
}

// ─── Auth ────────────────────────────────────────────────────────────────────

/** Options for resolving Reddit OAuth2 credentials. */
export interface ResolveRedditTokenOptions {
  readonly secretStore: SecretStore;
}

/**
 * Resolve Reddit OAuth2 credentials from the OS keychain.
 *
 * Returns an error with setup instructions if the secret is not stored.
 */
export async function resolveRedditToken(
  options: ResolveRedditTokenOptions,
): Promise<Result<string, string>> {
  const keychainResult = await options.secretStore.getSecret("reddit-token");
  if (keychainResult.ok) {
    return { ok: true, value: keychainResult.value };
  }

  return {
    ok: false,
    error: "Reddit token not found in keychain. Run:\n" +
      "  triggerfish connect reddit",
  };
}

// ─── Client Config ───────────────────────────────────────────────────────────

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

// ─── Raw API Types ───────────────────────────────────────────────────────────

interface RawSubreddit {
  readonly display_name: string;
  readonly title: string;
  readonly public_description: string;
  readonly subscribers: number;
  readonly accounts_active: number;
  readonly subreddit_type: string;
}

interface RawPost {
  readonly id: string;
  readonly subreddit: string;
  readonly title: string;
  readonly author: string;
  readonly selftext: string;
  readonly url: string;
  readonly permalink: string;
  readonly score: number;
  readonly num_comments: number;
  readonly created_utc: number;
  readonly over_18: boolean;
}

interface RawComment {
  readonly id: string;
  readonly link_id: string;
  readonly author: string;
  readonly body: string;
  readonly score: number;
  readonly created_utc: number;
  readonly replies?: { readonly data?: { readonly children?: readonly RawCommentChild[] } };
}

interface RawCommentChild {
  readonly kind: string;
  readonly data: RawComment;
}

interface RawModQueueItem {
  readonly id: string;
  readonly name: string;
  readonly subreddit: string;
  readonly author: string;
  readonly title?: string;
  readonly body?: string;
  readonly selftext?: string;
  readonly mod_reports: readonly (readonly [string, string])[];
  readonly user_reports: readonly (readonly [string, number])[];
  readonly created_utc: number;
}

interface RawModAction {
  readonly id: string;
  readonly action: string;
  readonly mod: string;
  readonly target_author: string;
  readonly target_permalink: string;
  readonly details: string;
  readonly created_utc: number;
}

interface RawUser {
  readonly name: string;
  readonly created_utc: number;
  readonly link_karma: number;
  readonly comment_karma: number;
  readonly is_mod: boolean;
  readonly icon_img: string;
}

interface RawRule {
  readonly short_name: string;
  readonly description: string;
}

// ─── Token Refresh ───────────────────────────────────────────────────────────

interface TokenState {
  accessToken: string;
  expiresAt: number;
}

async function refreshAccessToken(
  clientId: string,
  clientSecret: string,
  refreshToken: string,
  doFetch: typeof fetch,
  baseTokenUrl: string,
): Promise<Result<TokenState, RedditError>> {
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });

  try {
    const response = await doFetch(`${baseTokenUrl}/api/v1/access_token`, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
    });

    if (!response.ok) {
      return {
        ok: false,
        error: {
          status: response.status,
          message: `Token refresh failed: HTTP ${response.status}`,
        },
      };
    }

    const data = await response.json() as {
      access_token: string;
      expires_in: number;
    };

    return {
      ok: true,
      value: {
        accessToken: data.access_token,
        expiresAt: Date.now() + (data.expires_in * 1000) - 30_000,
      },
    };
  } catch (err) {
    return {
      ok: false,
      error: {
        status: 0,
        message: `Token refresh network error: ${
          err instanceof Error ? err.message : String(err)
        }`,
      },
    };
  }
}

// ─── Client Interface ────────────────────────────────────────────────────────

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

// ─── API Request ─────────────────────────────────────────────────────────────

async function sendRedditApiRequest<T>(
  doFetch: typeof fetch,
  baseUrl: string,
  accessToken: string,
  username: string,
  clientId: string,
  path: string,
  rateLimiter: RateLimiter,
): Promise<Result<T, RedditError>> {
  await rateLimiter.waitForSlot();

  try {
    const response = await doFetch(`${baseUrl}${path}`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "User-Agent": `triggerfish:${clientId}:1.0.0 (by /u/${username})`,
      },
    });

    if (!response.ok) {
      const remaining = response.headers.get("x-ratelimit-remaining")
        ? Number(response.headers.get("x-ratelimit-remaining"))
        : undefined;
      const reset = response.headers.get("x-ratelimit-reset")
        ? Number(response.headers.get("x-ratelimit-reset"))
        : undefined;

      let message: string;
      try {
        const body = (await response.json()) as { message?: string; error?: string };
        message = body.message ?? body.error ?? `HTTP ${response.status}`;
      } catch {
        message = `HTTP ${response.status}`;
      }

      return {
        ok: false,
        error: { status: response.status, message, rateLimitRemaining: remaining, rateLimitReset: reset },
      };
    }

    const data = (await response.json()) as T;
    return { ok: true, value: data };
  } catch (err) {
    return {
      ok: false,
      error: {
        status: 0,
        message: `Reddit API request failed: ${
          err instanceof Error ? err.message : String(err)
        }`,
      },
    };
  }
}

// ─── Response Mappers ────────────────────────────────────────────────────────

function mapPost(raw: RawPost): RedditPost {
  return {
    id: raw.id,
    subreddit: raw.subreddit,
    title: raw.title,
    author: raw.author,
    selftext: raw.selftext,
    url: raw.url,
    permalink: raw.permalink,
    score: raw.score,
    numComments: raw.num_comments,
    createdUtc: raw.created_utc,
    isNsfw: raw.over_18,
    classification: redditContentClassification("public_content"),
  };
}

function mapComment(raw: RawComment): RedditComment {
  const replies: RedditComment[] = [];
  if (raw.replies?.data?.children) {
    for (const child of raw.replies.data.children) {
      if (child.kind === "t1") {
        replies.push(mapComment(child.data));
      }
    }
  }

  return {
    id: raw.id,
    postId: raw.link_id?.replace("t3_", "") ?? "",
    author: raw.author,
    body: raw.body,
    score: raw.score,
    createdUtc: raw.created_utc,
    replies,
    classification: redditContentClassification("public_content"),
  };
}

function mapModQueueItem(
  raw: RawModQueueItem,
  kind: "post" | "comment",
): RedditModQueueItem {
  const reports: string[] = [];
  for (const [reason] of raw.mod_reports) {
    reports.push(reason);
  }
  for (const [reason] of raw.user_reports) {
    reports.push(String(reason));
  }

  return {
    id: raw.id,
    kind,
    subreddit: raw.subreddit,
    author: raw.author,
    title: raw.title ?? null,
    body: raw.body ?? raw.selftext ?? "",
    reportReasons: reports,
    createdUtc: raw.created_utc,
    classification: redditContentClassification("modqueue"),
  };
}

function mapModAction(raw: RawModAction): RedditModAction {
  return {
    id: raw.id,
    action: raw.action,
    moderator: raw.mod,
    targetAuthor: raw.target_author,
    targetPermalink: raw.target_permalink,
    details: raw.details,
    createdUtc: raw.created_utc,
    classification: redditContentClassification("modlog"),
  };
}

function mapUser(raw: RawUser): RedditUser {
  return {
    name: raw.name,
    createdUtc: raw.created_utc,
    linkKarma: raw.link_karma,
    commentKarma: raw.comment_karma,
    isMod: raw.is_mod,
    iconUrl: raw.icon_img,
    classification: redditContentClassification("public_content"),
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
  const tokenUrl = "https://www.reddit.com";
  const doFetch = config.fetchFn ?? fetch;
  const rateLimiter = config.rateLimiter ?? createRateLimiter();

  let tokenState: TokenState = { accessToken: "", expiresAt: 0 };

  async function ensureAccessToken(): Promise<Result<string, RedditError>> {
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
  }

  async function apiGet<T>(path: string): Promise<Result<T, RedditError>> {
    const tokenResult = await ensureAccessToken();
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
    async fetchSubredditInfo(subreddit) {
      const aboutResult = await apiGet<{ data: RawSubreddit }>(
        `/r/${encodeURIComponent(subreddit)}/about`,
      );
      if (!aboutResult.ok) return aboutResult;

      const rulesResult = await apiGet<{ rules: readonly RawRule[] }>(
        `/r/${encodeURIComponent(subreddit)}/about/rules`,
      );

      const rules: RedditRule[] = rulesResult.ok
        ? rulesResult.value.rules.map((r) => ({
          shortName: r.short_name,
          description: r.description,
        }))
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
    },

    async fetchPosts(subreddit, opts) {
      const sort = opts?.sort ?? "hot";
      const limit = opts?.limit ?? 25;
      const time = opts?.time ?? "day";
      const params = new URLSearchParams({
        limit: String(limit),
        t: time,
      });

      type ListingResponse = {
        data: { children: readonly { data: RawPost }[] };
      };

      const result = await apiGet<ListingResponse>(
        `/r/${encodeURIComponent(subreddit)}/${sort}?${params}`,
      );
      if (!result.ok) return result;

      return {
        ok: true,
        value: result.value.data.children.map((c) => mapPost(c.data)),
      };
    },

    async fetchPost(postId) {
      type PostResponse = readonly [
        { data: { children: readonly { data: RawPost }[] } },
        { data: { children: readonly RawCommentChild[] } },
      ];

      const result = await apiGet<PostResponse>(
        `/comments/${encodeURIComponent(postId)}`,
      );
      if (!result.ok) return result;

      const [postListing, commentListing] = result.value;
      const rawPost = postListing.data.children[0]?.data;
      if (!rawPost) {
        return {
          ok: false,
          error: { status: 404, message: `Post not found: ${postId}` },
        };
      }

      const comments: RedditComment[] = [];
      for (const child of commentListing.data.children) {
        if (child.kind === "t1") {
          comments.push(mapComment(child.data));
        }
      }

      return {
        ok: true,
        value: { post: mapPost(rawPost), comments },
      };
    },

    async fetchModQueue(subreddit, opts) {
      const limit = opts?.limit ?? 25;
      type ListingResponse = {
        data: { children: readonly { kind: string; data: RawModQueueItem }[] };
      };

      const result = await apiGet<ListingResponse>(
        `/r/${encodeURIComponent(subreddit)}/about/modqueue?limit=${limit}`,
      );
      if (!result.ok) return result;

      return {
        ok: true,
        value: result.value.data.children.map((c) =>
          mapModQueueItem(c.data, c.kind === "t3" ? "post" : "comment")
        ),
      };
    },

    async fetchModLog(subreddit, opts) {
      const limit = opts?.limit ?? 25;
      type LogResponse = {
        data: { children: readonly { data: RawModAction }[] };
      };

      const result = await apiGet<LogResponse>(
        `/r/${encodeURIComponent(subreddit)}/about/log?limit=${limit}`,
      );
      if (!result.ok) return result;

      return {
        ok: true,
        value: result.value.data.children.map((c) => mapModAction(c.data)),
      };
    },

    async fetchUserInfo(username) {
      const result = await apiGet<{ data: RawUser }>(
        `/user/${encodeURIComponent(username)}/about`,
      );
      if (!result.ok) return result;

      return {
        ok: true,
        value: mapUser(result.value.data),
      };
    },
  };
}
