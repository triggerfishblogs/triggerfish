/**
 * LLM provider failover chain.
 *
 * Wraps an ordered list of LLM providers and tries each in sequence
 * until one succeeds. If all providers fail, the last error is thrown.
 *
 * @module
 */

import type {
  LlmCompletionResult,
  LlmMessage,
  LlmProvider,
} from "../core/types/llm.ts";

/** A failover chain that tries providers in order. */
export interface FailoverChain {
  /** Attempt completion across the provider chain. */
  complete(
    messages: readonly LlmMessage[],
    tools: readonly unknown[],
    options: Record<string, unknown>,
  ): Promise<LlmCompletionResult>;
}

/**
 * Create an ordered failover chain of LLM providers.
 *
 * The chain tries each provider in order. On failure (thrown error),
 * it falls back to the next provider. If all providers fail, the
 * last encountered error is re-thrown.
 *
 * @param providers - Ordered list of providers (first = primary)
 * @returns A FailoverChain instance
 */
export function createFailoverChain(
  providers: readonly LlmProvider[],
): FailoverChain {
  return {
    async complete(
      messages: readonly LlmMessage[],
      tools: readonly unknown[],
      options: Record<string, unknown>,
    ): Promise<LlmCompletionResult> {
      let lastError: unknown;
      for (const provider of providers) {
        try {
          return await provider.complete(messages, tools, options);
        } catch (err) {
          lastError = err;
        }
      }
      throw lastError;
    },
  };
}
