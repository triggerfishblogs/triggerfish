/**
 * LLM connection verification with retry loop for the selective wizard.
 *
 * @module
 */

import { Input, Select } from "@cliffy/prompt";

import { createKeychain } from "../../core/secrets/keychain/keychain.ts";
import { verifyProvider } from "../verify.ts";

import type { ProviderChoice } from "../wizard/wizard_types.ts";

// ── Connection verification ───────────────────────────────────────────────────

/** Mutable state passed through the LLM verification retry loop. */
export interface LlmVerifyState {
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
export async function verifyLlmConnection(
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
export async function buildLlmModelsConfig(
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
