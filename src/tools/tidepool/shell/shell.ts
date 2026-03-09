/**
 * Shell message types and topic routing types.
 *
 * Defines the WebSocket topic multiplexing protocol that
 * allows multiple screens to share a single connection.
 *
 * @module
 */

/** WebSocket topic identifiers for screen-specific message routing. */
export type ShellTopic =
  | "chat"
  | "agents"
  | "health"
  | "settings"
  | "logs"
  | "memory";

/** All valid shell topics. */
export const SHELL_TOPICS: readonly ShellTopic[] = [
  "chat",
  "agents",
  "health",
  "settings",
  "logs",
  "memory",
] as const;

/** Inbound message from Tidepool client with topic routing. */
export interface TopicMessage {
  readonly topic?: ShellTopic;
  readonly action?: string;
  readonly payload?: Record<string, unknown>;
  /** Existing chat message fields for backward compat. */
  readonly type?: string;
  readonly [key: string]: unknown;
}

/** Outbound message to Tidepool client with topic routing. */
export interface TopicOutboundMessage {
  readonly topic: ShellTopic;
  readonly [key: string]: unknown;
}

/**
 * Determine the topic for an inbound message.
 *
 * Messages without a topic field default to "chat" for
 * backward compatibility with existing chat protocol.
 */
export function resolveMessageTopic(msg: TopicMessage): ShellTopic {
  if (msg.topic && SHELL_TOPICS.includes(msg.topic)) {
    return msg.topic;
  }
  return "chat";
}

/** Check whether a string is a valid shell topic. */
export function isValidTopic(topic: string): topic is ShellTopic {
  return SHELL_TOPICS.includes(topic as ShellTopic);
}
