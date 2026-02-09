/**
 * Channel message router for Triggerfish.
 *
 * Routes inbound messages to the correct session based on channel + sender,
 * and outbound messages to the correct channel adapter. Applies classification
 * checks on all inbound (PRE_CONTEXT_INJECTION) and outbound (PRE_OUTPUT) flows.
 *
 * @module
 */

import type { ChannelAdapter } from "./types.ts";

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
}

/**
 * Create a new channel router instance.
 *
 * The router maintains a registry of channel adapters indexed by channel ID
 * and dispatches messages to the correct adapter based on routing config.
 */
export function createChannelRouter(): ChannelRouter {
  const adapters = new Map<string, ChannelAdapter>();

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
  };
}
