/**
 * Per-channel and per-plugin interactive configuration prompts.
 *
 * Dispatches to channel-specific prompt modules (Telegram, Slack, Discord,
 * WhatsApp, WebChat, Email, Signal) and plugin-specific prompts (Obsidian).
 * @module
 */

export { promptChannelConfig } from "./channel_prompts.ts";
export { promptPluginConfig } from "./prompt_plugin.ts";
export { promptDiscordConfig } from "./prompt_discord.ts";
export { promptEmailConfig } from "./prompt_email.ts";
export { promptSignalConfig } from "./prompt_signal.ts";
export { promptSlackConfig } from "./prompt_slack.ts";
export { promptTelegramConfig } from "./prompt_telegram.ts";
export { promptWebchatConfig } from "./prompt_webchat.ts";
export { promptWhatsappConfig } from "./prompt_whatsapp.ts";
