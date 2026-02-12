/**
 * Provider configuration loader.
 *
 * Parses triggerfish.yaml provider config and instantiates the
 * appropriate LLM providers, registering them in the provider registry.
 *
 * @module
 */

import type { LlmProviderRegistry } from "../llm.ts";
import { createAnthropicProvider } from "./anthropic.ts";
import { createOpenAiProvider } from "./openai.ts";
import { createGoogleProvider } from "./google.ts";
import { createLocalProvider } from "./local.ts";
import { createOpenRouterProvider } from "./openrouter.ts";
import { createZenMuxProvider } from "./zenmux.ts";
import { createZaiProvider } from "./zai.ts";

/** Provider block from triggerfish.yaml. */
export interface ProvidersConfig {
  readonly anthropic?: { readonly model?: string; readonly apiKey?: string };
  readonly openai?: { readonly model?: string; readonly apiKey?: string };
  readonly google?: { readonly model?: string; readonly apiKey?: string };
  readonly local?: { readonly endpoint?: string; readonly model: string };
  readonly openrouter?: { readonly model: string; readonly apiKey?: string };
  readonly zenmux?: { readonly model: string; readonly apiKey?: string };
  readonly zai?: { readonly model: string; readonly apiKey?: string };
}

/** Full models section from triggerfish.yaml. */
export interface ModelsConfig {
  readonly primary: string;
  readonly providers: ProvidersConfig;
}

/**
 * Load providers from config and register them in the registry.
 *
 * Instantiates each configured provider and sets the default based
 * on models.primary. The primary field maps to a provider name:
 * - Starts with "claude" → anthropic
 * - Starts with "gpt" or "o1" or "o3" → openai
 * - Starts with "gemini" → google
 * - Otherwise checks explicit provider names
 *
 * @param modelsConfig - The models section from triggerfish.yaml
 * @param registry - The provider registry to populate
 */
export function loadProvidersFromConfig(
  modelsConfig: ModelsConfig,
  registry: LlmProviderRegistry,
): void {
  const providers = modelsConfig.providers;

  if (providers.anthropic) {
    registry.register(createAnthropicProvider({
      model: providers.anthropic.model,
      apiKey: providers.anthropic.apiKey,
    }));
  }

  if (providers.openai) {
    registry.register(createOpenAiProvider({
      model: providers.openai.model,
      apiKey: providers.openai.apiKey,
    }));
  }

  if (providers.google) {
    registry.register(createGoogleProvider({
      model: providers.google.model,
      apiKey: providers.google.apiKey,
    }));
  }

  if (providers.local) {
    registry.register(createLocalProvider({
      endpoint: providers.local.endpoint,
      model: providers.local.model,
    }));
  }

  if (providers.openrouter) {
    registry.register(createOpenRouterProvider({
      model: providers.openrouter.model,
      apiKey: providers.openrouter.apiKey,
    }));
  }

  if (providers.zenmux) {
    registry.register(createZenMuxProvider({
      model: providers.zenmux.model,
      apiKey: providers.zenmux.apiKey,
    }));
  }

  if (providers.zai) {
    registry.register(createZaiProvider({
      model: providers.zai.model,
      apiKey: providers.zai.apiKey,
    }));
  }

  // Resolve default provider from models.primary model name
  const primary = modelsConfig.primary.toLowerCase();
  const defaultProvider = resolveProviderName(primary);
  if (defaultProvider && registry.get(defaultProvider)) {
    registry.setDefault(defaultProvider);
  }
}

/**
 * Resolve a model name to its provider name.
 *
 * @param modelName - The model identifier (e.g. "claude-sonnet-4-5")
 * @returns The provider name, or undefined if unrecognized
 */
function resolveProviderName(modelName: string): string | undefined {
  if (modelName.startsWith("claude")) return "anthropic";
  if (modelName.startsWith("gpt") || modelName.startsWith("o1") || modelName.startsWith("o3")) {
    return "openai";
  }
  if (modelName.startsWith("gemini")) return "google";
  if (modelName.startsWith("glm")) return "zai";
  if (modelName.includes("/")) return "openrouter"; // e.g. "anthropic/claude-3.5-sonnet"

  // Check for explicit provider names
  const knownProviders = ["anthropic", "openai", "google", "local", "openrouter", "zenmux", "zai"];
  if (knownProviders.includes(modelName)) return modelName;

  return undefined;
}
