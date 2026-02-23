/**
 * Interactive prompts for configuring channels and plugins.
 *
 * Dispatches to per-channel prompt modules:
 * - prompt_telegram.ts, prompt_slack.ts, prompt_discord.ts
 * - prompt_whatsapp.ts, prompt_webchat.ts, prompt_email.ts
 * - prompt_signal.ts, prompt_plugin.ts
 * @module
 */

import { promptTelegramConfig } from "./prompt_telegram.ts";
import { promptSlackConfig } from "./prompt_slack.ts";
import { promptDiscordConfig } from "./prompt_discord.ts";
import { promptWhatsappConfig } from "./prompt_whatsapp.ts";
import { promptWebchatConfig } from "./prompt_webchat.ts";
import { promptEmailConfig } from "./prompt_email.ts";
import { promptSignalConfig } from "./prompt_signal.ts";

import type { CHANNEL_TYPES } from "./config.ts";

type ChannelType = typeof CHANNEL_TYPES[number];

/** Prompt for channel-specific config fields and return the config object. */
export async function promptChannelConfig(
  channelType: ChannelType,
): Promise<Record<string, unknown>> {
  switch (channelType) {
    case "telegram":
      return await promptTelegramConfig();
    case "slack":
      return await promptSlackConfig();
    case "discord":
      return await promptDiscordConfig();
    case "whatsapp":
      return await promptWhatsappConfig();
    case "webchat":
      return await promptWebchatConfig();
    case "email":
      return await promptEmailConfig();
    case "signal":
      return await promptSignalConfig();
  }
}

export { promptPluginConfig } from "./prompt_plugin.ts";
