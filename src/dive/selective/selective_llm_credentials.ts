/**
 * Provider selection and API key collection for the selective LLM wizard.
 *
 * @module
 */

import { Input, Select } from "@cliffy/prompt";

import type { ProviderChoice } from "../wizard/wizard_types.ts";
import { PROVIDER_LABELS } from "../wizard/wizard_types.ts";

// ── Provider selection ────────────────────────────────────────────────────────

/** Prompt the user to select an LLM provider from available options. */
export async function promptLlmProviderChoice(
  currentProvider: string,
): Promise<ProviderChoice> {
  return (await Select.prompt({
    message: "LLM provider",
    default: currentProvider || undefined,
    options: [
      { name: PROVIDER_LABELS.triggerfish, value: "triggerfish" },
      { name: PROVIDER_LABELS.anthropic, value: "anthropic" },
      { name: PROVIDER_LABELS.fireworks, value: "fireworks" },
      { name: PROVIDER_LABELS.google, value: "google" },
      { name: PROVIDER_LABELS.lmstudio, value: "lmstudio" },
      { name: PROVIDER_LABELS.ollama, value: "ollama" },
      { name: PROVIDER_LABELS.openai, value: "openai" },
      { name: PROVIDER_LABELS.openrouter, value: "openrouter" },
      { name: PROVIDER_LABELS.zai, value: "zai" },
      { name: PROVIDER_LABELS.zenmux, value: "zenmux" },
    ],
  })) as ProviderChoice;
}

// ── API key collection ────────────────────────────────────────────────────────

/** Resolve the environment variable name for a cloud LLM provider's API key. */
function resolveApiKeyEnvVar(provider: ProviderChoice): string {
  const mapping: Partial<Record<ProviderChoice, string>> = {
    openai: "OPENAI_API_KEY",
    google: "GOOGLE_API_KEY",
    fireworks: "FIREWORKS_API_KEY",
    zenmux: "ZENMUX_API_KEY",
    zai: "ZAI_API_KEY",
  };
  return mapping[provider] ?? "OPENROUTER_API_KEY";
}

/** Prompt for Anthropic API key, preserving existing secret ref on empty input. */
async function promptAnthropicApiKey(existingApiKey: string): Promise<string> {
  const message = existingApiKey.length > 0
    ? "Anthropic API key (press Enter to keep existing)"
    : "Anthropic API key (or press Enter to configure later)";
  const entered = await Input.prompt({ message });
  return entered.length > 0 ? entered : existingApiKey;
}

/** Prompt for local provider endpoint (Ollama or LM Studio). */
async function promptLocalEndpoint(
  provider: ProviderChoice,
  currentEndpoint: string,
): Promise<string> {
  const defaultEndpoint = provider === "lmstudio"
    ? "http://localhost:1234"
    : "http://localhost:11434";

  console.log("  \u2713 Local provider \u2014 no API key needed");
  return await Input.prompt({
    message: `${provider === "ollama" ? "Ollama" : "LM Studio"} endpoint`,
    default: currentEndpoint || defaultEndpoint,
  });
}

/** Prompt for a cloud provider API key, preserving existing secret ref on empty input. */
async function promptCloudApiKey(
  provider: ProviderChoice,
  existingApiKey: string,
): Promise<string> {
  const envVarName = resolveApiKeyEnvVar(provider);
  const envKey = Deno.env.get(envVarName) ?? "";
  if (envKey.length > 0) {
    console.log(`  \u2713 Detected ${envVarName} in environment`);
    return envKey;
  }
  const message = existingApiKey.length > 0
    ? "API key (press Enter to keep existing)"
    : `API key (or press Enter to set ${envVarName} later)`;
  const entered = await Input.prompt({ message });
  return entered.length > 0 ? entered : existingApiKey;
}

/** Prompt for API key and local endpoint based on the chosen provider. */
export async function promptLlmCredentials(
  provider: ProviderChoice,
  currentEndpoint: string,
  existingApiKey: string,
): Promise<{ apiKey: string; localEndpoint: string }> {
  let apiKey = "";
  let localEndpoint = currentEndpoint || "http://localhost:11434";

  if (provider === "anthropic") {
    apiKey = await promptAnthropicApiKey(existingApiKey);
  } else if (provider === "ollama" || provider === "lmstudio") {
    localEndpoint = await promptLocalEndpoint(provider, localEndpoint);
  } else {
    apiKey = await promptCloudApiKey(provider, existingApiKey);
  }

  return { apiKey, localEndpoint };
}
