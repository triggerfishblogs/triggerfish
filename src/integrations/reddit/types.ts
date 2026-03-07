/**
 * Domain types for the Reddit integration.
 *
 * All types are readonly and carry a `classification` field derived
 * from content type via `redditContentClassification()`.
 *
 * @module
 */

import type { ClassificationLevel } from "../../core/types/classification.ts";

/** Sort order for subreddit post listings. */
export type PostSort = "hot" | "new" | "top" | "rising";

/** Time filter for "top" sort. */
export type TimeFilter = "hour" | "day" | "week" | "month" | "year" | "all";

/** A Reddit subreddit. */
export interface RedditSubreddit {
  readonly name: string;
  readonly title: string;
  readonly description: string;
  readonly subscribers: number;
  readonly activeUsers: number;
  readonly subredditType: string;
  readonly rules: readonly RedditRule[];
  readonly classification: ClassificationLevel;
}

/** A subreddit rule. */
export interface RedditRule {
  readonly shortName: string;
  readonly description: string;
}

/** A Reddit post. */
export interface RedditPost {
  readonly id: string;
  readonly subreddit: string;
  readonly title: string;
  readonly author: string;
  readonly selftext: string;
  readonly url: string;
  readonly permalink: string;
  readonly score: number;
  readonly numComments: number;
  readonly createdUtc: number;
  readonly isNsfw: boolean;
  readonly classification: ClassificationLevel;
}

/** A Reddit comment. */
export interface RedditComment {
  readonly id: string;
  readonly postId: string;
  readonly author: string;
  readonly body: string;
  readonly score: number;
  readonly createdUtc: number;
  readonly replies: readonly RedditComment[];
  readonly classification: ClassificationLevel;
}

/** A modqueue item (post or comment awaiting moderation). */
export interface RedditModQueueItem {
  readonly id: string;
  readonly kind: "post" | "comment";
  readonly subreddit: string;
  readonly author: string;
  readonly title: string | null;
  readonly body: string;
  readonly reportReasons: readonly string[];
  readonly createdUtc: number;
  readonly classification: ClassificationLevel;
}

/** A moderation log entry. */
export interface RedditModAction {
  readonly id: string;
  readonly action: string;
  readonly moderator: string;
  readonly targetAuthor: string;
  readonly targetPermalink: string;
  readonly details: string;
  readonly createdUtc: number;
  readonly classification: ClassificationLevel;
}

/** Reddit user profile summary. */
export interface RedditUser {
  readonly name: string;
  readonly createdUtc: number;
  readonly linkKarma: number;
  readonly commentKarma: number;
  readonly isMod: boolean;
  readonly iconUrl: string;
  readonly classification: ClassificationLevel;
}

/** Error from a Reddit API call. */
export interface RedditError {
  readonly status: number;
  readonly message: string;
  readonly rateLimitRemaining?: number;
  readonly rateLimitReset?: number;
}

/** Reddit OAuth2 token pair. */
export interface RedditTokens {
  readonly accessToken: string;
  readonly refreshToken: string;
  readonly expiresAt: number;
  readonly scope: string;
}

/** Reddit content type for classification mapping. */
export type RedditContentType =
  | "public_content"
  | "modqueue"
  | "modlog"
  | "user_pii";
