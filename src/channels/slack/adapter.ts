/**
 * Slack channel adapter using Bolt.
 *
 * Connects to Slack via the Bolt framework and routes incoming messages
 * to the message handler. Supports Slack's block-based messaging and
 * respects the 40,000-character message limit.
 *
 * @module
 */

import SlackBolt from "@slack/bolt";
const { App: SlackApp } = SlackBolt;
import type { ClassificationLevel } from "../../core/types/classification.ts";
import type {
  ChannelAdapter,
  ChannelMessage,
  ChannelStatus,
  MessageHandler,
} from "../types.ts";

/** Maximum message length for Slack. */
const MAX_MESSAGE_LENGTH = 40000;

/** Configuration for the Slack channel adapter. */
export interface SlackConfig {
  /** Slack Bot Token (xoxb-...). */
  readonly botToken: string;
  /** Slack App Token for socket mode (xapp-...). */
  readonly appToken: string;
  /** Slack Signing Secret. */
  readonly signingSecret: string;
  /** Classification level for this channel. Default: PUBLIC */
  readonly classification?: ClassificationLevel;
  /** Owner's Slack user ID (e.g. U01234ABC). */
  readonly ownerId?: string;
}

/**
 * Create a Slack channel adapter.
 *
 * Uses Bolt to connect via Socket Mode. Listens for messages in all
 * channels the bot is added to.
 *
 * @param config - Slack app configuration.
 * @returns A ChannelAdapter wired to Slack.
 */
export function createSlackChannel(config: SlackConfig): ChannelAdapter {
  const classification = (config.classification ?? "PUBLIC") as ClassificationLevel;
  const ownerId = config.ownerId;
  let connected = false;
  let handler: MessageHandler | null = null;

  const app = new SlackApp({
    token: config.botToken,
    appToken: config.appToken,
    signingSecret: config.signingSecret,
    socketMode: true,
  });

  // Listen for messages
  app.message(async ({ message }) => {
    if (!handler) return;

    // Type narrowing for regular messages
    const msg = message as { text?: string; user?: string; channel?: string };
    if (!msg.text || !msg.channel) return;

    const isOwner = ownerId !== undefined ? msg.user === ownerId : true;

    handler({
      content: msg.text,
      sessionId: `slack-${msg.channel}`,
      sessionTaint: isOwner ? undefined : ("PUBLIC" as ClassificationLevel),
    });
  });

  return {
    classification,
    isOwner: true,

    async connect(): Promise<void> {
      await app.start();
      connected = true;
    },

    async disconnect(): Promise<void> {
      await app.stop();
      connected = false;
    },

    async send(message: ChannelMessage): Promise<void> {
      if (!message.sessionId) return;

      const channelId = message.sessionId.replace("slack-", "");
      const text = message.content.length > MAX_MESSAGE_LENGTH
        ? message.content.slice(0, MAX_MESSAGE_LENGTH)
        : message.content;

      await app.client.chat.postMessage({
        channel: channelId,
        text,
      });
    },

    onMessage(msgHandler: MessageHandler): void {
      handler = msgHandler;
    },

    status(): ChannelStatus {
      return {
        connected,
        channelType: "slack",
      };
    },
  };
}
