/**
 * X lists tool action handlers.
 *
 * @module
 */

import type { XToolContext } from "../tools_shared.ts";
import { formatXError } from "../tools_shared.ts";

/** Handle x_lists get action. */
export async function getXLists(
  ctx: XToolContext,
  _input: Record<string, unknown>,
): Promise<string> {
  const quotaCheck = await ctx.quotaTracker.checkReadQuota();
  if (!quotaCheck.ok) return quotaCheck.error;

  const result = await ctx.lists.getLists();
  if (!result.ok) return formatXError(result.error);
  await ctx.quotaTracker.recordRead();

  return JSON.stringify({ lists: result.value.lists });
}

/** Handle x_lists members action. */
export async function getXListMembers(
  ctx: XToolContext,
  input: Record<string, unknown>,
): Promise<string> {
  const listId = input.list_id;
  if (typeof listId !== "string" || listId.length === 0) {
    return "Error: x_lists members requires a 'list_id' parameter.";
  }

  const quotaCheck = await ctx.quotaTracker.checkReadQuota();
  if (!quotaCheck.ok) return quotaCheck.error;

  const result = await ctx.lists.getMembers({
    listId,
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

/** Handle x_lists create action. */
export async function createXList(
  ctx: XToolContext,
  input: Record<string, unknown>,
): Promise<string> {
  const name = input.name;
  if (typeof name !== "string" || name.length === 0) {
    return "Error: x_lists create requires a 'name' parameter.";
  }

  const quotaCheck = await ctx.quotaTracker.checkWriteQuota();
  if (!quotaCheck.ok) return quotaCheck.error;

  const result = await ctx.lists.createList({
    name,
    description: typeof input.description === "string"
      ? input.description
      : undefined,
    private: typeof input.private === "boolean" ? input.private : undefined,
  });

  if (!result.ok) return formatXError(result.error);
  await ctx.quotaTracker.recordWrite();

  return JSON.stringify(result.value);
}

/** Handle x_lists add_member action. */
export async function addXListMember(
  ctx: XToolContext,
  input: Record<string, unknown>,
): Promise<string> {
  const listId = input.list_id;
  const username = input.username;
  if (typeof listId !== "string" || listId.length === 0) {
    return "Error: x_lists add_member requires a 'list_id' parameter.";
  }
  if (typeof username !== "string" || username.length === 0) {
    return "Error: x_lists add_member requires a 'username' parameter.";
  }

  const quotaCheck = await ctx.quotaTracker.checkWriteQuota();
  if (!quotaCheck.ok) return quotaCheck.error;

  const userResult = await ctx.users.getUser(username);
  if (!userResult.ok) return formatXError(userResult.error);

  const result = await ctx.lists.addMember(listId, userResult.value.id);
  if (!result.ok) return formatXError(result.error);
  await ctx.quotaTracker.recordWrite();

  return JSON.stringify({
    is_member: result.value.isMember,
    list_id: listId,
    username,
  });
}

/** Handle x_lists remove_member action. */
export async function removeXListMember(
  ctx: XToolContext,
  input: Record<string, unknown>,
): Promise<string> {
  const listId = input.list_id;
  const username = input.username;
  if (typeof listId !== "string" || listId.length === 0) {
    return "Error: x_lists remove_member requires a 'list_id' parameter.";
  }
  if (typeof username !== "string" || username.length === 0) {
    return "Error: x_lists remove_member requires a 'username' parameter.";
  }

  const quotaCheck = await ctx.quotaTracker.checkWriteQuota();
  if (!quotaCheck.ok) return quotaCheck.error;

  const userResult = await ctx.users.getUser(username);
  if (!userResult.ok) return formatXError(userResult.error);

  const result = await ctx.lists.removeMember(listId, userResult.value.id);
  if (!result.ok) return formatXError(result.error);
  await ctx.quotaTracker.recordWrite();

  return JSON.stringify({
    is_member: result.value.isMember,
    list_id: listId,
    username,
  });
}
