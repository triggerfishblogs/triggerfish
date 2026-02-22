/**
 * Session tool executor for the agent.
 *
 * Implements the 10 session/channel tool handlers (sessions_list, sessions_history,
 * sessions_send, sessions_spawn, session_status, message, channels_list,
 * signal_list_groups, signal_list_contacts, signal_generate_pairing).
 *
 * Types, tool definitions, and system prompt live in `tools_defs.ts`.
 *
 * @module
 */

import { canFlowTo } from "../../core/types/classification.ts";
import type { SessionId } from "../../core/types/session.ts";
import type { SignalChannelAdapter } from "../../channels/signal/adapter.ts";
import { createLogger } from "../../core/logger/logger.ts";

import type { SessionToolContext } from "./session_tools_defs.ts";

const log = createLogger("security");

// ─── Barrel re-exports from session_tools_defs.ts ───────────────────────────

export {
  getSessionToolDefinitions,
  SESSION_TOOLS_SYSTEM_PROMPT,
} from "./session_tools_defs.ts";
export type {
  RegisteredChannel,
  SessionToolContext,
} from "./session_tools_defs.ts";

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
    "channels_list",
    "signal_list_groups",
    "signal_list_contacts",
    "signal_generate_pairing",
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
            log.warn("Session history access denied: taint exceeds caller", {
              targetSessionId: sessionId,
              targetTaint: session.taint,
              callerTaint: ctx.callerTaint,
            });
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

        if (!ctx.channels || ctx.channels.size === 0) {
          return "Error: no messaging channels are connected. Use channels_list to check.";
        }

        const registered = ctx.channels.get(channel);
        if (!registered) {
          const available = [...ctx.channels.keys()].join(", ");
          return `Error: channel "${channel}" is not connected. Available channels: ${available}`;
        }

        // Write-down enforcement: caller taint must flow to channel classification.
        // Use live taint getter to reflect any escalation during the session.
        const currentTaint = ctx.getCallerTaint?.() ?? ctx.callerTaint;
        if (!canFlowTo(currentTaint, registered.classification)) {
          log.warn("Message write-down blocked", {
            channel,
            sessionTaint: currentTaint,
            channelClassification: registered.classification,
          });
          return `Write-down blocked: your session taint is ${currentTaint}, but channel "${channel}" is classified as ${registered.classification}. Data cannot flow from ${currentTaint} to ${registered.classification}.`;
        }

        const status = registered.adapter.status();
        if (!status.connected) {
          return `Error: channel "${channel}" is registered but not currently connected.`;
        }

        // Build sessionId from channel type + recipient
        // Signal: "signal-{phone}" for DMs, "signal-group-{groupId}" for groups
        // Telegram: "telegram-{chatId}"
        let sessionId: string;
        if (channel === "signal") {
          sessionId = recipient.startsWith("group-")
            ? `signal-${recipient}`
            : `signal-${recipient}`;
        } else {
          sessionId = `${channel}-${recipient}`;
        }

        try {
          await registered.adapter.send({
            content: text,
            sessionId,
          });
          return JSON.stringify({
            status: "sent",
            channel,
            recipient,
            classification: registered.classification,
            text_length: text.length,
          });
        } catch (err) {
          return `Error sending message: ${err instanceof Error ? err.message : String(err)}`;
        }
      }

      case "channels_list": {
        if (!ctx.channels || ctx.channels.size === 0) {
          return "No messaging channels are connected.";
        }
        const entries: string[] = [];
        for (const [type, reg] of ctx.channels) {
          const status = reg.adapter.status();
          entries.push(
            `${type}\n  Name: ${reg.name}\n  Classification: ${reg.classification}\n  Connected: ${status.connected}`
          );
        }
        return entries.join("\n\n");
      }

      case "signal_list_groups": {
        if (!ctx.channels) return "No channels connected.";
        const signalReg = ctx.channels.get("signal");
        if (!signalReg) return "Signal is not connected.";
        if (!signalReg.adapter.status().connected) return "Signal is registered but not currently connected.";

        const signalAdapter = signalReg.adapter as SignalChannelAdapter;
        if (!signalAdapter.listGroups) return "Signal adapter does not support listing groups.";

        try {
          const result = await signalAdapter.listGroups();
          if (!result.ok) return `Error listing groups: ${result.error}`;
          if (result.value.length === 0) return "No Signal groups found.";
          return result.value
            .filter((g) => g.isMember && !g.isBlocked)
            .map((g) => {
              const members = g.members ? ` (${g.members.length} members)` : "";
              const desc = g.description ? `\n  Description: ${g.description}` : "";
              return `${g.name}\n  Group ID: ${g.id}${members}${desc}`;
            })
            .join("\n\n");
        } catch (err) {
          return `Error: ${err instanceof Error ? err.message : String(err)}`;
        }
      }

      case "signal_list_contacts": {
        if (!ctx.channels) return "No channels connected.";
        const signalReg = ctx.channels.get("signal");
        if (!signalReg) return "Signal is not connected.";
        if (!signalReg.adapter.status().connected) return "Signal is registered but not currently connected.";

        const signalAdapter = signalReg.adapter as SignalChannelAdapter;
        if (!signalAdapter.listContacts) return "Signal adapter does not support listing contacts.";

        try {
          const result = await signalAdapter.listContacts();
          if (!result.ok) return `Error listing contacts: ${result.error}`;
          if (result.value.length === 0) return "No Signal contacts found.";
          return result.value
            .filter((c) => !c.isBlocked && c.number)
            .map((c) => {
              const displayName = c.name || c.profileName || "Unknown";
              return `${displayName}\n  Phone: ${c.number}`;
            })
            .join("\n\n");
        } catch (err) {
          return `Error: ${err instanceof Error ? err.message : String(err)}`;
        }
      }

      case "signal_generate_pairing": {
        if (!ctx.pairingService) {
          return "Pairing service is not available. Signal may not be configured with pairing: true.";
        }
        try {
          const code = await ctx.pairingService.generateCode("signal");
          return `Pairing code generated: ${code.code}\n\nGive this code to the person who wants to chat. They should send it as a message to your Signal number. The code expires in 5 minutes.`;
        } catch (err) {
          return `Error generating pairing code: ${err instanceof Error ? err.message : String(err)}`;
        }
      }

      default:
        return null;
    }
  };
}
