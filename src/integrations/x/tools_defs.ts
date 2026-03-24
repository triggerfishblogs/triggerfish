/**
 * X integration tool definitions and system prompt.
 *
 * @module
 */

import type { ToolDefinition } from "../../core/types/tool.ts";
import { buildXPostsDef, buildXUsersDef } from "./tools_defs_posts_users.ts";
import {
  buildXEngageDef,
  buildXListsDef,
  buildXQuotaDef,
} from "./tools_defs_engage_lists.ts";

/** Build all X tool definitions. */
export function buildXToolDefinitions(): readonly ToolDefinition[] {
  return [
    buildXPostsDef(),
    buildXUsersDef(),
    buildXEngageDef(),
    buildXListsDef(),
    buildXQuotaDef(),
  ];
}

/** Cached definitions for the tool group registry. */
let cachedDefs: readonly ToolDefinition[] | null = null;

/** Get X tool definitions (cached). */
export function getXToolDefinitions(): readonly ToolDefinition[] {
  if (!cachedDefs) {
    cachedDefs = buildXToolDefinitions();
  }
  return cachedDefs;
}

/** System prompt section for X integration tools. */
export const X_TOOLS_SYSTEM_PROMPT = `## X (Twitter) Integration

You can read and write to X (formerly Twitter) using the x_ tools.

**x_posts** — Post operations:
- search: Search recent posts by keyword or X search operators
- timeline: View the home timeline
- get: Get a specific post by ID
- mentions: See posts mentioning the authenticated user
- user_posts: View posts by a specific user
- create: Create a new post (280 char limit, or 25,000 for Premium)
- delete: Delete your own post
- upload_media: Upload an image or video, returns media_id for create

**x_users** — User operations:
- get: Look up a user profile by username
- followers / following: See follower/following lists
- follow / unfollow: Follow or unfollow a user

**x_engage** — Engagement operations:
- like / unlike: Like or unlike a post
- retweet / unretweet: Retweet or remove a retweet
- bookmark / unbookmark: Bookmark a post for later
- get_bookmarks: List bookmarked posts

**x_lists** — List operations:
- get: List your owned lists
- members: Get members of a list
- create: Create a new list
- add_member / remove_member: Manage list membership

**x_quota** — Check remaining API quota for the current billing period

Important: X is a PUBLIC channel. If this session has accessed classified data
(INTERNAL or higher), write tools will be blocked by security policy. Use a
clean session or reset taint before posting.

Search supports X query operators: from:user, to:user, #hashtag, "exact phrase",
has:media, has:links, is:reply, is:retweet, lang:en, and boolean operators.`;
