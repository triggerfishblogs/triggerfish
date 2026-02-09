/**
 * Channel types and interfaces for Triggerfish channel adapters.
 *
 * Defines the common interface all channel adapters must implement,
 * message types for inter-channel communication, and status reporting.
 *
 * @module
 */

import type { ClassificationLevel } from "../core/types/classification.ts";

/** Message received from or sent to a channel. */
export interface ChannelMessage {
  readonly content: string;
  readonly sessionId?: string;
  readonly sessionTaint?: ClassificationLevel;
}

/** Status information for a channel adapter. */
export interface ChannelStatus {
  readonly connected: boolean;
  readonly channelType: string;
}

/** Handler callback for incoming messages. */
export type MessageHandler = (message: ChannelMessage) => void;

/**
 * Common interface for all channel adapters.
 *
 * Each channel adapter (CLI, WhatsApp, Telegram, etc.) implements this
 * interface to provide a uniform message send/receive API.
 */
export interface ChannelAdapter {
  /** The classification level assigned to this channel. */
  readonly classification: ClassificationLevel;

  /** Whether the current user is the owner. */
  readonly isOwner: boolean;

  /** Connect to the channel. */
  connect(): Promise<void>;

  /** Disconnect from the channel. */
  disconnect(): Promise<void>;

  /** Send a message to the channel. */
  send(message: ChannelMessage): Promise<void>;

  /** Register a handler for incoming messages. */
  onMessage(handler: MessageHandler): void;

  /** Get the current channel status. */
  status(): ChannelStatus;
}
