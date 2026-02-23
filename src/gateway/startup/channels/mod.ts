/**
 * Channel adapter wiring for gateway startup.
 *
 * @module
 */

export { wireChannels } from "./channels.ts";
export type { ChannelWiringDeps } from "./channels_shared.ts";
export type { TelegramChannelConfig } from "./channels_telegram.ts";
export { wireTelegramChannel } from "./channels_telegram.ts";
export type { DiscordChannelConfig } from "./channels_discord.ts";
export { wireDiscordChannel } from "./channels_discord.ts";
export type {
  SignalChannelConfig,
  SignalDaemonState,
} from "./channels_signal.ts";
export { wireSignalChannel } from "./channels_signal.ts";
