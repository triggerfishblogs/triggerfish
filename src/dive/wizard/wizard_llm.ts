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
import {
  openInBrowser,
  resolveGatewayUrl,
  startCallbackServer,
  validateLicenseKey,
} from "../cloud.ts";

import type { ProviderChoice } from "./wizard_types.ts";
import { DEFAULT_MODELS, PROVIDER_LABELS } from "./wizard_types.ts";

// ── Result type ───────────────────────────────────────────────────────────────

/** Result of the LLM provider selection step. */
export interface LlmProviderResult {
  readonly provider: ProviderChoice;
  readonly providerModel: string;
  readonly apiKey: string;
  readonly localEndpoint: string;
  readonly licenseKey: string;
  readonly gatewayUrl: string;
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

// ── Triggerfish Gateway setup ──────────────────────────────────────────────────

/** Collect a Triggerfish Gateway license key via interactive setup. */
async function collectTriggerfishLicenseKey(): Promise<{
  licenseKey: string;
  gatewayUrl: string;
}> {
  console.log("");
  console.log("  Triggerfish Gateway handles LLM routing, model selection,");
  console.log("  and includes web search — no other API keys needed.");
  console.log("");

  const setupMethod = await Select.prompt({
    message: "How would you like to set up Triggerfish Gateway?",
    options: [
      { name: "I'm a new customer — sign up", value: "new" },
      { name: "I'm a returning customer — get my key", value: "returning" },
      { name: "I already have a license key", value: "paste" },
    ],
  });

  if (setupMethod === "paste") {
    return await collectTriggerfishKeyDirect();
  }

  if (setupMethod === "new") {
    return await collectTriggerfishKeyViaCheckout();
  }

  return await collectTriggerfishKeyViaMagicLink();
}

/** Collect a license key directly by pasting. */
async function collectTriggerfishKeyDirect(): Promise<{
  licenseKey: string;
  gatewayUrl: string;
}> {
  const licenseKey = await Input.prompt({
    message: "Paste your license key (tf_live_... or tf_test_...)",
  });
  const gatewayUrl = resolveGatewayUrl(licenseKey);
  return { licenseKey, gatewayUrl };
}

/** Collect a license key via new customer checkout flow. */
async function collectTriggerfishKeyViaCheckout(): Promise<{
  licenseKey: string;
  gatewayUrl: string;
}> {
  const gatewayUrl = Deno.env.get("TRIGGERFISH_GATEWAY_URL") ??
    "https://api.trigger.fish";
  const siteUrl = Deno.env.get("TRIGGERFISH_SITE_URL") ??
    "https://trigger.fish";
  const ac = new AbortController();
  const flowId = crypto.randomUUID();
  const server = startCallbackServer(ac.signal, flowId);

  try {
    const pricingUrl =
      `${siteUrl}/pricing?flow_id=${flowId}&port=${server.port}&gateway=${encodeURIComponent(gatewayUrl)}`;

    console.log("");
    console.log("  Opening the pricing page in your browser...");
    console.log("  Choose a plan and complete checkout.");
    await openInBrowser(pricingUrl);
    console.log("  Waiting for setup to complete...");
    console.log("  (Press Ctrl+C to cancel)");
    console.log("");

    const licenseKey = await server.keyPromise;
    console.log("  \u2713 License key received!");
    // Let the callback response reach the browser before shutting down
    await new Promise((r) => setTimeout(r, 1000));
    return { licenseKey, gatewayUrl: resolveGatewayUrl(licenseKey) };
  } catch {
    console.log("  Setup was cancelled or timed out.");
    console.log("  Falling back to manual key entry.");
    return await collectTriggerfishKeyDirect();
  } finally {
    ac.abort();
    server.close();
  }
}

/** Collect a license key via returning customer magic link. */
async function collectTriggerfishKeyViaMagicLink(): Promise<{
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
      return await collectTriggerfishKeyDirect();
    }

    console.log("");
    console.log("  Magic link sent! Check your email and click the link.");
    console.log("  Waiting for setup to complete...");
    console.log("  (Press Ctrl+C to cancel)");
    console.log("");

    const licenseKey = await server.keyPromise;
    console.log("  \u2713 License key received!");
    // Let the callback response reach the browser before shutting down
    await new Promise((r) => setTimeout(r, 1000));
    return { licenseKey, gatewayUrl: resolveGatewayUrl(licenseKey) };
  } catch {
    console.log("  Setup was cancelled or timed out.");
    console.log("  Falling back to manual key entry.");
    return await collectTriggerfishKeyDirect();
  } finally {
    ac.abort();
    server.close();
  }
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

/** Verify a Triggerfish Gateway license key with retry loop. */
async function verifyTriggerfishKey(
  licenseKey: string,
  gatewayUrl: string,
): Promise<{ licenseKey: string; gatewayUrl: string }> {
  if (licenseKey.length === 0) {
    return { licenseKey, gatewayUrl };
  }

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

/** Run the LLM provider selection wizard step (Step 1/8). */
export async function promptLlmProviderStep(): Promise<LlmProviderResult> {
  console.log("  Step 1/8: Choose your LLM provider");
  console.log("");

  const { provider, providerModel } = await selectLlmProvider();

  // Triggerfish Gateway has its own setup flow
  if (provider === "triggerfish") {
    const { licenseKey, gatewayUrl } = await collectTriggerfishLicenseKey();
    const verified = await verifyTriggerfishKey(licenseKey, gatewayUrl);
    return {
      provider,
      providerModel: "auto",
      apiKey: "",
      localEndpoint: "http://localhost:11434",
      licenseKey: verified.licenseKey,
      gatewayUrl: verified.gatewayUrl,
    };
  }

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
    licenseKey: "",
    gatewayUrl: "",
  };
}
