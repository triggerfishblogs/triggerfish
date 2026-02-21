/**
 * Session tool types, definitions, and system prompt.
 *
 * Defines RegisteredChannel, SessionToolContext, the 10 session/channel
 * tool schemas, and the LLM system prompt section. Separated from
 * the executor in `tools.ts` for lighter type-only imports.
 *
 * @module
 */

import type { ToolDefinition } from "../../core/types/tool.ts";
import type { ClassificationLevel } from "../../core/types/classification.ts";
import type { SessionId } from "../../core/types/session.ts";
import type { ChannelAdapter } from "../../channels/types.ts";
import type { EnhancedSessionManager } from "../sessions.ts";
import type { PairingService } from "../../channels/pairing.ts";

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

You have access to messaging channels and can manage sessions across them.

### Channels
- Use channels_list to discover connected channels and their classification levels.
- Use message to send a message to a recipient on a connected channel.
- Write-down enforcement applies: you cannot send data to a channel whose classification is lower than your current session taint.

### Sessions
- Use sessions_list to see active sessions across all channels (filtered by your taint level).
- Use sessions_history to read a session's message transcript.
- Use sessions_send to send content to another session (write-down checks apply).
- Use sessions_spawn to create a new background session for autonomous tasks.
- Use session_status to check a session's metadata (taint, channel, user).

For Signal-specific usage (messaging contacts, groups, pairing), read the "signal" skill.`;
