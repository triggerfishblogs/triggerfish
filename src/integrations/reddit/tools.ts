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
import { TOOL_ACTION_MAPS } from "./tool_handlers.ts";

// Re-export for barrel compatibility
export { formatRedditError } from "./tool_handlers.ts";

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
export function buildRedditToolDefinitions(): readonly ToolDefinition[] {
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
