/**
 * Channel reconfiguration for the selective wizard.
 *
 * Prompts the user to select which channels to enable/disable
 * and collects per-channel configuration, preserving existing
 * settings for channels that were not changed.
 *
 * @module
 */

import { Checkbox, Input } from "@cliffy/prompt";

import { promptChannelConfig } from "../../cli/config/config.ts";
import { readNestedConfigValue } from "./selective_config.ts";

import type { ChannelChoice } from "../wizard/wizard_types.ts";

// ── Channel selection ─────────────────────────────────────────────────────────

/** Prompt user to select which channels to enable. */
async function promptChannelChoices(
  existingChannels: Record<string, unknown>,
): Promise<ChannelChoice[]> {
  return (await Checkbox.prompt({
    message: "Enable additional channels",
    options: [
      {
        name: "WebChat (browser-based, zero config)",
        value: "webchat",
        checked: "webchat" in existingChannels,
      },
      {
        name: "Telegram (requires bot token)",
        value: "telegram",
        checked: "telegram" in existingChannels,
      },
      {
        name: "Discord (requires bot token)",
        value: "discord",
        checked: "discord" in existingChannels,
      },
      {
        name: "Signal (requires signal-cli)",
        value: "signal",
        checked: "signal" in existingChannels,
      },
    ],
  })) as ChannelChoice[];
}

/** Remove wizard-managed channels that the user deselected. */
function removeDeselectedChannels(
  channels: Record<string, unknown>,
  choices: ChannelChoice[],
): void {
  const managed: ChannelChoice[] = ["webchat", "telegram", "discord", "signal"];
  for (const ch of managed) {
    if (!choices.includes(ch)) delete channels[ch];
  }
}

// ── Per-channel configuration ─────────────────────────────────────────────────

/** Configure the WebChat channel and return its config fragment. */
async function configureWebchatChannel(
  existingConfig: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const currentPort = String(
    (readNestedConfigValue(
      existingConfig,
      "channels.webchat.port",
    ) as number | undefined) ?? 8765,
  );
  const portStr = await Input.prompt({
    message: "WebChat port",
    default: currentPort,
  });
  return { port: parseInt(portStr, 10) || 8765, classification: "PUBLIC" };
}

/** Configure the Telegram channel and return its config fragment or undefined. */
async function configureTelegramChannel(
  existingConfig: Record<string, unknown>,
): Promise<Record<string, unknown> | undefined> {
  const currentOwnerId = String(
    (readNestedConfigValue(
      existingConfig,
      "channels.telegram.ownerId",
    ) as number | undefined) ?? "",
  );
  const botToken = await Input.prompt({
    message: "Telegram bot token (from @BotFather)",
  });
  const ownerId = await Input.prompt({
    message: "Your Telegram user ID (numeric)",
    default: currentOwnerId || undefined,
  });
  if (botToken.length === 0) return undefined;

  const tc: Record<string, unknown> = {
    botToken,
    classification: "INTERNAL",
  };
  if (ownerId.length > 0) {
    tc["ownerId"] = parseInt(ownerId, 10) || 0;
  }
  console.log("  \u2713 Telegram bot token saved to config");
  return tc;
}

/** Configure the Signal channel and return its config fragment or undefined. */
async function configureSignalChannel(
  existingConfig: Record<string, unknown>,
): Promise<Record<string, unknown> | undefined> {
  const currentPhone = (readNestedConfigValue(
    existingConfig,
    "channels.signal.account",
  ) as string | undefined) ?? "";
  const currentEndpoint = (readNestedConfigValue(
    existingConfig,
    "channels.signal.endpoint",
  ) as string | undefined) ?? "tcp://127.0.0.1:7583";

  const phoneNumber = await Input.prompt({
    message: "Your Signal phone number (E.164 format, e.g. +15551234567)",
    default: currentPhone || undefined,
  });
  const endpoint = await Input.prompt({
    message: "signal-cli daemon endpoint",
    default: currentEndpoint,
  });
  if (phoneNumber.length === 0) return undefined;

  console.log("  \u2713 Signal account saved to config");
  return {
    endpoint,
    account: phoneNumber,
    classification: "INTERNAL",
    ownerPhone: phoneNumber,
  };
}

// ── Channel assembly ──────────────────────────────────────────────────────────

/** Configure Discord via the shared channel config prompt. */
async function configureDiscordChannel(
  channels: Record<string, unknown>,
): Promise<void> {
  const dc = await promptChannelConfig("discord");
  if ((dc.botToken as string)?.length > 0) {
    channels["discord"] = dc;
    console.log("  \u2713 Discord bot token saved to config");
  }
}

/** Apply selected channel configurations to the channels object. */
async function applySelectedChannelConfigs(
  choices: ChannelChoice[],
  channels: Record<string, unknown>,
  existingConfig: Record<string, unknown>,
  activeChannels: string[],
): Promise<void> {
  if (choices.includes("webchat")) {
    activeChannels.push("webchat");
    channels["webchat"] = await configureWebchatChannel(existingConfig);
  }
  if (choices.includes("telegram")) {
    activeChannels.push("telegram");
    const tc = await configureTelegramChannel(existingConfig);
    if (tc) channels["telegram"] = tc;
  }
  if (choices.includes("discord")) {
    activeChannels.push("discord");
    await configureDiscordChannel(channels);
  }
  if (choices.includes("signal")) {
    activeChannels.push("signal");
    const sc = await configureSignalChannel(existingConfig);
    if (sc) channels["signal"] = sc;
  }
}

// ── Public entry point ────────────────────────────────────────────────────────

/** Reconfigure all wizard-managed channels interactively. */
export async function reconfigureChannels(
  existingConfig: Record<string, unknown>,
  activeChannels: string[],
): Promise<Record<string, unknown>> {
  console.log("");
  console.log("  Channels");
  console.log("");

  const existingChannels = (readNestedConfigValue(
    existingConfig,
    "channels",
  ) ?? {}) as Record<string, unknown>;
  const choices = await promptChannelChoices(existingChannels);
  const channels: Record<string, unknown> = { ...existingChannels };

  removeDeselectedChannels(channels, choices);
  await applySelectedChannelConfigs(
    choices,
    channels,
    existingConfig,
    activeChannels,
  );

  return channels;
}
