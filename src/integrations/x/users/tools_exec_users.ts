/**
 * X users tool action handlers.
 *
 * @module
 */

import type { XToolContext } from "../tools_shared.ts";
import { formatXError } from "../tools_shared.ts";

/** Handle x_users get action. */
export async function getXUser(
  ctx: XToolContext,
  input: Record<string, unknown>,
): Promise<string> {
  const username = input.username;
  if (typeof username !== "string" || username.length === 0) {
    return "Error: x_users get requires a 'username' parameter.";
  }

  const quotaCheck = await ctx.quotaTracker.checkReadQuota();
  if (!quotaCheck.ok) return quotaCheck.error;

  const result = await ctx.users.getUser(username);
  if (!result.ok) return formatXError(result.error);
  await ctx.quotaTracker.recordRead();

  return JSON.stringify(result.value);
}

/** Handle x_users followers action. */
export async function listXFollowers(
  ctx: XToolContext,
  input: Record<string, unknown>,
): Promise<string> {
  const quotaCheck = await ctx.quotaTracker.checkReadQuota();
  if (!quotaCheck.ok) return quotaCheck.error;

  let userId = ctx.authenticatedUserId;

  if (typeof input.username === "string" && input.username.length > 0) {
    const userResult = await ctx.users.getUser(input.username);
    if (!userResult.ok) return formatXError(userResult.error);
    await ctx.quotaTracker.recordRead();
    userId = userResult.value.id;
  }

  const result = await ctx.users.getFollowers({
    userId,
    maxResults: typeof input.max_results === "number"
      ? input.max_results
      : undefined,
    nextToken: typeof input.next_token === "string"
      ? input.next_token
      : undefined,
  });

  if (!result.ok) return formatXError(result.error);
  await ctx.quotaTracker.recordRead();

  const response: Record<string, unknown> = {
    users: result.value.users,
  };
  if (result.value.nextToken) response.next_token = result.value.nextToken;
  return JSON.stringify(response);
}

/** Handle x_users following action. */
export async function listXFollowing(
  ctx: XToolContext,
  input: Record<string, unknown>,
): Promise<string> {
  const quotaCheck = await ctx.quotaTracker.checkReadQuota();
  if (!quotaCheck.ok) return quotaCheck.error;

  let userId = ctx.authenticatedUserId;

  if (typeof input.username === "string" && input.username.length > 0) {
    const userResult = await ctx.users.getUser(input.username);
    if (!userResult.ok) return formatXError(userResult.error);
    await ctx.quotaTracker.recordRead();
    userId = userResult.value.id;
  }

  const result = await ctx.users.getFollowing({
    userId,
    maxResults: typeof input.max_results === "number"
      ? input.max_results
      : undefined,
    nextToken: typeof input.next_token === "string"
      ? input.next_token
      : undefined,
  });

  if (!result.ok) return formatXError(result.error);
  await ctx.quotaTracker.recordRead();

  const response: Record<string, unknown> = {
    users: result.value.users,
  };
  if (result.value.nextToken) response.next_token = result.value.nextToken;
  return JSON.stringify(response);
}

/** Handle x_users follow action. */
export async function followXUser(
  ctx: XToolContext,
  input: Record<string, unknown>,
): Promise<string> {
  const username = input.username;
  if (typeof username !== "string" || username.length === 0) {
    return "Error: x_users follow requires a 'username' parameter.";
  }

  const quotaCheck = await ctx.quotaTracker.checkWriteQuota();
  if (!quotaCheck.ok) return quotaCheck.error;

  const userResult = await ctx.users.getUser(username);
  if (!userResult.ok) return formatXError(userResult.error);
  await ctx.quotaTracker.recordRead();

  const result = await ctx.users.follow(userResult.value.id);
  if (!result.ok) return formatXError(result.error);
  await ctx.quotaTracker.recordWrite();

  return JSON.stringify({
    following: result.value.following,
    username,
  });
}

/** Handle x_users unfollow action. */
export async function unfollowXUser(
  ctx: XToolContext,
  input: Record<string, unknown>,
): Promise<string> {
  const username = input.username;
  if (typeof username !== "string" || username.length === 0) {
    return "Error: x_users unfollow requires a 'username' parameter.";
  }

  const quotaCheck = await ctx.quotaTracker.checkWriteQuota();
  if (!quotaCheck.ok) return quotaCheck.error;

  const userResult = await ctx.users.getUser(username);
  if (!userResult.ok) return formatXError(userResult.error);
  await ctx.quotaTracker.recordRead();

  const result = await ctx.users.unfollow(userResult.value.id);
  if (!result.ok) return formatXError(result.error);
  await ctx.quotaTracker.recordWrite();

  return JSON.stringify({
    following: result.value.following,
    username,
  });
}
