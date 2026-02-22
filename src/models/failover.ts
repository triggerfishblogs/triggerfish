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
import { createLogger } from "../core/logger/logger.ts";

const log = createLogger("failover");

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
      for (let i = 0; i < providers.length; i++) {
        const provider = providers[i];
        try {
          const result = await provider.complete(messages, tools, options);
          if (i > 0) {
            log.info("Provider failover succeeded", {
              provider: provider.name,
              attemptIndex: i,
            });
          }
          return result;
        } catch (err) {
          log.warn("Provider failed, attempting failover", {
            provider: provider.name,
            attemptIndex: i,
            remainingProviders: providers.length - i - 1,
            error: err instanceof Error ? err.message : String(err),
          });
          lastError = err;
        }
      }
      log.error("All providers exhausted", {
        providerCount: providers.length,
        lastError: lastError instanceof Error ? lastError.message : String(lastError),
      });
      throw lastError;
    },
  };
}
