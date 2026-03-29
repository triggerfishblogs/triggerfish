/**
 * X engagement types and service interface.
 *
 * Covers likes, retweets, and bookmarks.
 *
 * @module
 */

import type { XApiResult } from "../auth/types_auth.ts";
import type { XPost, XPostPage } from "../posts/types_posts.ts";

// ─── Request Options ─────────────────────────────────────────────────────────

/** Options for listing bookmarks. */
export interface XBookmarkListOptions {
  readonly maxResults?: number;
  readonly nextToken?: string;
}

// ─── Service Interface ───────────────────────────────────────────────────────

/** Service for X engagement operations (likes, retweets, bookmarks). */
export interface EngageService {
  /** Like a post. */
  readonly like: (
    postId: string,
  ) => Promise<XApiResult<{ readonly liked: boolean }>>;
  /** Unlike a post. */
  readonly unlike: (
    postId: string,
  ) => Promise<XApiResult<{ readonly liked: boolean }>>;
  /** Retweet a post. */
  readonly retweet: (
    postId: string,
  ) => Promise<XApiResult<{ readonly retweeted: boolean }>>;
  /** Unretweet a post. */
  readonly unretweet: (
    postId: string,
  ) => Promise<XApiResult<{ readonly retweeted: boolean }>>;
  /** Bookmark a post. */
  readonly bookmark: (
    postId: string,
  ) => Promise<XApiResult<{ readonly bookmarked: boolean }>>;
  /** Unbookmark a post. */
  readonly unbookmark: (
    postId: string,
  ) => Promise<XApiResult<{ readonly bookmarked: boolean }>>;
  /** Get bookmarked posts. */
  readonly getBookmarks: (
    opts: XBookmarkListOptions,
  ) => Promise<XApiResult<XPostPage>>;
}

// Re-export for convenience within engage module
export type { XPost, XPostPage };
