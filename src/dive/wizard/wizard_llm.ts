/**
 * LLM provider selection step for the dive wizard.
 *
 * Handles provider choice, API key / endpoint collection,
 * and connection verification with retry loop.
 *
 * @module
 */

import { collectLlmApiKey, selectLlmProvider } from "./wizard_llm_provider.ts";
import {
  collectTriggerfishLicenseKey,
  verifyTriggerfishKey,
} from "./wizard_llm_triggerfish.ts";
import { verifyLlmConnection } from "./wizard_llm_verify.ts";

import type { ProviderChoice } from "./wizard_types.ts";

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

// ── Step entry point ──────────────────────────────────────────────────────────

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
