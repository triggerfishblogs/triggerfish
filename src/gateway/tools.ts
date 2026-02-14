/**
 * Session management and messaging tools for the agent.
 *
 * Provides session listing, history, cross-session messaging, session
 * spawning, channel listing, and outbound message routing. All taint
 * decisions use injected context, never LLM arguments.
 *
 * @module
 */

import type { ToolDefinition } from "../agent/orchestrator.ts";
import type { EnhancedSessionManager } from "./sessions.ts";
import type { ClassificationLevel } from "../core/types/classification.ts";
import { canFlowTo } from "../core/types/classification.ts";
import type { SessionId } from "../core/types/session.ts";
import type { ChannelAdapter } from "../channels/types.ts";
import type { SignalChannelAdapter } from "../channels/signal/adapter.ts";
import type { PairingService } from "../channels/pairing.ts";

/** A registered channel adapter with its classification and metadata. */
export interface RegisteredChannel {
  /** The channel adapter instance. */
  readonly adapter: ChannelAdapter;
  /** The channel's classification level. */
  readonly classification: ClassificationLevel;
  /** Human-readable channel name. */
  readonly name: string;
}

/** Context required by session tool executors. */
export interface SessionToolContext {
  /** The enhanced session manager instance. */
  readonly sessionManager: EnhancedSessionManager;
  /** The caller's session ID (injected, not from LLM). */
  readonly callerSessionId: SessionId;
  /** The caller's taint level (injected, not from LLM). */
  readonly callerTaint: ClassificationLevel;
  /**
   * Live taint getter — returns current session taint (reflects escalation).
   * Falls back to callerTaint if not provided.
   */
  readonly getCallerTaint?: () => ClassificationLevel;
  /**
   * Registered channel adapters keyed by channel type (e.g. "signal", "telegram").
   * This is a mutable Map so channels can be registered after executor creation.
   */
  readonly channels?: Map<string, RegisteredChannel>;
  /** Pairing service for generating/verifying pairing codes. */
  readonly pairingService?: PairingService;
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
        "Send a message to a connected channel (signal, telegram, etc.). " +
        "Subject to write-down enforcement: your session taint must be able to flow to the channel's classification. " +
        "For Signal, the recipient is a phone number (E.164 format, e.g. '+15551234567') or a group ID prefixed with 'group-'.",
      parameters: {
        channel: {
          type: "string",
          description: "Target channel type (e.g. 'signal', 'telegram'). Use channels_list to see connected channels.",
          required: true,
        },
        recipient: {
          type: "string",
          description: "Recipient identifier — phone number for Signal, chat ID for Telegram, etc.",
          required: true,
        },
        text: {
          type: "string",
          description: "Message text to send",
          required: true,
        },
      },
    },
    {
      name: "channels_list",
      description: "List all connected messaging channels with their type, classification, and connection status.",
      parameters: {},
    },
    {
      name: "signal_list_groups",
      description: "List all Signal groups the account belongs to. Returns group IDs, names, and member counts. Only works when Signal is connected.",
      parameters: {},
    },
    {
      name: "signal_list_contacts",
      description: "List all known Signal contacts with their phone numbers and profile names. Only works when Signal is connected.",
      parameters: {},
    },
    {
      name: "signal_generate_pairing",
      description:
        "Generate a 6-digit pairing code for Signal. " +
        "Give this code to someone so they can pair with your Signal number and chat with the agent. " +
        "The code expires after 5 minutes. Only works when Signal DM policy is 'pairing'.",
      parameters: {},
    },
  ];
}

/** System prompt section explaining session tools to the LLM. */
export const SESSION_TOOLS_SYSTEM_PROMPT = `## Session & Channel Management

You have access to messaging channels (Signal, Telegram, etc.) and can manage sessions across them.

### Channels
- Use channels_list to discover connected channels and their classification levels.
- Use message to send a message to a recipient on a connected channel.
  - For Signal: you ARE the owner's phone number. Recipients are phone numbers in E.164 format (e.g. "+15551234567") or group IDs prefixed with "group-".
  - For Telegram: recipients are chat IDs.
- Write-down enforcement applies: you cannot send data to a channel whose classification is lower than your current session taint. If your taint is CONFIDENTIAL and the channel is INTERNAL, the message will be blocked.

### Sessions
- Use sessions_list to see active sessions across all channels (filtered by your taint level).
- Use sessions_history to read a session's message transcript.
- Use sessions_send to send content to another session (write-down checks apply).
- Use sessions_spawn to create a new background session for autonomous tasks.
- Use session_status to check a session's metadata (taint, channel, user).

### Signal
When Signal is connected, you operate as the owner's assistant on their phone number. People who message the owner on Signal are routed to you. Each Signal contact gets their own session with independent taint tracking. The owner can see these sessions and instruct you on how to respond.

- Use signal_list_groups to see all Signal groups the account belongs to (names, IDs, member counts).
- Use signal_list_contacts to see known Signal contacts (names, phone numbers).
- To message a group, use: message with channel="signal" and recipient="group-<groupId>".
- To message a contact, use: message with channel="signal" and recipient="+15551234567".

### Signal Pairing (Authorization)
When Signal DM policy is "pairing", ALL senders must be paired before they get any response — DMs and group messages alike. This is enforced at the code level. You will never see messages from unpaired senders.

The pairing flow:
1. The owner asks you to generate a pairing code → use signal_generate_pairing.
2. The owner gives the code to the person (verbally, via another channel, etc.).
3. The person sends the 6-digit code as a DM to the owner's Signal number.
4. If valid, they're paired and can chat (DMs and groups). On success they get a confirmation message.
5. ALL unpaired messages are silently ignored — no response, no indication of the agent's presence. The owner is also a linked device on this Signal account, so unpaired people are just having normal conversations with the owner. Triggerfish stays invisible until someone pairs.`;

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
