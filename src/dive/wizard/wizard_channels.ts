/**
 * Channel selection step for the dive wizard.
 *
 * Prompts the user to choose messaging channels and collects
 * per-channel configuration (tokens, ports, endpoints).
 *
 * @module
 */

import { Checkbox, Input } from "@cliffy/prompt";

import { promptChannelConfig } from "../../cli/config/config.ts";

import type { ChannelChoice } from "./wizard_types.ts";

// ── Result type ───────────────────────────────────────────────────────────────

/** Result of the channel selection step. */
export interface ChannelSelectionResult {
  readonly channels: ChannelChoice[];
  readonly telegramBotToken: string;
  readonly telegramOwnerId: string;
  readonly discordBotToken: string;
  readonly discordOwnerId: string;
  readonly webchatPort: number;
  readonly signalPhoneNumber: string;
  readonly signalEndpoint: string;
}

// ── Per-channel config accumulator ────────────────────────────────────────────

interface ChannelConfigAccumulator {
  telegramBotToken: string;
  telegramOwnerId: string;
  discordBotToken: string;
  discordOwnerId: string;
  webchatPort: number;
  signalPhoneNumber: string;
  signalEndpoint: string;
}

/** Create a blank channel config accumulator with sensible defaults. */
function createDefaultChannelConfig(): ChannelConfigAccumulator {
  return {
    telegramBotToken: "",
    telegramOwnerId: "",
    discordBotToken: "",
    discordOwnerId: "",
    webchatPort: 8765,
    signalPhoneNumber: "",
    signalEndpoint: "tcp://127.0.0.1:7583",
  };
}

// ── Individual channel collectors ─────────────────────────────────────────────

/** Prompt the user to select which channels to enable. */
async function collectChannelChoices(): Promise<ChannelChoice[]> {
  const channelChoices = (await Checkbox.prompt({
    message: "Enable additional channels",
    options: [
      {
        name: "WebChat (browser-based, zero config)",
        value: "webchat",
        checked: true,
      },
      { name: "Telegram (requires bot token)", value: "telegram" },
      { name: "Discord (requires bot token)", value: "discord" },
      { name: "Signal (requires signal-cli)", value: "signal" },
    ],
  })) as ChannelChoice[];

  return ["cli", ...channelChoices];
}

/** Collect Telegram bot token and owner ID. */
async function collectTelegramConfig(): Promise<{
  telegramBotToken: string;
  telegramOwnerId: string;
}> {
  const telegramBotToken = await Input.prompt({
    message: "Telegram bot token (from @BotFather)",
  });
  const telegramOwnerId = await Input.prompt({
    message:
      "Your Telegram user ID (numeric, message @getmyid_bot for your ID number)",
  });
  if (telegramBotToken.length > 0) {
    console.log("  \u2713 Telegram bot token saved to config");
  }
  return { telegramBotToken, telegramOwnerId };
}

/** Collect Discord bot token and owner ID via the shared config prompt. */
async function collectDiscordConfig(): Promise<{
  discordBotToken: string;
  discordOwnerId: string;
}> {
  const discordConfig = await promptChannelConfig("discord");
  const discordBotToken = (discordConfig.botToken as string) ?? "";
  const discordOwnerId = (discordConfig.ownerId as string) ?? "";
  if (discordBotToken.length > 0) {
    console.log("  \u2713 Discord bot token saved to config");
  }
  return { discordBotToken, discordOwnerId };
}

/** Collect the WebChat port number. */
async function collectWebchatConfig(): Promise<number> {
  const portStr = await Input.prompt({
    message: "WebChat port",
    default: "8765",
  });
  return parseInt(portStr, 10) || 8765;
}

/** Collect Signal phone number and daemon endpoint. */
async function collectSignalConfig(): Promise<{
  signalPhoneNumber: string;
  signalEndpoint: string;
}> {
  console.log("");
  console.log("  Signal requires signal-cli to be installed and linked.");
  console.log("  Run: triggerfish connect signal   (after setup)");
  console.log("");
  const signalPhoneNumber = await Input.prompt({
    message: "Your Signal phone number (E.164 format, e.g. +15551234567)",
  });
  const signalEndpoint = await Input.prompt({
    message: "signal-cli daemon endpoint",
    default: "tcp://127.0.0.1:7583",
  });
  if (signalPhoneNumber.length > 0) {
    console.log("  \u2713 Signal account saved to config");
  }
  return { signalPhoneNumber, signalEndpoint };
}

// ── Collect configs for selected channels ─────────────────────────────────────

/** Walk through selected channels and collect per-channel configuration. */
async function collectSelectedChannelConfigs(
  channels: ChannelChoice[],
): Promise<ChannelConfigAccumulator> {
  const config = createDefaultChannelConfig();
  if (channels.includes("telegram")) {
    const t = await collectTelegramConfig();
    config.telegramBotToken = t.telegramBotToken;
    config.telegramOwnerId = t.telegramOwnerId;
  }
  if (channels.includes("discord")) {
    const d = await collectDiscordConfig();
    config.discordBotToken = d.discordBotToken;
    config.discordOwnerId = d.discordOwnerId;
  }
  if (channels.includes("webchat")) {
    config.webchatPort = await collectWebchatConfig();
  }
  if (channels.includes("signal")) {
    const s = await collectSignalConfig();
    config.signalPhoneNumber = s.signalPhoneNumber;
    config.signalEndpoint = s.signalEndpoint;
  }
  return config;
}

// ── Step entry point ──────────────────────────────────────────────────────────

/** Run the channel selection wizard step (Step 3/8). */
export async function promptChannelSelectionStep(): Promise<ChannelSelectionResult> {
  console.log("  Step 3/8: Connect your first channel");
  console.log("  (CLI is always available)");
  console.log("");

  const channels = await collectChannelChoices();
  const config = await collectSelectedChannelConfigs(channels);

  console.log("");

  return { channels, ...config };
}
