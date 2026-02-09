/**
 * Channel adapters for Triggerfish.
 *
 * Exports channel types and adapter implementations.
 *
 * @module
 */

export type {
  ChannelAdapter,
  ChannelMessage,
  ChannelStatus,
  MessageHandler,
} from "./types.ts";

export type { CliChannel, CliChannelConfig } from "./cli/channel.ts";
export { createCliChannel } from "./cli/channel.ts";
