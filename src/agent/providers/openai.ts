/**
 * OpenAI LLM provider implementation.
 *
 * Supports GPT-4o, o1, o3, and other OpenAI models via API key auth.
 *
 * @module
 */

import OpenAI from "openai";
import type { LlmProvider, LlmMessage, LlmCompletionResult } from "../llm.ts";

/** Configuration for the OpenAI provider. */
export interface OpenAiConfig {
  /** OpenAI API key. Falls back to OPENAI_API_KEY env var. */
  readonly apiKey?: string;
  /** Model to use. Default: gpt-4o */
  readonly model?: string;
  /** Maximum tokens for completion. Default: 4096 */
  readonly maxTokens?: number;
}

/**
 * Create an OpenAI LLM provider.
 *
 * @param config - Provider configuration
 * @returns An LlmProvider backed by the OpenAI API
 */
export function createOpenAiProvider(config: OpenAiConfig = {}): LlmProvider {
  const model = config.model ?? "gpt-4o";
  const maxTokens = config.maxTokens ?? 4096;

  // Defer client creation to first use — OpenAI SDK throws on instantiation
  // if no API key is available, but the provider may be registered before
  // credentials are configured.
  let client: OpenAI | undefined;
  function getClient(): OpenAI {
    if (!client) {
      const apiKey = config.apiKey ?? Deno.env.get("OPENAI_API_KEY");
      client = new OpenAI({ apiKey });
    }
    return client;
  }

  return {
    name: "openai",
    supportsStreaming: true,

    async complete(
      messages: readonly LlmMessage[],
      _tools: readonly unknown[],
      options: Record<string, unknown>,
    ): Promise<LlmCompletionResult> {
      const openaiClient = getClient();
      const signal = options.signal as AbortSignal | undefined;

      // Convert messages to OpenAI format
      const openaiMessages = messages.map((m) => ({
        role: m.role as "system" | "user" | "assistant",
        content: typeof m.content === "string"
          ? m.content
          : JSON.stringify(m.content),
      }));

      const response = await openaiClient.chat.completions.create(
        {
          model,
          max_tokens: maxTokens,
          messages: openaiMessages,
        },
        signal ? { signal } : undefined,
      );

      const choice = response.choices[0];

      return {
        content: choice?.message?.content ?? "",
        toolCalls: choice?.message?.tool_calls ?? [],
        usage: {
          inputTokens: response.usage?.prompt_tokens ?? 0,
          outputTokens: response.usage?.completion_tokens ?? 0,
        },
      };
    },
  };
}
