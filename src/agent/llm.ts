/**
 * LLM provider abstraction for multi-provider support.
 *
 * Interfaces are defined in core/types/llm.ts and re-exported here.
 * This module provides the factory function for creating provider registries.
 *
 * @module
 */

export type {
  LlmMessage,
  LlmUsage,
  LlmCompletionResult,
  LlmStreamChunk,
  LlmProvider,
  LlmProviderRegistry,
} from "../core/types/llm.ts";

import type { LlmProvider, LlmProviderRegistry } from "../core/types/llm.ts";

/**
 * Create a new LLM provider registry.
 *
 * @returns An empty LlmProviderRegistry ready for provider registration
 */
export function createProviderRegistry(): LlmProviderRegistry {
  const providers = new Map<string, LlmProvider>();
  let defaultName: string | undefined;

  return {
    register(provider: LlmProvider): void {
      providers.set(provider.name, provider);
    },

    get(name: string): LlmProvider | undefined {
      return providers.get(name);
    },

    setDefault(name: string): void {
      defaultName = name;
    },

    getDefault(): LlmProvider | undefined {
      if (defaultName === undefined) return undefined;
      return providers.get(defaultName);
    },
  };
}
