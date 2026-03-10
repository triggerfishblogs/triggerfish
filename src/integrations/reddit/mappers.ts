/**
 * Reddit API response mappers and classification.
 *
 * Maps raw Reddit API JSON shapes into typed domain objects,
 * and provides the content-type to classification-level mapping.
 *
 * @module
 */

import type { ClassificationLevel } from "../../core/types/classification.ts";
import type {
  RedditComment,
  RedditContentType,
  RedditModAction,
  RedditModQueueItem,
  RedditPost,
  RedditUser,
} from "./types.ts";

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

// ─── Raw API Types ───────────────────────────────────────────────────────────

/** @internal */
export interface RawSubreddit {
  readonly display_name: string;
  readonly title: string;
  readonly public_description: string;
  readonly subscribers: number;
  readonly accounts_active: number;
  readonly subreddit_type: string;
}

/** @internal */
export interface RawPost {
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

/** @internal */
export interface RawComment {
  readonly id: string;
  readonly link_id: string;
  readonly author: string;
  readonly body: string;
  readonly score: number;
  readonly created_utc: number;
  readonly replies?: {
    readonly data?: { readonly children?: readonly RawCommentChild[] };
  };
}

/** @internal */
export interface RawCommentChild {
  readonly kind: string;
  readonly data: RawComment;
}

/** @internal */
export interface RawModQueueItem {
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

/** @internal */
export interface RawModAction {
  readonly id: string;
  readonly action: string;
  readonly mod: string;
  readonly target_author: string;
  readonly target_permalink: string;
  readonly details: string;
  readonly created_utc: number;
}

/** @internal */
export interface RawUser {
  readonly name: string;
  readonly created_utc: number;
  readonly link_karma: number;
  readonly comment_karma: number;
  readonly is_mod: boolean;
  readonly icon_img: string;
}

/** @internal */
export interface RawRule {
  readonly short_name: string;
  readonly description: string;
}

// ─── Response Mappers ────────────────────────────────────────────────────────

/** Map raw Reddit post JSON to typed RedditPost. */
export function mapPost(raw: RawPost): RedditPost {
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

/** Map raw Reddit comment JSON to typed RedditComment (recursive). */
export function mapComment(raw: RawComment): RedditComment {
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

/** Map raw mod queue item JSON to typed RedditModQueueItem. */
export function mapModQueueItem(
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

/** Map raw mod action JSON to typed RedditModAction. */
export function mapModAction(raw: RawModAction): RedditModAction {
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

/** Map raw user JSON to typed RedditUser. */
export function mapUser(raw: RawUser): RedditUser {
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
