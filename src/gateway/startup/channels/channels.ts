/**
 * Channel adapter wiring barrel for gateway startup.
 *
 * Delegates Telegram, Discord, and Signal channel setup to
 * dedicated modules and re-exports their public APIs.
 *
 * @module
 */

import type { TriggerFishConfig } from "../../../core/config.ts";
import type { createChatSession } from "../../chat.ts";
import type { RegisteredChannel } from "../../tools/session/session_tools.ts";
import type { createNotificationService } from "../../notifications/notifications.ts";
import type { ChannelWiringDeps } from "./channels_shared.ts";
import { wireTelegramChannel } from "./channels_telegram.ts";
import type { TelegramChannelConfig } from "./channels_telegram.ts";
import { wireDiscordChannel } from "./channels_discord.ts";
import type { DiscordChannelConfig } from "./channels_discord.ts";
import { wireSignalChannel } from "./channels_signal.ts";
import type {
  SignalChannelConfig,
  SignalDaemonState,
} from "./channels_signal.ts";
import { wireGoogleChatChannel } from "./channels_googlechat.ts";
import type { GoogleChatChannelConfig } from "./channels_googlechat.ts";

// ─── Re-exports ──────────────────────────────────────────────────────────────

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
export type { GoogleChatChannelConfig } from "./channels_googlechat.ts";
export { wireGoogleChatChannel } from "./channels_googlechat.ts";

// ─── Orchestrator ────────────────────────────────────────────────────────────

/**
 * Wire all configured messaging channels (Telegram, Discord, Signal, Google Chat).
 *
 * Returns Signal daemon state for shutdown cleanup.
 */
export async function wireChannels(
  config: TriggerFishConfig,
  chatSession: ReturnType<typeof createChatSession>,
  notificationService: ReturnType<typeof createNotificationService>,
  channelAdapters: Map<string, RegisteredChannel>,
): Promise<SignalDaemonState> {
  const channelDeps: ChannelWiringDeps = {
    chatSession,
    notificationService,
    channelAdapters,
  };

  const telegramConfig = config.channels?.telegram as
    | TelegramChannelConfig
    | undefined;
  if (telegramConfig?.botToken) {
    await wireTelegramChannel(telegramConfig, channelDeps);
  }

  const discordConfig = config.channels?.discord as
    | DiscordChannelConfig
    | undefined;
  if (discordConfig) {
    await wireDiscordChannel(discordConfig, channelDeps);
  }

  const googlechatConfig = config.channels?.googlechat as
    | GoogleChatChannelConfig
    | undefined;
  if (googlechatConfig?.enabled && googlechatConfig?.credentials_ref) {
    await wireGoogleChatChannel(googlechatConfig, channelDeps);
  }

  const signalConfig = config.channels?.signal as
    | SignalChannelConfig
    | undefined;
  return signalConfig
    ? wireSignalChannel(signalConfig, channelDeps)
    : { handle: null };
}
