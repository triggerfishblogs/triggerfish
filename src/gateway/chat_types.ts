/**
 * Chat session types and wire protocol events.
 *
 * Re-exports from split sub-modules for backward compatibility.
 * See chat_session_config.ts and chat_session_interface.ts for implementations.
 *
 * @module
 */

export type {
  ChatClientMessage,
  ChatEvent,
  ChatEventSender,
} from "../core/types/chat_event.ts";

export type {
  ChannelClassificationConfig,
  ChannelRegistrationConfig,
  ChatSessionConfig,
} from "./chat_session_config.ts";

export type { ChatSession } from "./chat_session_interface.ts";
