/**
 * OpenAI LLM provider implementation.
 *
 * Supports GPT-4o, o1, o3, and other OpenAI models via API key auth.
 *
 * @module
 */

import OpenAI from "openai";
import type { LlmProvider, LlmMessage, LlmCompletionResult, LlmStreamChunk } from "../llm.ts";
import { getModelInfo } from "../models.ts";
import type { ContentBlock } from "../../image/content.ts";

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

  /** Convert content blocks to OpenAI's multimodal format. */
  function toOpenAiContent(content: string | unknown): string | unknown[] {
    if (typeof content === "string") return content;
    if (!Array.isArray(content)) return JSON.stringify(content);
    return (content as ContentBlock[]).map((block) => {
      if (block.type === "text") return { type: "text", text: block.text };
      if (block.type === "image") {
        return {
          type: "image_url",
          image_url: {
            url: `data:${block.source.media_type};base64,${block.source.data}`,
          },
        };
      }
      return block;
    });
  }

  return {
    name: "openai",
    supportsStreaming: true,
    contextWindow: getModelInfo(model).contextWindow,

    async complete(
      messages: readonly LlmMessage[],
      tools: readonly unknown[],
      options: Record<string, unknown>,
    ): Promise<LlmCompletionResult> {
      const openaiClient = getClient();
      const signal = options.signal as AbortSignal | undefined;

      // Convert messages to OpenAI format
      // deno-lint-ignore no-explicit-any
      const openaiMessages: any[] = messages.map((m) => ({
        role: m.role as "system" | "user" | "assistant",
        content: toOpenAiContent(m.content),
      }));

      // deno-lint-ignore no-explicit-any
      const toolsParam = (Array.isArray(tools) && tools.length > 0) ? { tools: tools as any[] } : {};

      const response = await openaiClient.chat.completions.create(
        {
          model,
          max_tokens: maxTokens,
          messages: openaiMessages,
          ...toolsParam,
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

    async *stream(
      messages: readonly LlmMessage[],
      tools: readonly unknown[],
      options: Record<string, unknown>,
    ): AsyncIterable<LlmStreamChunk> {
      const openaiClient = getClient();
      const signal = options.signal as AbortSignal | undefined;

      // deno-lint-ignore no-explicit-any
      const openaiMessages: any[] = messages.map((m) => ({
        role: m.role as "system" | "user" | "assistant",
        content: toOpenAiContent(m.content),
      }));

      // deno-lint-ignore no-explicit-any
      const toolsParam = (Array.isArray(tools) && tools.length > 0) ? { tools: tools as any[] } : {};

      const stream = await openaiClient.chat.completions.create(
        {
          model,
          max_tokens: maxTokens,
          messages: openaiMessages,
          stream: true,
          stream_options: { include_usage: true },
          ...toolsParam,
        },
        signal ? { signal } : undefined,
      );

      let inputTokens = 0;
      let outputTokens = 0;

      for await (const chunk of stream) {
        const delta = chunk.choices?.[0]?.delta;
        if (delta?.content) {
          yield { text: delta.content, done: false };
        }
        if (chunk.usage) {
          inputTokens = chunk.usage.prompt_tokens ?? 0;
          outputTokens = chunk.usage.completion_tokens ?? 0;
        }
      }

      yield {
        text: "",
        done: true,
        usage: { inputTokens, outputTokens },
      };
    },
  };
}
