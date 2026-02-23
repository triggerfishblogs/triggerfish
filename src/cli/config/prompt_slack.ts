/**
 * Interactive prompt for Slack channel configuration.
 * @module
 */

import { Input, Select } from "@cliffy/prompt";

/** Prompt for Slack authentication tokens. */
async function promptSlackTokens(): Promise<Record<string, unknown>> {
  const botToken = await Input.prompt({
    message: "Bot token (xoxb-...)",
  });
  const appToken = await Input.prompt({
    message: "App token (xapp-... for Socket Mode)",
  });
  const signingSecret = await Input.prompt({
    message: "Signing secret",
  });
  return { botToken, appToken, signingSecret };
}

/** Prompt for Slack bot token, app token, signing secret, and classification. */
export async function promptSlackConfig(): Promise<Record<string, unknown>> {
  const tokens = await promptSlackTokens();

  const slackOwner = await Input.prompt({
    message: "Your Slack user ID (optional, e.g. U012ABC3DEF)",
    default: "",
  });

  const classification = await Select.prompt({
    message: "Classification level",
    options: ["PUBLIC", "INTERNAL", "CONFIDENTIAL", "RESTRICTED"],
    default: "PUBLIC",
  });

  const config: Record<string, unknown> = { ...tokens, classification };
  if (slackOwner.length > 0) {
    config.ownerId = slackOwner;
  }
  return config;
}
