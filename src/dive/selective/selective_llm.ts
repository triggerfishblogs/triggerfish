/**
 * LLM provider reconfiguration for the selective wizard.
 *
 * Prompts the user to change their LLM provider, model, API key,
 * and local endpoint, with connection verification and retry loop.
 *
 * @module
 */

import { Input, Select } from "@cliffy/prompt";

import { verifyProvider } from "../verify.ts";
import { readNestedConfigValue } from "./selective_config.ts";

import type { ProviderChoice } from "../wizard/wizard_types.ts";
import { DEFAULT_MODELS, PROVIDER_LABELS } from "../wizard/wizard_types.ts";

// ── Provider selection ────────────────────────────────────────────────────────

/** Prompt the user to select an LLM provider from available options. */
async function promptLlmProviderChoice(
  currentProvider: string,
): Promise<ProviderChoice> {
  return (await Select.prompt({
    message: "LLM provider",
    default: currentProvider || undefined,
    options: [
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

/** Prompt for Anthropic API key specifically. */
async function promptAnthropicApiKey(): Promise<string> {
  return await Input.prompt({
    message: "Anthropic API key (or press Enter to keep existing)",
  });
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

/** Prompt for a cloud provider API key, detecting environment variables. */
async function promptCloudApiKey(provider: ProviderChoice): Promise<string> {
  const envVarName = resolveApiKeyEnvVar(provider);
  const existingKey = Deno.env.get(envVarName) ?? "";
  if (existingKey.length > 0) {
    console.log(`  \u2713 Detected ${envVarName} in environment`);
    return existingKey;
  }
  return await Input.prompt({
    message: `API key (or press Enter to set ${envVarName} later)`,
  });
}

/** Prompt for API key and local endpoint based on the chosen provider. */
async function promptLlmCredentials(
  provider: ProviderChoice,
  currentEndpoint: string,
): Promise<{ apiKey: string; localEndpoint: string }> {
  let apiKey = "";
  let localEndpoint = currentEndpoint || "http://localhost:11434";

  if (provider === "anthropic") {
    apiKey = await promptAnthropicApiKey();
  } else if (provider === "ollama" || provider === "lmstudio") {
    localEndpoint = await promptLocalEndpoint(provider, localEndpoint);
  } else {
    apiKey = await promptCloudApiKey(provider);
  }

  return { apiKey, localEndpoint };
}

// ── Connection verification ───────────────────────────────────────────────────

/** Mutable state passed through the LLM verification retry loop. */
interface LlmVerifyState {
  apiKey: string;
  providerModel: string;
  localEndpoint: string;
}

/** Build the retry-action prompt options based on provider type. */
function buildLlmRetryOptions(
  provider: ProviderChoice,
): Array<{ name: string; value: string }> {
  const options: Array<{ name: string; value: string }> = [];
  if (provider === "ollama" || provider === "lmstudio") {
    options.push({ name: "Re-enter endpoint", value: "endpoint" });
  } else {
    options.push({ name: "Re-enter API key", value: "apikey" });
  }
  options.push({ name: "Re-enter model name", value: "model" });
  options.push({ name: "Keep this setting anyway", value: "keep" });
  return options;
}

/** Apply user's chosen retry action by re-prompting the relevant field. */
async function applyLlmRetryAction(
  action: string,
  provider: ProviderChoice,
  state: LlmVerifyState,
): Promise<void> {
  if (action === "endpoint") {
    state.localEndpoint = await Input.prompt({
      message: "Endpoint URL",
      default: state.localEndpoint,
    });
  } else if (action === "model") {
    state.providerModel = await Input.prompt({
      message: "Model name",
      default: state.providerModel,
    });
  } else {
    state.apiKey = await Input.prompt({
      message: provider === "anthropic" ? "Anthropic API key" : "API key",
    });
  }
}

/** Verify LLM connection in a retry loop, updating state on each attempt. */
async function verifyLlmConnection(
  provider: ProviderChoice,
  state: LlmVerifyState,
): Promise<void> {
  const isLocal = provider === "ollama" || provider === "lmstudio";
  const shouldVerify = isLocal || state.apiKey.length > 0;
  if (!shouldVerify) return;

  let verified = false;
  while (!verified) {
    console.log("");
    console.log("  Verifying connection...");
    const endpoint = isLocal ? state.localEndpoint : undefined;
    const result = await verifyProvider(
      provider,
      state.apiKey,
      state.providerModel,
      endpoint,
    );
    if (result.ok) {
      console.log("  \u2713 Connection verified");
      verified = true;
    } else {
      console.log(`  \u2717 ${result.error}`);
      console.log("");
      const action = await Select.prompt({
        message: "What would you like to do?",
        options: buildLlmRetryOptions(provider),
      });
      if (action === "keep") {
        verified = true;
      } else {
        await applyLlmRetryAction(action, provider, state);
      }
    }
  }
}

// ── Config building ───────────────────────────────────────────────────────────

/** Build the final models config section from collected LLM settings. */
function buildLlmModelsConfig(
  provider: ProviderChoice,
  state: LlmVerifyState,
): Record<string, unknown> {
  const providers: Record<string, Record<string, string>> = {};
  if (provider === "ollama" || provider === "lmstudio") {
    providers[provider] = {
      model: state.providerModel,
      endpoint: state.localEndpoint,
    };
  } else {
    const pc: Record<string, string> = { model: state.providerModel };
    if (state.apiKey.length > 0) pc["apiKey"] = state.apiKey;
    providers[provider] = pc;
  }

  return {
    primary: { provider, model: state.providerModel },
    providers,
  };
}

// ── Public entry point ────────────────────────────────────────────────────────

/** Reconfigure the LLM provider section interactively. */
export async function reconfigureLlmProvider(
  existingConfig: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  console.log("");
  console.log("  LLM Provider");
  console.log("");

  const currentProvider = (readNestedConfigValue(
    existingConfig,
    "models.primary.provider",
  ) as string | undefined) ?? "";
  const currentModel = (readNestedConfigValue(
    existingConfig,
    "models.primary.model",
  ) as string | undefined) ?? "";

  const provider = await promptLlmProviderChoice(currentProvider);

  const providerModel = await Input.prompt({
    message: "Model name",
    default: currentModel || DEFAULT_MODELS[provider],
  });

  const currentEndpoint = (readNestedConfigValue(
    existingConfig,
    `models.providers.${provider}.endpoint`,
  ) as string | undefined) ?? "";

  const credentials = await promptLlmCredentials(provider, currentEndpoint);
  const state: LlmVerifyState = {
    apiKey: credentials.apiKey,
    providerModel,
    localEndpoint: credentials.localEndpoint,
  };

  await verifyLlmConnection(provider, state);
  return buildLlmModelsConfig(provider, state);
}
