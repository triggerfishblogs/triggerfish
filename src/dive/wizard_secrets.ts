/**
 * Store wizard-collected secrets in the OS keychain.
 *
 * @module
 */

import { createKeychain } from "../core/secrets/keychain/keychain.ts";
import type { SecretStore } from "../core/secrets/keychain/keychain.ts";
import type { WizardAnswers } from "./wizard_types.ts";

/**
 * Store all collected API keys and tokens in the OS keychain.
 *
 * Uses the canonical key names that match the `secret:` references
 * written into triggerfish.yaml by `generateConfig()`.
 *
 * @param answers - Wizard answers containing plaintext secret values
 * @param store - Secret store to write to (defaults to OS keychain)
 * @returns Array of canonical keys that were stored
 */
export async function storeWizardSecrets(
  answers: WizardAnswers,
  store?: SecretStore,
): Promise<string[]> {
  const s = store ?? createKeychain();
  const stored: string[] = [];

  // Provider API key
  if (
    answers.apiKey.length > 0 &&
    answers.provider !== "ollama" &&
    answers.provider !== "lmstudio"
  ) {
    const key = `provider:${answers.provider}:apiKey`;
    await s.setSecret(key, answers.apiKey);
    stored.push(key);
  }

  // Telegram bot token
  if (answers.telegramBotToken.length > 0) {
    const key = "telegram:botToken";
    await s.setSecret(key, answers.telegramBotToken);
    stored.push(key);
  }

  // Discord bot token
  if (answers.discordBotToken.length > 0) {
    const key = "discord:botToken";
    await s.setSecret(key, answers.discordBotToken);
    stored.push(key);
  }

  // Brave Search API key
  if (answers.searchProvider === "brave" && answers.searchApiKey.length > 0) {
    const key = "web:search:apiKey";
    await s.setSecret(key, answers.searchApiKey);
    stored.push(key);
  }

  return stored;
}
