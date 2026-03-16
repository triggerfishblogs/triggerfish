/**
 * LLM provider reconfiguration for the selective wizard.
 *
 * Prompts the user to change their LLM provider, model, API key,
 * and local endpoint, with connection verification and retry loop.
 *
 * @module
 */

import { Input } from "@cliffy/prompt";

import { readNestedConfigValue } from "./selective_config.ts";
import {
  promptLlmCredentials,
  promptLlmProviderChoice,
} from "./selective_llm_credentials.ts";
import {
  buildTriggerfishModelsConfig,
  collectTriggerfishLicenseKey,
  verifyTriggerfishKey,
} from "./selective_llm_triggerfish.ts";
import {
  buildLlmModelsConfig,
  type LlmVerifyState,
  verifyLlmConnection,
} from "./selective_llm_verify.ts";

import { DEFAULT_MODELS } from "../wizard/wizard_types.ts";

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

  // Triggerfish Gateway has its own setup flow
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
