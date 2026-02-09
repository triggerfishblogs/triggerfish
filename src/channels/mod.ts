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

export type { ChannelRouter } from "./router.ts";
export { createChannelRouter } from "./router.ts";

export type { AgentState, RippleManager } from "./ripple.ts";
export { createRippleManager } from "./ripple.ts";

export type { GroupMode, GroupConfig, OwnerContext, GroupManager } from "./groups.ts";
export { createGroupManager } from "./groups.ts";
