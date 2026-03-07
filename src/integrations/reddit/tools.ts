/**
 * Reddit tool executor for the agent.
 *
 * Creates a chain-compatible executor for the `reddit_read` tool.
 * The tool dispatches on the `action` parameter to domain-specific handlers.
 *
 * @module
 */

import type { ClassificationLevel } from "../../core/types/classification.ts";
import type { SessionId } from "../../core/types/session.ts";
import type { ToolDefinition } from "../../core/types/tool.ts";
import type { RedditClient } from "./client.ts";

// ─── Context ─────────────────────────────────────────────────────────────────

/** Context required by the Reddit tool executor. */
export interface RedditToolContext {
  readonly client: RedditClient;
  readonly sessionTaint: ClassificationLevel;
  readonly sourceSessionId: SessionId;
}

// ─── Tool Definitions ────────────────────────────────────────────────────────

function buildRedditReadDef(): ToolDefinition {
  return {
    name: "reddit_read",
    description:
      "Reddit read operations. Actions: subreddit_info, posts, post, modqueue, modlog, user_info.\n" +
      "- subreddit_info: get subreddit sidebar, rules, subscriber count. Params: subreddit (required)\n" +
      "- posts: get hot/new/top/rising listings. Params: subreddit (required), sort?, limit?, time?\n" +
      "- post: get single post + comment tree. Params: post_id (required)\n" +
      "- modqueue: get pending mod queue items. Params: subreddit (required), limit?\n" +
      "- modlog: get recent mod actions. Params: subreddit (required), limit?\n" +
      "- user_info: get account age, karma, history summary. Params: username (required)",
    parameters: {
      action: {
        type: "string",
        description:
          "The operation: subreddit_info, posts, post, modqueue, modlog, user_info",
        required: true,
      },
      subreddit: {
        type: "string",
        description: "Subreddit name (without r/ prefix)",
        required: false,
      },
      post_id: {
        type: "string",
        description: "Reddit post ID",
        required: false,
      },
      username: {
        type: "string",
        description: "Reddit username (without u/ prefix)",
        required: false,
      },
      sort: {
        type: "string",
        description: 'Sort order: "hot", "new", "top", "rising" (posts)',
        required: false,
      },
      limit: {
        type: "number",
        description: "Number of results to return (default: 25, max: 100)",
        required: false,
      },
      time: {
        type: "string",
        description:
          'Time filter for top sort: "hour", "day", "week", "month", "year", "all"',
        required: false,
      },
    },
  };
}

/** Get all Reddit tool definitions. */
export function getRedditToolDefinitions(): readonly ToolDefinition[] {
  return [buildRedditReadDef()];
}

/** System prompt section explaining Reddit tools to the LLM. */
export const REDDIT_TOOLS_SYSTEM_PROMPT = `## Reddit Access

Reddit authentication is already configured. Do NOT use secret_save or secret_list for Reddit — call the reddit_read tool directly.
Public subreddit content is classified PUBLIC. Modqueue and modlog data is INTERNAL. User PII is CONFIDENTIAL.
Accessing modqueue or modlog escalates session taint to INTERNAL. Never narrate intent — just call the tools directly.

Available tools:
- \`reddit_read\`: action = subreddit_info | posts | post | modqueue | modlog | user_info

**Efficient querying:** Use \`limit: 10\` by default. Only increase when the user asks for more.`;

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

// ─── Dispatch ────────────────────────────────────────────────────────────────

type ActionHandler = (
  client: RedditClient,
  input: Record<string, unknown>,
) => Promise<string>;

const READ_ACTIONS: Readonly<Record<string, ActionHandler>> = {
  subreddit_info: executeSubredditInfo,
  posts: executePosts,
  post: executePost,
  modqueue: executeModQueue,
  modlog: executeModLog,
  user_info: executeUserInfo,
};

const TOOL_ACTION_MAPS: Readonly<
  Record<string, Readonly<Record<string, ActionHandler>>>
> = {
  reddit_read: READ_ACTIONS,
};

// ─── Executor ────────────────────────────────────────────────────────────────

/**
 * Create a tool executor for Reddit tools.
 *
 * Returns null for unknown tool names (allowing chaining with other executors).
 * Returns a graceful error message if ctx is undefined (Reddit not configured).
 */
export function createRedditToolExecutor(
  ctx: RedditToolContext | undefined,
): (name: string, input: Record<string, unknown>) => Promise<string | null> {
  // deno-lint-ignore require-await
  return async (
    name: string,
    input: Record<string, unknown>,
  ): Promise<string | null> => {
    const actionMap = TOOL_ACTION_MAPS[name];
    if (!actionMap) return null;

    if (!ctx) {
      return "Reddit is not configured. Set up Reddit credentials to use Reddit tools.";
    }

    const action = input.action;
    if (typeof action !== "string" || action.length === 0) {
      return `Error: ${name} requires an 'action' parameter (string).`;
    }

    const handler = actionMap[action];
    if (!handler) {
      const valid = Object.keys(actionMap).join(", ");
      return `Error: unknown action "${action}" for ${name}. Valid actions: ${valid}`;
    }

    return handler(ctx.client, input);
  };
}
