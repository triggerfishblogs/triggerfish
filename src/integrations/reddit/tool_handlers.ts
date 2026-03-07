/**
 * Reddit tool action handlers.
 *
 * Each handler validates its required parameters, calls the Reddit client,
 * and returns a JSON-formatted string response for the agent.
 *
 * @module
 */

import type { RedditClient } from "./client.ts";

// ─── Input Validation ────────────────────────────────────────────────────────

function requireString(
  input: Record<string, unknown>,
  field: string,
  toolName: string,
): string | null {
  const value = input[field];
  if (typeof value !== "string" || value.length === 0) {
    return `Error: ${toolName} requires a '${field}' argument (non-empty string).`;
  }
  return null;
}

// ─── Error Formatting ────────────────────────────────────────────────────────

interface RedditApiError {
  readonly status: number;
  readonly message: string;
  readonly rateLimitRemaining?: number;
  readonly rateLimitReset?: number;
}

/** Format a Reddit API error into a user-friendly string. */
export function formatRedditError(error: RedditApiError): string {
  if (error.status === 429 || (error.status === 403 && error.rateLimitRemaining === 0)) {
    const resetSec = error.rateLimitReset ?? 0;
    return `Reddit rate limit exceeded. Resets in ${resetSec} seconds.`;
  }
  return `Reddit API error (${error.status}): ${error.message}`;
}

// ─── Action Handlers ─────────────────────────────────────────────────────────

async function executeSubredditInfo(
  client: RedditClient,
  input: Record<string, unknown>,
): Promise<string> {
  const err = requireString(input, "subreddit", "reddit_read subreddit_info");
  if (err) return err;

  const result = await client.fetchSubredditInfo(input.subreddit as string);
  if (!result.ok) return formatRedditError(result.error);

  const sub = result.value;
  return JSON.stringify({
    name: sub.name,
    title: sub.title,
    description: sub.description,
    subscribers: sub.subscribers,
    activeUsers: sub.activeUsers,
    type: sub.subredditType,
    rules: sub.rules,
    _classification: sub.classification,
  });
}

async function executePosts(
  client: RedditClient,
  input: Record<string, unknown>,
): Promise<string> {
  const err = requireString(input, "subreddit", "reddit_read posts");
  if (err) return err;

  const sort = typeof input.sort === "string"
    ? input.sort as "hot" | "new" | "top" | "rising"
    : undefined;
  const limit = typeof input.limit === "number" ? input.limit : undefined;
  const time = typeof input.time === "string"
    ? input.time as "hour" | "day" | "week" | "month" | "year" | "all"
    : undefined;

  const result = await client.fetchPosts(input.subreddit as string, {
    sort,
    limit,
    time,
  });
  if (!result.ok) return formatRedditError(result.error);

  return JSON.stringify({
    posts: result.value.map((p) => ({
      id: p.id,
      title: p.title,
      author: p.author,
      score: p.score,
      numComments: p.numComments,
      url: p.url,
      permalink: p.permalink,
      createdUtc: p.createdUtc,
      _classification: p.classification,
    })),
  });
}

async function executePost(
  client: RedditClient,
  input: Record<string, unknown>,
): Promise<string> {
  const err = requireString(input, "post_id", "reddit_read post");
  if (err) return err;

  const result = await client.fetchPost(input.post_id as string);
  if (!result.ok) return formatRedditError(result.error);

  return JSON.stringify({
    post: {
      id: result.value.post.id,
      title: result.value.post.title,
      author: result.value.post.author,
      selftext: result.value.post.selftext,
      score: result.value.post.score,
      numComments: result.value.post.numComments,
      url: result.value.post.url,
      permalink: result.value.post.permalink,
      _classification: result.value.post.classification,
    },
    comments: result.value.comments.map((c) => ({
      id: c.id,
      author: c.author,
      body: c.body,
      score: c.score,
      _classification: c.classification,
    })),
  });
}

async function executeModQueue(
  client: RedditClient,
  input: Record<string, unknown>,
): Promise<string> {
  const err = requireString(input, "subreddit", "reddit_read modqueue");
  if (err) return err;

  const limit = typeof input.limit === "number" ? input.limit : undefined;
  const result = await client.fetchModQueue(input.subreddit as string, {
    limit,
  });
  if (!result.ok) return formatRedditError(result.error);

  return JSON.stringify({
    items: result.value.map((item) => ({
      id: item.id,
      kind: item.kind,
      author: item.author,
      title: item.title,
      body: item.body,
      reportReasons: item.reportReasons,
      _classification: item.classification,
    })),
  });
}

async function executeModLog(
  client: RedditClient,
  input: Record<string, unknown>,
): Promise<string> {
  const err = requireString(input, "subreddit", "reddit_read modlog");
  if (err) return err;

  const limit = typeof input.limit === "number" ? input.limit : undefined;
  const result = await client.fetchModLog(input.subreddit as string, {
    limit,
  });
  if (!result.ok) return formatRedditError(result.error);

  return JSON.stringify({
    actions: result.value.map((a) => ({
      id: a.id,
      action: a.action,
      moderator: a.moderator,
      targetAuthor: a.targetAuthor,
      details: a.details,
      createdUtc: a.createdUtc,
      _classification: a.classification,
    })),
  });
}

async function executeUserInfo(
  client: RedditClient,
  input: Record<string, unknown>,
): Promise<string> {
  const err = requireString(input, "username", "reddit_read user_info");
  if (err) return err;

  const result = await client.fetchUserInfo(input.username as string);
  if (!result.ok) return formatRedditError(result.error);

  const user = result.value;
  return JSON.stringify({
    name: user.name,
    createdUtc: user.createdUtc,
    linkKarma: user.linkKarma,
    commentKarma: user.commentKarma,
    isMod: user.isMod,
    _classification: user.classification,
  });
}

// ─── Dispatch Map ────────────────────────────────────────────────────────────

/** Handler function signature for Reddit tool actions. */
export type ActionHandler = (
  client: RedditClient,
  input: Record<string, unknown>,
) => Promise<string>;

/** Action dispatch map for reddit_read. */
export const READ_ACTIONS: Readonly<Record<string, ActionHandler>> = {
  subreddit_info: executeSubredditInfo,
  posts: executePosts,
  post: executePost,
  modqueue: executeModQueue,
  modlog: executeModLog,
  user_info: executeUserInfo,
};

/** Tool name to action map dispatch. */
export const TOOL_ACTION_MAPS: Readonly<
  Record<string, Readonly<Record<string, ActionHandler>>>
> = {
  reddit_read: READ_ACTIONS,
};
