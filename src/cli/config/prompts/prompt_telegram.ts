/**
 * Interactive prompt for Telegram channel configuration.
 * @module
 */

import { Input, Select } from "@cliffy/prompt";

/** Prompt for Telegram bot token, owner ID, and classification. */
export async function promptTelegramConfig(): Promise<Record<string, unknown>> {
  const botToken = await Input.prompt({
    message: "Bot token (from @BotFather)",
  });

  const ownerId = await Input.prompt({
    message:
      "Your Telegram user ID (numeric, message @getmyid_bot for your ID number)",
  });

  const classification = await Select.prompt({
    message: "Classification level",
    options: ["INTERNAL", "PUBLIC", "CONFIDENTIAL", "RESTRICTED"],
    default: "INTERNAL",
  });

  return {
    botToken,
    ownerId: parseInt(ownerId, 10) || 0,
    classification,
  };
}
