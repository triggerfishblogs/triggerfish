/**
 * LLM connection verification with retry loop for the dive wizard.
 *
 * @module
 */

import { Input, Select } from "@cliffy/prompt";

import { verifyProvider } from "../verify.ts";

import type { ProviderChoice } from "./wizard_types.ts";

// ── Mutable state for verify loop ─────────────────────────────────────────────

/** Mutable state passed through the verification retry loop. */
interface VerifyLoopState {
  apiKey: string;
  providerModel: string;
  localEndpoint: string;
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
export async function verifyLlmConnection(options: {
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
