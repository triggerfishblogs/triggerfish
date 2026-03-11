/**
 * Provider selection and API key collection for the dive wizard.
 *
 * @module
 */

import { Input, Select } from "@cliffy/prompt";

import type { ProviderChoice } from "./wizard_types.ts";
import { DEFAULT_MODELS, PROVIDER_LABELS } from "./wizard_types.ts";

// ── Provider & model selection ────────────────────────────────────────────────

/** Prompt the user to choose an LLM provider and model name. */
export async function selectLlmProvider(): Promise<{
  provider: ProviderChoice;
  providerModel: string;
}> {
  const provider = (await Select.prompt({
    message: "LLM provider",
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

  // Triggerfish Gateway manages models — no model prompt needed
  if (provider === "triggerfish") {
    return { provider, providerModel: "auto" };
  }

  const providerModel = await Input.prompt({
    message: "Model name",
    default: DEFAULT_MODELS[provider],
  });

  return { provider, providerModel };
}

// ── API key collection ────────────────────────────────────────────────────────

/** Map a cloud provider to its conventional environment variable name. */
function resolveEnvVarName(provider: ProviderChoice): string {
  if (provider === "openai") return "OPENAI_API_KEY";
  if (provider === "google") return "GOOGLE_API_KEY";
  if (provider === "fireworks") return "FIREWORKS_API_KEY";
  if (provider === "zenmux") return "ZENMUX_API_KEY";
  if (provider === "zai") return "ZAI_API_KEY";
  return "OPENROUTER_API_KEY";
}

/** Collect the local-provider endpoint (Ollama / LM Studio). */
async function collectLocalProviderEndpoint(
  provider: ProviderChoice,
): Promise<{ apiKey: string; localEndpoint: string }> {
  console.log("  \u2713 Local provider \u2014 no API key needed");
  const defaultEndpoint = provider === "ollama"
    ? "http://localhost:11434"
    : "http://localhost:1234";
  const localEndpoint = await Input.prompt({
    message: `${provider === "ollama" ? "Ollama" : "LM Studio"} endpoint`,
    default: defaultEndpoint,
  });
  return { apiKey: "", localEndpoint };
}

/** Detect or prompt for a cloud provider's API key. */
async function collectCloudProviderApiKey(
  provider: ProviderChoice,
): Promise<string> {
  const envVarName = resolveEnvVarName(provider);
  const existingKey = Deno.env.get(envVarName) ?? "";
  if (existingKey.length > 0) {
    console.log(`  \u2713 Detected ${envVarName} in environment`);
    return existingKey;
  }
  return await Input.prompt({
    message: `API key (or press Enter to set ${envVarName} later)`,
  });
}

/** Collect the API key (or endpoint for local providers). */
export async function collectLlmApiKey(
  provider: ProviderChoice,
): Promise<{ apiKey: string; localEndpoint: string }> {
  if (provider === "anthropic") {
    const apiKey = await Input.prompt({
      message: "Anthropic API key (or press Enter to configure later)",
    });
    return { apiKey, localEndpoint: "http://localhost:11434" };
  }
  if (provider === "ollama" || provider === "lmstudio") {
    return await collectLocalProviderEndpoint(provider);
  }
  const apiKey = await collectCloudProviderApiKey(provider);
  return { apiKey, localEndpoint: "http://localhost:11434" };
}
