/**
 * ZenMux LLM provider implementation.
 *
 * Routes to any model available on ZenMux via their OpenAI-compatible API.
 * Requires a ZenMux API key.
 *
 * @module
 */

import type { LlmProvider, LlmMessage, LlmCompletionResult, LlmStreamChunk } from "../llm.ts";
import { getModelInfo } from "../models.ts";
import { parseSseStream } from "./sse.ts";
import type { ContentBlock } from "../../image/content.ts";

/** Convert content blocks to OpenAI-compatible multimodal format. */
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

/** Configuration for the ZenMux provider. */
export interface ZenMuxConfig {
  /** ZenMux API key. Falls back to ZENMUX_API_KEY env var. */
  readonly apiKey?: string;
  /** Model identifier (e.g. "openai/gpt-5", "moonshotai/kimi-k2"). */
  readonly model: string;
  /** Maximum tokens for completion. Default: 4096 */
  readonly maxTokens?: number;
}

/** ZenMux API endpoint. */
const ZENMUX_API_URL = "https://zenmux.ai/api/v1/chat/completions";

/**
 * Create a ZenMux LLM provider.
 *
 * ZenMux provides a unified API for many different LLM providers.
 * Uses the OpenAI-compatible chat completions format.
 *
 * @param config - Provider configuration
 * @returns An LlmProvider backed by the ZenMux API
 */
export function createZenMuxProvider(config: ZenMuxConfig): LlmProvider {
  const apiKey = config.apiKey ?? Deno.env.get("ZENMUX_API_KEY") ?? "";
  const model = config.model;
  const maxTokens = config.maxTokens ?? 4096;

  if (!apiKey) {
    throw new Error(
      "ZenMux API key not configured. " +
      "Set apiKey in triggerfish.yaml under models.providers.zenmux, " +
      "or run 'triggerfish dive' to reconfigure.",
    );
  }

  return {
    name: "zenmux",
    supportsStreaming: true,
    contextWindow: getModelInfo(model).contextWindow,

    async complete(
      messages: readonly LlmMessage[],
      _tools: readonly unknown[],
      options: Record<string, unknown>,
    ): Promise<LlmCompletionResult> {
      const signal = options.signal as AbortSignal | undefined;
      const openaiMessages = messages.map((m) => ({
        role: m.role,
        content: toOpenAiContent(m.content),
      }));

      const response = await fetch(ZENMUX_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          max_tokens: maxTokens,
          messages: openaiMessages,
        }),
        ...(signal ? { signal } : {}),
      });

      if (!response.ok) {
        const body = await response.text();
        throw new Error(`ZenMux request failed (${response.status}): ${body}`);
      }

      const data = await response.json();

      return {
        content: data.choices?.[0]?.message?.content ?? "",
        toolCalls: data.choices?.[0]?.message?.tool_calls ?? [],
        usage: {
          inputTokens: data.usage?.prompt_tokens ?? 0,
          outputTokens: data.usage?.completion_tokens ?? 0,
        },
      };
    },

    async *stream(
      messages: readonly LlmMessage[],
      _tools: readonly unknown[],
      options: Record<string, unknown>,
    ): AsyncIterable<LlmStreamChunk> {
      const signal = options.signal as AbortSignal | undefined;
      const openaiMessages = messages.map((m) => ({
        role: m.role,
        content: toOpenAiContent(m.content),
      }));

      const response = await fetch(ZENMUX_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          max_tokens: maxTokens,
          messages: openaiMessages,
          stream: true,
        }),
        ...(signal ? { signal } : {}),
      });

      if (!response.ok) {
        const body = await response.text();
        throw new Error(`ZenMux stream failed (${response.status}): ${body}`);
      }

      if (!response.body) {
        throw new Error("No response body for streaming");
      }

      yield* parseSseStream(response.body);
    },
  };
}
