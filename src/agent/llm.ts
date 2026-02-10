/**
 * LLM provider abstraction for multi-provider support.
 *
 * Defines the interface for LLM completions and a registry for managing
 * multiple providers with default selection.
 *
 * @module
 */

/** A single message in a conversation. */
export interface LlmMessage {
  readonly role: string;
  readonly content: string | unknown;
}

/** Token usage statistics from a completion. */
export interface LlmUsage {
  readonly inputTokens: number;
  readonly outputTokens: number;
}

/** Result of an LLM completion call. */
export interface LlmCompletionResult {
  readonly content: string;
  readonly toolCalls: readonly unknown[];
  readonly usage: LlmUsage;
}

/** A chunk yielded during streaming. */
export interface LlmStreamChunk {
  /** Incremental text content (may be empty for non-text chunks). */
  readonly text: string;
  /** Whether this is the final chunk. */
  readonly done: boolean;
  /** Usage statistics, available on the final chunk. */
  readonly usage?: LlmUsage;
}

/**
 * Interface for LLM completion providers.
 *
 * Each provider normalizes to/from the common message format.
 * Implementations exist per provider (Anthropic, OpenAI, Google, Local, OpenRouter).
 */
export interface LlmProvider {
  /** Provider name identifier. */
  readonly name: string;
  /** Whether this provider supports streaming responses. */
  readonly supportsStreaming: boolean;
  /** Send messages to the LLM and receive a completion response. */
  complete(
    messages: readonly LlmMessage[],
    tools: readonly unknown[],
    options: Record<string, unknown>,
  ): Promise<LlmCompletionResult>;
  /** Stream a response from the LLM, yielding incremental chunks. */
  stream?(
    messages: readonly LlmMessage[],
    tools: readonly unknown[],
    options: Record<string, unknown>,
  ): AsyncIterable<LlmStreamChunk>;
}

/**
 * Registry for managing multiple LLM providers.
 *
 * Supports registering providers by name, retrieving them, and setting
 * a default provider for use when no specific provider is requested.
 */
export interface LlmProviderRegistry {
  /** Register a provider. Replaces any existing provider with the same name. */
  register(provider: LlmProvider): void;
  /** Get a provider by name, or undefined if not registered. */
  get(name: string): LlmProvider | undefined;
  /** Set the default provider by name. The provider must already be registered. */
  setDefault(name: string): void;
  /** Get the default provider, or undefined if none set. */
  getDefault(): LlmProvider | undefined;
}

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
