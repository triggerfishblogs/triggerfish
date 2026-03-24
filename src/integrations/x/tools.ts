/**
 * X tool executor for the agent.
 *
 * Creates a chain-compatible executor for the 5 X tools.
 * Each consolidated tool dispatches on the `action` parameter to the
 * domain-specific handler from posts/, users/, engage/, lists/.
 *
 * @module
 */

import type { XToolContext } from "./tools_shared.ts";
import { enforceTierRestriction } from "./tools_shared.ts";

import {
  createXPost,
  deleteXPost,
  getXMentions,
  getXPost,
  getXTimeline,
  getXUserPosts,
  searchXPosts,
  uploadXMedia,
} from "./posts/tools_exec_posts.ts";
import {
  followXUser,
  getXUser,
  listXFollowers,
  listXFollowing,
  unfollowXUser,
} from "./users/tools_exec_users.ts";
import {
  bookmarkXPost,
  getXBookmarks,
  likeXPost,
  retweetXPost,
  unbookmarkXPost,
  unlikeXPost,
  unretweetXPost,
} from "./engage/tools_exec_engage.ts";
import {
  addXListMember,
  createXList,
  getXListMembers,
  getXLists,
  removeXListMember,
} from "./lists/tools_exec_lists.ts";

// ─── Re-exports ──────────────────────────────────────────────────────────────

export type { XToolContext } from "./tools_shared.ts";
export {
  buildXToolDefinitions,
  getXToolDefinitions,
  X_TOOLS_SYSTEM_PROMPT,
} from "./tools_defs.ts";

// ─── Action handler type ────────────────────────────────────────────────────

type ActionHandler = (
  ctx: XToolContext,
  input: Record<string, unknown>,
) => Promise<string>;

// ─── Tool dispatch maps ─────────────────────────────────────────────────────

/** Posts domain: action → handler. */
const POSTS_ACTIONS: Readonly<Record<string, ActionHandler>> = {
  search: searchXPosts,
  timeline: getXTimeline,
  get: getXPost,
  mentions: getXMentions,
  user_posts: getXUserPosts,
  create: createXPost,
  delete: deleteXPost,
  upload_media: uploadXMedia,
};

/** Users domain: action → handler. */
const USERS_ACTIONS: Readonly<Record<string, ActionHandler>> = {
  get: getXUser,
  followers: listXFollowers,
  following: listXFollowing,
  follow: followXUser,
  unfollow: unfollowXUser,
};

/** Engagement domain: action → handler. */
const ENGAGE_ACTIONS: Readonly<Record<string, ActionHandler>> = {
  like: likeXPost,
  unlike: unlikeXPost,
  retweet: retweetXPost,
  unretweet: unretweetXPost,
  bookmark: bookmarkXPost,
  unbookmark: unbookmarkXPost,
  get_bookmarks: getXBookmarks,
};

/** Lists domain: action → handler. */
const LISTS_ACTIONS: Readonly<Record<string, ActionHandler>> = {
  get: getXLists,
  members: getXListMembers,
  create: createXList,
  add_member: addXListMember,
  remove_member: removeXListMember,
};

/** Tool name → action dispatch map. */
const TOOL_ACTION_MAPS: Readonly<
  Record<string, Readonly<Record<string, ActionHandler>>>
> = {
  x_posts: POSTS_ACTIONS,
  x_users: USERS_ACTIONS,
  x_engage: ENGAGE_ACTIONS,
  x_lists: LISTS_ACTIONS,
};

// ─── Executor ────────────────────────────────────────────────────────────────

/**
 * Create a tool executor for X integration tools.
 *
 * Returns null for unknown tool names (allowing chaining with other executors).
 * Returns a graceful error message if ctx is undefined (X not configured).
 */
export function createXToolExecutor(
  ctx: XToolContext | undefined,
): (name: string, input: Record<string, unknown>) => Promise<string | null> {
  return async (
    name: string,
    input: Record<string, unknown>,
  ): Promise<string | null> => {
    // Handle x_quota separately (no action dispatch)
    if (name === "x_quota") {
      if (!ctx) {
        return "X is not configured. Run 'triggerfish connect x' to set up X integration.";
      }
      const usage = await ctx.quotaTracker.getUsage();
      return JSON.stringify(usage);
    }

    const actionMap = TOOL_ACTION_MAPS[name];
    if (!actionMap) return null;

    if (!ctx) {
      return "X is not configured. Run 'triggerfish connect x' to set up X integration.";
    }

    const action = input.action;
    if (typeof action !== "string" || action.length === 0) {
      return `Error: ${name} requires an 'action' parameter (string).`;
    }

    // Check tier availability
    const tierBlock = enforceTierRestriction(name, action, ctx.tier);
    if (tierBlock) return tierBlock;

    const handler = actionMap[action];
    if (!handler) {
      const valid = Object.keys(actionMap).join(", ");
      return `Error: unknown action "${action}" for ${name}. Valid actions: ${valid}`;
    }

    return handler(ctx, input);
  };
}
