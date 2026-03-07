/**
 * LLM provider reconfiguration for the selective wizard.
 *
 * Prompts the user to change their LLM provider, model, API key,
 * and local endpoint, with connection verification and retry loop.
 *
 * @module
 */

import { Input, Select } from "@cliffy/prompt";

import { createKeychain } from "../../core/secrets/keychain/keychain.ts";
import { verifyProvider } from "../verify.ts";
import {
  openInBrowser,
  resolveGatewayUrl,
  startCallbackServer,
  validateLicenseKey,
} from "../cloud.ts";
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
async function promptLlmCredentials(
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

/** Resolve a secret ref to the actual plaintext key for verification. */
async function resolveApiKeyForVerification(apiKey: string): Promise<string> {
  if (!apiKey.startsWith("secret:")) return apiKey;
  const keychainKey = apiKey.slice("secret:".length);
  const store = createKeychain();
  const result = await store.getSecret(keychainKey);
  return result.ok ? result.value : "";
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
    const verifyKey = isLocal
      ? ""
      : await resolveApiKeyForVerification(state.apiKey);
    const result = await verifyProvider(
      provider,
      verifyKey,
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

/**
 * Store a new plaintext API key in the keychain and return its secret ref.
 *
 * If the key is already a `secret:` ref (preserved from existing config),
 * returns it unchanged.
 */
async function resolveApiKeyForConfig(
  provider: ProviderChoice,
  apiKey: string,
): Promise<string> {
  if (apiKey.length === 0) return "";
  if (apiKey.startsWith("secret:")) return apiKey;
  const keychainKey = `provider:${provider}:apiKey`;
  const store = createKeychain();
  await store.setSecret(keychainKey, apiKey);
  return `secret:${keychainKey}`;
}

/** Build the final models config section from collected LLM settings. */
async function buildLlmModelsConfig(
  provider: ProviderChoice,
  state: LlmVerifyState,
): Promise<Record<string, unknown>> {
  const providers: Record<string, Record<string, string>> = {};
  if (provider === "ollama" || provider === "lmstudio") {
    providers[provider] = {
      model: state.providerModel,
      endpoint: state.localEndpoint,
    };
  } else {
    const pc: Record<string, string> = { model: state.providerModel };
    const ref = await resolveApiKeyForConfig(provider, state.apiKey);
    if (ref.length > 0) pc["apiKey"] = ref;
    providers[provider] = pc;
  }

  return {
    primary: { provider, model: state.providerModel },
    providers,
  };
}

// ── Public entry point ────────────────────────────────────────────────────────

// ── Triggerfish Cloud setup ──────────────────────────────────────────────────

/** Collect a Triggerfish Cloud license key via interactive setup. */
async function collectTriggerfishLicenseKey(
  existingKey: string,
): Promise<{ licenseKey: string; gatewayUrl: string }> {
  console.log("");
  console.log("  Triggerfish Cloud handles LLM routing, model selection,");
  console.log("  and includes web search — no other API keys needed.");
  console.log("");

  const setupMethod = await Select.prompt({
    message: "How would you like to set up Triggerfish Cloud?",
    options: [
      { name: "I'm a new customer — sign up", value: "new" },
      { name: "I'm a returning customer — get my key", value: "returning" },
      { name: "I already have a license key", value: "paste" },
      ...(existingKey.length > 0
        ? [{ name: "Keep existing key", value: "keep" }]
        : []),
    ],
  });

  if (setupMethod === "keep") {
    const resolved = await resolveExistingLicenseKey(existingKey);
    return { licenseKey: resolved, gatewayUrl: resolveGatewayUrl(resolved) };
  }

  if (setupMethod === "paste") {
    return await promptTriggerfishKeyDirect();
  }

  if (setupMethod === "new") {
    return await promptTriggerfishKeyViaCheckout();
  }

  return await promptTriggerfishKeyViaMagicLink();
}

/** Resolve an existing license key from a secret ref or return as-is. */
async function resolveExistingLicenseKey(key: string): Promise<string> {
  if (!key.startsWith("secret:")) return key;
  const store = createKeychain();
  const result = await store.getSecret(key.slice("secret:".length));
  return result.ok ? result.value : "";
}

/** Prompt the user to paste a license key directly. */
async function promptTriggerfishKeyDirect(): Promise<{
  licenseKey: string;
  gatewayUrl: string;
}> {
  const licenseKey = await Input.prompt({
    message: "Paste your license key (tf_live_... or tf_test_...)",
  });
  return { licenseKey, gatewayUrl: resolveGatewayUrl(licenseKey) };
}

/** Run the new-customer checkout flow and await the callback key. */
async function promptTriggerfishKeyViaCheckout(): Promise<{
  licenseKey: string;
  gatewayUrl: string;
}> {
  const gatewayUrl = Deno.env.get("TRIGGERFISH_GATEWAY_URL") ??
    "https://api.trigger.fish";
  const ac = new AbortController();
  const flowId = crypto.randomUUID();
  const server = startCallbackServer(ac.signal, flowId);

  try {
    const { createCheckoutSession } = await import("../cloud.ts");
    const result = await createCheckoutSession(
      gatewayUrl,
      flowId,
      server.port,
    );

    if (!result.ok) {
      console.log(`  \u2717 ${result.error}`);
      console.log("  Falling back to manual key entry.");
      return await promptTriggerfishKeyDirect();
    }

    console.log("");
    console.log("  Opening checkout in your browser...");
    await openInBrowser(result.value.checkout_url);
    console.log("  Waiting for setup to complete...");
    console.log("  (Press Ctrl+C to cancel)");
    console.log("");

    const licenseKey = await server.keyPromise;
    console.log("  \u2713 License key received!");
    return { licenseKey, gatewayUrl: resolveGatewayUrl(licenseKey) };
  } catch {
    console.log("  Setup was cancelled or timed out.");
    console.log("  Falling back to manual key entry.");
    return await promptTriggerfishKeyDirect();
  } finally {
    ac.abort();
    server.close();
  }
}

/** Run the returning-customer magic link flow and await the callback key. */
async function promptTriggerfishKeyViaMagicLink(): Promise<{
  licenseKey: string;
  gatewayUrl: string;
}> {
  const gatewayUrl = Deno.env.get("TRIGGERFISH_GATEWAY_URL") ??
    "https://api.trigger.fish";
  const email = await Input.prompt({
    message: "Email address on your Triggerfish account",
  });

  const ac = new AbortController();
  const flowId = crypto.randomUUID();
  const server = startCallbackServer(ac.signal, flowId);

  try {
    const { sendMagicLink } = await import("../cloud.ts");
    const result = await sendMagicLink(
      gatewayUrl,
      email,
      flowId,
      server.port,
    );

    if (!result.ok) {
      console.log(`  \u2717 ${result.error}`);
      console.log("  Falling back to manual key entry.");
      return await promptTriggerfishKeyDirect();
    }

    console.log("");
    console.log("  Magic link sent! Check your email and click the link.");
    console.log("  Waiting for setup to complete...");
    console.log("  (Press Ctrl+C to cancel)");
    console.log("");

    const licenseKey = await server.keyPromise;
    console.log("  \u2713 License key received!");
    return { licenseKey, gatewayUrl: resolveGatewayUrl(licenseKey) };
  } catch {
    console.log("  Setup was cancelled or timed out.");
    console.log("  Falling back to manual key entry.");
    return await promptTriggerfishKeyDirect();
  } finally {
    ac.abort();
    server.close();
  }
}

/** Validate a Triggerfish license key with retry. */
async function verifyTriggerfishKey(
  licenseKey: string,
  gatewayUrl: string,
): Promise<{ licenseKey: string; gatewayUrl: string }> {
  if (licenseKey.length === 0) return { licenseKey, gatewayUrl };

  let currentKey = licenseKey;
  let currentGateway = gatewayUrl;

  while (true) {
    console.log("");
    console.log("  Validating license key...");
    const result = await validateLicenseKey(currentGateway, currentKey);

    if (result.ok && result.value.valid) {
      const plan = result.value.plan ?? "unknown";
      console.log(`  \u2713 License valid (plan: ${plan})`);
      return { licenseKey: currentKey, gatewayUrl: currentGateway };
    }

    const errorMsg = result.ok ? "License is not active" : result.error;
    console.log(`  \u2717 ${errorMsg}`);
    console.log("");

    const action = await Select.prompt({
      message: "What would you like to do?",
      options: [
        { name: "Re-enter license key", value: "reenter" },
        { name: "Keep this key anyway", value: "keep" },
      ],
    });

    if (action === "keep") {
      return { licenseKey: currentKey, gatewayUrl: currentGateway };
    }

    currentKey = await Input.prompt({
      message: "License key (tf_live_... or tf_test_...)",
    });
    currentGateway = resolveGatewayUrl(currentKey);
  }
}

/** Build models config for Triggerfish Cloud provider. */
async function buildTriggerfishModelsConfig(
  licenseKey: string,
  gatewayUrl: string,
): Promise<Record<string, unknown>> {
  const providers: Record<string, Record<string, string>> = {};
  const cfg: Record<string, string> = {};
  if (gatewayUrl.length > 0) cfg["gatewayUrl"] = gatewayUrl;
  if (licenseKey.length > 0) {
    const store = createKeychain();
    await store.setSecret("cloud:licenseKey", licenseKey);
    cfg["licenseKey"] = "secret:cloud:licenseKey";
  }
  providers["triggerfish"] = cfg;

  return {
    primary: { provider: "triggerfish", model: "auto" },
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

  // Triggerfish Cloud has its own setup flow
  if (provider === "triggerfish") {
    const existingKey = (readNestedConfigValue(
      existingConfig,
      "models.providers.triggerfish.licenseKey",
    ) as string | undefined) ?? "";
    const { licenseKey, gatewayUrl } = await collectTriggerfishLicenseKey(
      existingKey,
    );
    const verified = await verifyTriggerfishKey(licenseKey, gatewayUrl);
    return await buildTriggerfishModelsConfig(
      verified.licenseKey,
      verified.gatewayUrl,
    );
  }

  const providerModel = await Input.prompt({
    message: "Model name",
    default: currentModel || DEFAULT_MODELS[provider],
  });

  const currentEndpoint = (readNestedConfigValue(
    existingConfig,
    `models.providers.${provider}.endpoint`,
  ) as string | undefined) ?? "";
  const currentApiKey = (readNestedConfigValue(
    existingConfig,
    `models.providers.${provider}.apiKey`,
  ) as string | undefined) ?? "";

  const credentials = await promptLlmCredentials(
    provider,
    currentEndpoint,
    currentApiKey,
  );
  const state: LlmVerifyState = {
    apiKey: credentials.apiKey,
    providerModel,
    localEndpoint: credentials.localEndpoint,
  };

  await verifyLlmConnection(provider, state);
  return await buildLlmModelsConfig(provider, state);
}
