/**
 * Session management tool handlers.
 *
 * Implements sessions_list, sessions_history, sessions_send,
 * sessions_spawn, and session_status handlers. All taint decisions
 * use the injected context, not LLM arguments.
 *
 * @module
 */

import { canFlowTo } from "../../../core/types/classification.ts";
import type { SessionId } from "../../../core/types/session.ts";
import { createLogger } from "../../../core/logger/logger.ts";

import type { SessionToolContext } from "./session_tools_defs.ts";

const log = createLogger("security");

/** Tool names handled by this executor. */
export const SESSION_MANAGEMENT_TOOLS = new Set([
  "sessions_list",
  "sessions_history",
  "sessions_send",
  "sessions_spawn",
  "session_status",
]);

/** Format a session record for display. */
function formatSessionSummary(s: {
  readonly id: string;
  readonly channelId: string;
  readonly userId: string;
  readonly taint: string;
  readonly createdAt: Date;
}): string {
  return `${s.id}\n  Channel: ${s.channelId}\n  User: ${s.userId}\n  Taint: ${s.taint}\n  Created: ${s.createdAt.toISOString()}`;
}

/** Serialize session metadata as JSON. */
function serializeSessionMeta(session: {
  readonly id: string;
  readonly channelId: string;
  readonly userId: string;
  readonly taint: string;
  readonly createdAt: Date;
}): string {
  return JSON.stringify({
    id: session.id,
    channelId: session.channelId,
    userId: session.userId,
    taint: session.taint,
    createdAt: session.createdAt.toISOString(),
  });
}

/** Require a string argument from tool input, returning an error message if missing. */
function requireStringArg(
  input: Record<string, unknown>,
  key: string,
  toolName: string,
): string | null {
  const value = input[key];
  if (typeof value !== "string" || value.length === 0) {
    return `Error: ${toolName} requires a non-empty '${key}' argument (string).`;
  }
  return null;
}

/** Handle sessions_list: list sessions visible at the caller's taint level. */
async function executeSessionsList(ctx: SessionToolContext): Promise<string> {
  try {
    const sessions = await ctx.sessionManager.sessionsList();
    const visible = sessions.filter((s) => canFlowTo(s.taint, ctx.callerTaint));
    if (visible.length === 0) {
      return "No active sessions visible at your classification level.";
    }
    return visible.map(formatSessionSummary).join("\n\n");
  } catch (err) {
    return `Error listing sessions: ${
      err instanceof Error ? err.message : String(err)
    }`;
  }
}

/** Handle sessions_history: retrieve session metadata with taint gating. */
async function executeSessionsHistory(
  ctx: SessionToolContext,
  input: Record<string, unknown>,
): Promise<string> {
  const argErr = requireStringArg(input, "session_id", "sessions_history");
  if (argErr) return argErr;

  const sessionId = input.session_id as string;
  try {
    const session = await ctx.sessionManager.get(sessionId as SessionId);
    if (!session) return `Session not found: ${sessionId}`;

    if (!canFlowTo(session.taint, ctx.callerTaint)) {
      log.warn("Session history access denied: taint exceeds caller", {
        targetSessionId: sessionId,
        targetTaint: session.taint,
        callerTaint: ctx.callerTaint,
      });
      return `Access denied: session ${sessionId} is at ${session.taint}, your session is at ${ctx.callerTaint}.`;
    }
    return serializeSessionMeta(session);
  } catch (err) {
    return `Error reading session: ${
      err instanceof Error ? err.message : String(err)
    }`;
  }
}

/** Handle sessions_send: send content to another session with write-down enforcement. */
async function executeSessionsSend(
  ctx: SessionToolContext,
  input: Record<string, unknown>,
): Promise<string> {
  const idErr = requireStringArg(input, "session_id", "sessions_send");
  if (idErr) return idErr;
  const contentErr = requireStringArg(input, "content", "sessions_send");
  if (contentErr) return contentErr;

  const sessionId = input.session_id as string;
  const content = input.content as string;
  try {
    const target = await ctx.sessionManager.get(sessionId as SessionId);
    if (!target) return `Target session not found: ${sessionId}`;

    const result = await ctx.sessionManager.sessionsSend(
      ctx.callerSessionId,
      sessionId as SessionId,
      content,
      target.taint,
    );
    if (!result.ok) return `Write-down blocked: ${result.error}`;
    return `Message delivered to session ${sessionId}.`;
  } catch (err) {
    return `Error sending to session: ${
      err instanceof Error ? err.message : String(err)
    }`;
  }
}

/** Handle sessions_spawn: create a new background session. */
async function executeSessionsSpawn(
  ctx: SessionToolContext,
  input: Record<string, unknown>,
): Promise<string> {
  const argErr = requireStringArg(input, "task", "sessions_spawn");
  if (argErr) return argErr;

  const task = input.task as string;
  try {
    const spawned = await ctx.sessionManager.sessionsSpawn(
      ctx.callerSessionId,
      task,
    );
    return JSON.stringify({
      status: "spawned",
      session_id: spawned.id,
      taint: spawned.taint,
      task,
    });
  } catch (err) {
    return `Error spawning session: ${
      err instanceof Error ? err.message : String(err)
    }`;
  }
}

/** Handle session_status: get session metadata with taint gating. */
async function executeSessionStatus(
  ctx: SessionToolContext,
  input: Record<string, unknown>,
): Promise<string> {
  const argErr = requireStringArg(input, "session_id", "session_status");
  if (argErr) return argErr;

  const sessionId = input.session_id as string;
  try {
    const session = await ctx.sessionManager.get(sessionId as SessionId);
    if (!session) return `Session not found: ${sessionId}`;

    if (!canFlowTo(session.taint, ctx.callerTaint)) {
      return `Access denied: session ${sessionId} is at ${session.taint}, your session is at ${ctx.callerTaint}.`;
    }
    return serializeSessionMeta(session);
  } catch (err) {
    return `Error reading session: ${
      err instanceof Error ? err.message : String(err)
    }`;
  }
}

/**
 * Dispatch a session management tool call.
 *
 * Returns the tool result string, or null if the tool name is not recognized.
 */
// deno-lint-ignore require-await
export async function dispatchSessionTool(
  ctx: SessionToolContext,
  name: string,
  input: Record<string, unknown>,
): Promise<string | null> {
  switch (name) {
    case "sessions_list":
      return executeSessionsList(ctx);
    case "sessions_history":
      return executeSessionsHistory(ctx, input);
    case "sessions_send":
      return executeSessionsSend(ctx, input);
    case "sessions_spawn":
      return executeSessionsSpawn(ctx, input);
    case "session_status":
      return executeSessionStatus(ctx, input);
    default:
      return null;
  }
}
