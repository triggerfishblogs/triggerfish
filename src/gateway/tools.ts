/**
 * Session management and messaging tools for the agent.
 *
 * Provides session listing, history, cross-session messaging, session
 * spawning, and status tools. All taint decisions use injected context,
 * never LLM arguments.
 *
 * @module
 */

import type { ToolDefinition } from "../agent/orchestrator.ts";
import type { EnhancedSessionManager } from "./sessions.ts";
import type { ClassificationLevel } from "../core/types/classification.ts";
import { canFlowTo } from "../core/types/classification.ts";
import type { SessionId } from "../core/types/session.ts";

/** Context required by session tool executors. */
export interface SessionToolContext {
  /** The enhanced session manager instance. */
  readonly sessionManager: EnhancedSessionManager;
  /** The caller's session ID (injected, not from LLM). */
  readonly callerSessionId: SessionId;
  /** The caller's taint level (injected, not from LLM). */
  readonly callerTaint: ClassificationLevel;
}

/** Get session tool definitions for the agent orchestrator. */
export function getSessionToolDefinitions(): readonly ToolDefinition[] {
  return [
    {
      name: "sessions_list",
      description: "List all active sessions visible to the current session.",
      parameters: {},
    },
    {
      name: "sessions_history",
      description: "Get the message history for a session by ID.",
      parameters: {
        session_id: {
          type: "string",
          description: "The session ID to retrieve history for",
          required: true,
        },
      },
    },
    {
      name: "sessions_send",
      description:
        "Send content from the current session to another session. " +
        "Subject to write-down enforcement.",
      parameters: {
        session_id: {
          type: "string",
          description: "Target session ID to send content to",
          required: true,
        },
        content: {
          type: "string",
          description: "The message content to send",
          required: true,
        },
      },
    },
    {
      name: "sessions_spawn",
      description:
        "Spawn a new background session for an autonomous task. " +
        "The new session starts with independent PUBLIC taint.",
      parameters: {
        task: {
          type: "string",
          description: "Description of what the background session should do",
          required: true,
        },
      },
    },
    {
      name: "session_status",
      description: "Get metadata and status for a specific session.",
      parameters: {
        session_id: {
          type: "string",
          description: "The session ID to check",
          required: true,
        },
      },
    },
    {
      name: "message",
      description:
        "Send a message to a channel. Subject to write-down enforcement via policy hooks.",
      parameters: {
        channel: {
          type: "string",
          description: "Target channel identifier (e.g. 'telegram', 'slack')",
          required: true,
        },
        recipient: {
          type: "string",
          description: "Recipient identifier within the channel",
          required: true,
        },
        text: {
          type: "string",
          description: "Message text to send",
          required: true,
        },
      },
    },
  ];
}

/** System prompt section explaining session tools to the LLM. */
export const SESSION_TOOLS_SYSTEM_PROMPT = `## Session Management

You can interact with other sessions and send cross-channel messages.

- Use sessions_list to see active sessions (filtered by your taint level).
- Use sessions_history to read a session's message transcript.
- Use sessions_send to send content to another session (write-down checks apply).
- Use sessions_spawn to create a new background session for autonomous tasks.
- Use session_status to check a session's metadata (taint, channel, user).
- Use message to send a message to a specific channel and recipient.

Write-down prevention: You cannot send data to sessions or channels with a lower classification than your current taint level.`;

/**
 * Create a tool executor for session management tools.
 *
 * Returns null for non-session tool names (allowing chaining).
 * All taint decisions use the injected context, not LLM arguments.
 *
 * @param ctx - Session tool context with manager and caller identity
 * @returns An executor function: (name, input) => Promise<string | null>
 */
export function createSessionToolExecutor(
  ctx: SessionToolContext | undefined,
): (name: string, input: Record<string, unknown>) => Promise<string | null> {
  const SESSION_TOOLS = new Set([
    "sessions_list",
    "sessions_history",
    "sessions_send",
    "sessions_spawn",
    "session_status",
    "message",
  ]);

  return async (
    name: string,
    input: Record<string, unknown>,
  ): Promise<string | null> => {
    if (!SESSION_TOOLS.has(name)) return null;

    if (!ctx) {
      return "Session management is not available in this context.";
    }

    switch (name) {
      case "sessions_list": {
        try {
          const sessions = await ctx.sessionManager.sessionsList();
          // Filter: only show sessions whose taint can flow to the caller's taint.
          // A PUBLIC caller cannot see CONFIDENTIAL session metadata.
          const visible = sessions.filter((s) =>
            canFlowTo(s.taint, ctx.callerTaint)
          );
          if (visible.length === 0) return "No active sessions visible at your classification level.";
          return visible.map((s) =>
            `${s.id}\n  Channel: ${s.channelId}\n  User: ${s.userId}\n  Taint: ${s.taint}\n  Created: ${s.createdAt.toISOString()}`
          ).join("\n\n");
        } catch (err) {
          return `Error listing sessions: ${err instanceof Error ? err.message : String(err)}`;
        }
      }

      case "sessions_history": {
        const sessionId = input.session_id;
        if (typeof sessionId !== "string" || sessionId.length === 0) {
          return "Error: sessions_history requires a 'session_id' argument (string).";
        }
        try {
          const session = await ctx.sessionManager.get(sessionId as SessionId);
          if (!session) return `Session not found: ${sessionId}`;
          // Block if target session's taint cannot flow to caller
          if (!canFlowTo(session.taint, ctx.callerTaint)) {
            return `Access denied: session ${sessionId} is at ${session.taint}, your session is at ${ctx.callerTaint}.`;
          }
          return JSON.stringify({
            id: session.id,
            channelId: session.channelId,
            userId: session.userId,
            taint: session.taint,
            createdAt: session.createdAt.toISOString(),
          });
        } catch (err) {
          return `Error reading session: ${err instanceof Error ? err.message : String(err)}`;
        }
      }

      case "sessions_send": {
        const sessionId = input.session_id;
        const content = input.content;
        if (typeof sessionId !== "string" || sessionId.length === 0) {
          return "Error: sessions_send requires a 'session_id' argument (string).";
        }
        if (typeof content !== "string" || content.length === 0) {
          return "Error: sessions_send requires a non-empty 'content' argument (string).";
        }
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
          return `Error sending to session: ${err instanceof Error ? err.message : String(err)}`;
        }
      }

      case "sessions_spawn": {
        const task = input.task;
        if (typeof task !== "string" || task.length === 0) {
          return "Error: sessions_spawn requires a non-empty 'task' argument (string).";
        }
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
          return `Error spawning session: ${err instanceof Error ? err.message : String(err)}`;
        }
      }

      case "session_status": {
        const sessionId = input.session_id;
        if (typeof sessionId !== "string" || sessionId.length === 0) {
          return "Error: session_status requires a 'session_id' argument (string).";
        }
        try {
          const session = await ctx.sessionManager.get(sessionId as SessionId);
          if (!session) return `Session not found: ${sessionId}`;
          // Block if target session's taint cannot flow to caller
          if (!canFlowTo(session.taint, ctx.callerTaint)) {
            return `Access denied: session ${sessionId} is at ${session.taint}, your session is at ${ctx.callerTaint}.`;
          }
          return JSON.stringify({
            id: session.id,
            channelId: session.channelId,
            userId: session.userId,
            taint: session.taint,
            createdAt: session.createdAt.toISOString(),
          });
        } catch (err) {
          return `Error reading session: ${err instanceof Error ? err.message : String(err)}`;
        }
      }

      case "message": {
        const channel = input.channel;
        const recipient = input.recipient;
        const text = input.text;
        if (typeof channel !== "string" || channel.length === 0) {
          return "Error: message requires a non-empty 'channel' argument (string).";
        }
        if (typeof recipient !== "string" || recipient.length === 0) {
          return "Error: message requires a non-empty 'recipient' argument (string).";
        }
        if (typeof text !== "string" || text.length === 0) {
          return "Error: message requires a non-empty 'text' argument (string).";
        }
        // Channel routing is handled by the channel router at a higher level.
        // For now, return a placeholder indicating the message was queued.
        return JSON.stringify({
          status: "queued",
          channel,
          recipient,
          text_length: text.length,
          note: "Message routing via channel router is pending full integration.",
        });
      }

      default:
        return null;
    }
  };
}
