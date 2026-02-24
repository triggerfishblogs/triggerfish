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
  const classificationOverrides = new Map<string, LlmProvider>();
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

    registerClassificationOverride(level: string, provider: LlmProvider): void {
      classificationOverrides.set(level, provider);
    },

    getForClassification(level: string): LlmProvider | undefined {
      return classificationOverrides.get(level) ?? this.getDefault();
    },

    getMinContextWindow(): number | undefined {
      const candidates: LlmProvider[] = [];
      const defaultProvider = this.getDefault();
      if (defaultProvider) candidates.push(defaultProvider);
      for (const p of classificationOverrides.values()) {
        candidates.push(p);
      }
      if (candidates.length === 0) return undefined;
      const windows = candidates
        .map((p) => p.contextWindow)
        .filter((w): w is number => w !== undefined);
      if (windows.length === 0) return undefined;
      return Math.min(...windows);
    },
  };
}
