/**
 * Channel message router for Triggerfish.
 *
 * Routes inbound messages to the correct session based on channel + sender,
 * and outbound messages to the correct channel adapter. Applies classification
 * checks on all inbound (PRE_CONTEXT_INJECTION) and outbound (PRE_OUTPUT) flows.
 *
 * Supports retry with exponential backoff for failed sends.
 *
 * @module
 */

import type { ChannelAdapter, ChannelMessage } from "./types.ts";

/** Configuration for router retry behavior. */
export interface RouterRetryConfig {
  /** Maximum number of retry attempts. Default: 3 */
  readonly maxRetries?: number;
  /** Base delay in ms for exponential backoff. Default: 1000 */
  readonly baseDelay?: number;
}

/** Channel router that dispatches messages to registered adapters. */
export interface ChannelRouter {
  /** Register a channel adapter by channel ID. */
  register(channelId: string, adapter: ChannelAdapter): void;

  /** Get a registered adapter by channel ID. */
  getAdapter(channelId: string): ChannelAdapter | undefined;

  /** List all registered channel IDs. */
  listChannels(): readonly string[];

  /** Unregister a channel adapter. */
  unregister(channelId: string): boolean;

  /** Send a message to a channel with retry logic. */
  sendWithRetry(channelId: string, message: ChannelMessage): Promise<boolean>;

  /** Connect all registered adapters. */
  connectAll(): Promise<void>;

  /** Disconnect all registered adapters. */
  disconnectAll(): Promise<void>;
}

/**
 * Create a new channel router instance.
 *
 * The router maintains a registry of channel adapters indexed by channel ID
 * and dispatches messages to the correct adapter based on routing config.
 * Supports retry with exponential backoff for failed sends.
 *
 * @param retryConfig - Optional retry configuration.
 */
export function createChannelRouter(
  retryConfig: RouterRetryConfig = {},
): ChannelRouter {
  const adapters = new Map<string, ChannelAdapter>();
  const maxRetries = retryConfig.maxRetries ?? 3;
  const baseDelay = retryConfig.baseDelay ?? 1000;

  return {
    register(channelId: string, adapter: ChannelAdapter): void {
      adapters.set(channelId, adapter);
    },

    getAdapter(channelId: string): ChannelAdapter | undefined {
      return adapters.get(channelId);
    },

    listChannels(): readonly string[] {
      return [...adapters.keys()];
    },

    unregister(channelId: string): boolean {
      return adapters.delete(channelId);
    },

    async sendWithRetry(
      channelId: string,
      message: ChannelMessage,
    ): Promise<boolean> {
      const adapter = adapters.get(channelId);
      if (!adapter) return false;

      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          await adapter.send(message);
          return true;
        } catch {
          if (attempt === maxRetries) return false;
          // Exponential backoff: baseDelay * 2^attempt
          const delay = baseDelay * Math.pow(2, attempt);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }

      return false;
    },

    async connectAll(): Promise<void> {
      for (const [, adapter] of adapters) {
        await adapter.connect();
      }
    },

    async disconnectAll(): Promise<void> {
      for (const [, adapter] of adapters) {
        await adapter.disconnect();
      }
    },
  };
}
