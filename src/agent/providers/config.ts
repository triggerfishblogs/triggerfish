/**
 * Provider configuration loader.
 *
 * Parses triggerfish.yaml provider config and instantiates the
 * appropriate LLM providers, registering them in the provider registry.
 *
 * @module
 */

import type { LlmProviderRegistry, LlmProvider } from "../llm.ts";
import { createLogger } from "../../core/logger/logger.ts";
import { createAnthropicProvider } from "./anthropic.ts";
import { createOpenAiProvider } from "./openai.ts";
import { createGoogleProvider } from "./google/mod.ts";
import { createLocalProvider } from "./local.ts";
import { createOpenRouterProvider } from "./openrouter/mod.ts";
import { createZenMuxProvider } from "./zenmux.ts";
import { createZaiProvider } from "./zai.ts";

/** Provider block from triggerfish.yaml. */
export interface ProvidersConfig {
  readonly anthropic?: { readonly model?: string; readonly apiKey?: string };
  readonly openai?: { readonly model?: string; readonly apiKey?: string };
  readonly google?: { readonly model?: string; readonly apiKey?: string };
  readonly ollama?: { readonly endpoint?: string; readonly model: string };
  readonly lmstudio?: { readonly endpoint?: string; readonly model: string };
  readonly openrouter?: { readonly model: string; readonly apiKey?: string };
  readonly zenmux?: { readonly model: string; readonly apiKey?: string };
  readonly zai?: { readonly model: string; readonly apiKey?: string };
}

/** Explicit provider + model pair for the primary model. */
export interface PrimaryModelRef {
  readonly provider: string;
  readonly model: string;
}

/** Per-classification provider+model reference. */
export interface ClassificationModelRef {
  readonly provider: string;
  readonly model: string;
}

/** Full models section from triggerfish.yaml. */
export interface ModelsConfig {
  readonly primary: PrimaryModelRef;
  /** Optional vision model for describing images when the primary model lacks vision. */
  readonly vision?: string;
  /** Enable streaming responses from the LLM provider. Default: true. */
  readonly streaming?: boolean;
  readonly providers: ProvidersConfig;
  /**
   * Optional per-classification-level model overrides.
   * Unlisted levels fall back to `primary`.
   */
  readonly classification_models?: Readonly<
    Partial<Record<string, ClassificationModelRef>>
  >;
}

/**
 * Load providers from config and register them in the registry.
 *
 * Instantiates each configured provider and sets the default based
 * on models.primary.provider — the provider is explicit, no heuristics needed.
 *
 * @param modelsConfig - The models section from triggerfish.yaml
 * @param registry - The provider registry to populate
 */
export function loadProvidersFromConfig(
  modelsConfig: ModelsConfig,
  registry: LlmProviderRegistry,
): void {
  const log = createLogger("providers");
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

  if (providers.ollama) {
    registry.register(createLocalProvider({
      endpoint: providers.ollama.endpoint,
      model: providers.ollama.model,
    }));
  }

  if (providers.lmstudio) {
    registry.register(createLocalProvider({
      name: "lmstudio",
      endpoint: providers.lmstudio.endpoint ?? "http://localhost:1234",
      model: providers.lmstudio.model,
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

  // Set default provider directly from models.primary.provider
  const defaultProvider = modelsConfig.primary.provider;
  if (defaultProvider && registry.get(defaultProvider)) {
    registry.setDefault(defaultProvider);
    log.info("Primary provider set", { provider: defaultProvider, model: modelsConfig.primary.model });
  } else {
    log.warn("Primary provider not found in registry", { provider: defaultProvider });
  }

  // Register per-classification provider overrides
  if (modelsConfig.classification_models) {
    for (const [level, ref] of Object.entries(modelsConfig.classification_models)) {
      if (!ref) continue;
      const providerConfig = providers[ref.provider as keyof ProvidersConfig] as
        Readonly<Record<string, unknown>> | undefined;
      if (!providerConfig) {
        log.warn("Classification model provider not configured", {
          operation: "loadClassificationOverride",
          level,
          provider: ref.provider,
        });
        continue;
      }
      const overrideProvider = createProviderByName(ref.provider, providerConfig, ref.model);
      if (overrideProvider) {
        registry.registerClassificationOverride(level, overrideProvider);
        log.info("Classification model override registered", {
          operation: "loadClassificationOverride",
          level,
          provider: ref.provider,
          model: ref.model,
        });
      } else {
        log.warn("Classification model provider creation failed", {
          operation: "loadClassificationOverride",
          level,
          provider: ref.provider,
        });
      }
    }
  }
}

/**
 * Create a provider instance by name with a specific model override.
 *
 * Dispatches to the appropriate factory function based on provider name,
 * reusing credentials from the provider config block.
 */
function createProviderByName(
  providerName: string,
  providerConfig: Readonly<Record<string, unknown>>,
  model: string,
): LlmProvider | undefined {
  const apiKey = providerConfig.apiKey as string | undefined;
  switch (providerName) {
    case "anthropic":
      return createAnthropicProvider({ model, apiKey });
    case "openai":
      return createOpenAiProvider({ model, apiKey });
    case "google":
      return createGoogleProvider({ model, apiKey });
    case "zai":
      return createZaiProvider({ model, apiKey });
    case "openrouter":
      return createOpenRouterProvider({ model, apiKey });
    case "zenmux":
      return createZenMuxProvider({ model, apiKey });
    case "ollama":
      return createLocalProvider({
        model,
        endpoint: providerConfig.endpoint as string | undefined,
      });
    case "lmstudio":
      return createLocalProvider({
        name: "lmstudio",
        model,
        endpoint: providerConfig.endpoint as string | undefined ?? "http://localhost:1234",
      });
    default:
      return undefined;
  }
}

/**
 * Create a provider instance configured for a specific model.
 *
 * Used to create a dedicated vision provider that shares credentials
 * with an existing provider but uses a different model.
 */
function createProviderForVision(
  providerName: string,
  providerConfig: Readonly<Record<string, unknown>>,
  visionModel: string,
): LlmProvider | undefined {
  const apiKey = providerConfig.apiKey as string | undefined;
  switch (providerName) {
    case "anthropic":
      return createAnthropicProvider({ model: visionModel, apiKey });
    case "openai":
      return createOpenAiProvider({ model: visionModel, apiKey });
    case "google":
      return createGoogleProvider({ model: visionModel, apiKey });
    case "zai":
      return createZaiProvider({ model: visionModel, apiKey });
    case "openrouter":
      return createOpenRouterProvider({ model: visionModel, apiKey });
    case "zenmux":
      return createZenMuxProvider({ model: visionModel, apiKey });
    case "ollama":
      return createLocalProvider({
        model: visionModel,
        endpoint: providerConfig.endpoint as string | undefined,
      });
    case "lmstudio":
      return createLocalProvider({
        name: "lmstudio",
        model: visionModel,
        endpoint: providerConfig.endpoint as string | undefined ?? "http://localhost:1234",
      });
    default:
      return undefined;
  }
}

/**
 * Resolve the vision provider from config.
 *
 * Creates a dedicated LlmProvider configured with the vision model,
 * reusing credentials from the primary provider's config block.
 * Returns undefined if no vision model is configured.
 *
 * @param modelsConfig - The models section from triggerfish.yaml
 * @returns An LlmProvider for vision, or undefined
 */
export function resolveVisionProvider(
  modelsConfig: ModelsConfig,
): LlmProvider | undefined {
  if (!modelsConfig.vision) return undefined;

  const visionModel = modelsConfig.vision;
  const providerName = modelsConfig.primary.provider;

  // Look up the provider config block for credentials
  const providerConfig = modelsConfig.providers[
    providerName as keyof ProvidersConfig
  ] as Readonly<Record<string, unknown>> | undefined;
  if (!providerConfig) return undefined;

  return createProviderForVision(providerName, providerConfig, visionModel);
}
