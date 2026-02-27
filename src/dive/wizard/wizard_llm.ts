/**
 * LLM provider selection step for the dive wizard.
 *
 * Handles provider choice, API key / endpoint collection,
 * and connection verification with retry loop.
 *
 * @module
 */

import { Input, Select } from "@cliffy/prompt";

import { verifyProvider } from "../verify.ts";

import type { ProviderChoice } from "./wizard_types.ts";
import { DEFAULT_MODELS, PROVIDER_LABELS } from "./wizard_types.ts";

// ── Result type ───────────────────────────────────────────────────────────────

/** Result of the LLM provider selection step. */
export interface LlmProviderResult {
  readonly provider: ProviderChoice;
  readonly providerModel: string;
  readonly apiKey: string;
  readonly localEndpoint: string;
}

// ── Mutable state for verify loop ─────────────────────────────────────────────

interface VerifyLoopState {
  apiKey: string;
  providerModel: string;
  localEndpoint: string;
}

// ── Provider & model selection ────────────────────────────────────────────────

/** Prompt the user to choose an LLM provider and model name. */
async function selectLlmProvider(): Promise<{
  provider: ProviderChoice;
  providerModel: string;
}> {
  const provider = (await Select.prompt({
    message: "LLM provider",
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
async function collectLlmApiKey(
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

// ── Verification helpers ──────────────────────────────────────────────────────

/** Resolve the endpoint to pass to verifyProvider for local providers. */
function resolveVerifyEndpoint(
  provider: ProviderChoice,
  localEndpoint: string,
): string | undefined {
  return (provider === "ollama" || provider === "lmstudio")
    ? localEndpoint
    : undefined;
}

/** Determine whether verification should be attempted. */
function requiresVerification(
  provider: ProviderChoice,
  apiKey: string,
): boolean {
  return provider === "ollama" || provider === "lmstudio" ||
    apiKey.length > 0;
}

/** Attempt a single LLM verification call. Returns true on success. */
async function attemptLlmVerification(
  provider: ProviderChoice,
  state: VerifyLoopState,
): Promise<boolean> {
  console.log("");
  console.log("  Verifying connection...");
  const endpoint = resolveVerifyEndpoint(provider, state.localEndpoint);
  const result = await verifyProvider(
    provider,
    state.apiKey,
    state.providerModel,
    endpoint,
  );
  if (result.ok) {
    console.log("  \u2713 Connection verified");
    return true;
  }
  console.log(`  \u2717 ${result.error}`);
  console.log("");
  return false;
}

/** Prompt the user to choose a retry action after verification failure. */
async function promptVerifyRetryAction(
  provider: ProviderChoice,
): Promise<string> {
  const retryOptions: Array<{ name: string; value: string }> = [];
  if (provider === "ollama" || provider === "lmstudio") {
    retryOptions.push({ name: "Re-enter endpoint", value: "endpoint" });
  } else {
    retryOptions.push({ name: "Re-enter API key", value: "apikey" });
  }
  retryOptions.push({ name: "Re-enter model name", value: "model" });
  retryOptions.push({ name: "Keep this setting anyway", value: "keep" });

  return await Select.prompt({
    message: "What would you like to do?",
    options: retryOptions,
  });
}

/** Apply the chosen retry action, mutating state in place. Returns true to break the loop. */
async function applyVerifyRetryAction(
  provider: ProviderChoice,
  state: VerifyLoopState,
): Promise<boolean> {
  const action = await promptVerifyRetryAction(provider);
  if (action === "keep") return true;
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
  return false;
}

/** Verify the LLM connection in a retry loop, returning final settings. */
async function verifyLlmConnection(options: {
  provider: ProviderChoice;
  apiKey: string;
  providerModel: string;
  localEndpoint: string;
}): Promise<{ apiKey: string; providerModel: string; localEndpoint: string }> {
  const state: VerifyLoopState = {
    apiKey: options.apiKey,
    providerModel: options.providerModel,
    localEndpoint: options.localEndpoint,
  };

  if (!requiresVerification(options.provider, state.apiKey)) {
    return { ...state };
  }

  let verified = false;
  while (!verified) {
    verified = await attemptLlmVerification(options.provider, state);
    if (!verified) {
      verified = await applyVerifyRetryAction(options.provider, state);
    }
  }

  return { ...state };
}

// ── Step entry point ──────────────────────────────────────────────────────────

/** Run the LLM provider selection wizard step (Step 1/8). */
export async function promptLlmProviderStep(): Promise<LlmProviderResult> {
  console.log("  Step 1/8: Choose your LLM provider");
  console.log("");

  const { provider, providerModel } = await selectLlmProvider();
  const { apiKey, localEndpoint } = await collectLlmApiKey(provider);

  const verified = await verifyLlmConnection({
    provider,
    apiKey,
    providerModel,
    localEndpoint,
  });

  return {
    provider,
    providerModel: verified.providerModel,
    apiKey: verified.apiKey,
    localEndpoint: verified.localEndpoint,
  };
}
