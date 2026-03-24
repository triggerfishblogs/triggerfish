/**
 * X post types and service interface.
 *
 * @module
 */

import type { XApiResult } from "../auth/types_auth.ts";

// ─── Domain Types ────────────────────────────────────────────────────────────

/** An X post (tweet). */
export interface XPost {
  readonly id: string;
  readonly text: string;
  readonly authorId: string;
  readonly authorUsername?: string;
  readonly authorName?: string;
  readonly createdAt: string;
  readonly conversationId?: string;
  readonly inReplyToUserId?: string;
  readonly referencedTweets?: readonly XReferencedTweet[];
  readonly publicMetrics?: XPostMetrics;
  readonly attachments?: readonly XMediaAttachment[];
}

/** Referenced tweet (quote, reply, retweet). */
export interface XReferencedTweet {
  readonly type: "quoted" | "replied_to" | "retweeted";
  readonly id: string;
}

/** Public engagement metrics for a post. */
export interface XPostMetrics {
  readonly retweet_count: number;
  readonly reply_count: number;
  readonly like_count: number;
  readonly quote_count: number;
  readonly bookmark_count: number;
  readonly impression_count: number;
}

/** Media attachment on a post. */
export interface XMediaAttachment {
  readonly mediaKey: string;
  readonly type: "photo" | "video" | "animated_gif";
  readonly url?: string;
  readonly previewImageUrl?: string;
  readonly altText?: string;
}

/** Paginated list of posts. */
export interface XPostPage {
  readonly posts: readonly XPost[];
  readonly nextToken?: string;
}

/** Media upload result. */
export interface XMediaUploadResult {
  readonly mediaId: string;
}

// ─── Request Options ─────────────────────────────────────────────────────────

/** Options for searching posts. */
export interface XSearchOptions {
  readonly query: string;
  readonly maxResults?: number;
  readonly nextToken?: string;
}

/** Options for creating a post. */
export interface XCreatePostOptions {
  readonly text: string;
  readonly replyTo?: string;
  readonly quote?: string;
  readonly mediaIds?: readonly string[];
  readonly pollOptions?: readonly string[];
  readonly pollDurationMinutes?: number;
}

/** Options for retrieving a timeline or mentions. */
export interface XTimelineOptions {
  readonly maxResults?: number;
  readonly nextToken?: string;
  readonly sinceId?: string;
}

/** Options for getting a user's posts. */
export interface XUserPostsOptions {
  readonly userId: string;
  readonly maxResults?: number;
  readonly nextToken?: string;
}

// ─── Service Interface ───────────────────────────────────────────────────────

/** Service for X post operations. */
export interface PostsService {
  /** Search recent posts by query. */
  readonly search: (opts: XSearchOptions) => Promise<XApiResult<XPostPage>>;
  /** Get the authenticated user's home timeline. */
  readonly timeline: (
    opts: XTimelineOptions,
  ) => Promise<XApiResult<XPostPage>>;
  /** Get a single post by ID. */
  readonly getPost: (postId: string) => Promise<XApiResult<XPost>>;
  /** Get mentions of the authenticated user. */
  readonly mentions: (
    opts: XTimelineOptions,
  ) => Promise<XApiResult<XPostPage>>;
  /** Get posts by a specific user. */
  readonly userPosts: (
    opts: XUserPostsOptions,
  ) => Promise<XApiResult<XPostPage>>;
  /** Create a new post. */
  readonly createPost: (
    opts: XCreatePostOptions,
  ) => Promise<XApiResult<XPost>>;
  /** Delete a post by ID. */
  readonly deletePost: (
    postId: string,
  ) => Promise<XApiResult<{ readonly deleted: boolean }>>;
  /** Upload media for attachment to a post. */
  readonly uploadMedia: (
    filePath: string,
    altText?: string,
  ) => Promise<XApiResult<XMediaUploadResult>>;
}
