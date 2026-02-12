/**
 * Z.AI LLM provider implementation.
 *
 * Routes to GLM models available on Z.AI's Coding Plan via their
 * OpenAI-compatible API. Requires a Z.AI API key.
 *
 * @module
 */

import type { LlmProvider, LlmMessage, LlmCompletionResult, LlmStreamChunk } from "../llm.ts";
import { parseSseStream } from "./sse.ts";

/** Configuration for the Z.AI provider. */
export interface ZaiConfig {
  /** Z.AI API key. Falls back to ZAI_API_KEY env var. */
  readonly apiKey?: string;
  /** Model identifier (e.g. "glm-4.7", "glm-4.5", "glm-5"). */
  readonly model: string;
  /** Maximum tokens for completion. Default: 4096 */
  readonly maxTokens?: number;
}

/** Z.AI Coding Plan API endpoint. */
const ZAI_API_URL = "https://api.z.ai/api/coding/paas/v4/chat/completions";

/**
 * Create a Z.AI LLM provider.
 *
 * Z.AI (Zhipu AI) provides GLM models via an OpenAI-compatible API.
 * Uses the standard chat completions format.
 *
 * @param config - Provider configuration
 * @returns An LlmProvider backed by the Z.AI Coding Plan API
 */
export function createZaiProvider(config: ZaiConfig): LlmProvider {
  const apiKey = config.apiKey ?? Deno.env.get("ZAI_API_KEY") ?? "";
  const model = config.model;
  const maxTokens = config.maxTokens ?? 4096;

  if (!apiKey) {
    throw new Error(
      "Z.AI API key not configured. " +
      "Set apiKey in triggerfish.yaml under models.providers.zai, " +
      "or run 'triggerfish dive' to reconfigure.",
    );
  }

  return {
    name: "zai",
    supportsStreaming: true,

    async complete(
      messages: readonly LlmMessage[],
      tools: readonly unknown[],
      options: Record<string, unknown>,
    ): Promise<LlmCompletionResult> {
      const signal = options.signal as AbortSignal | undefined;
      const openaiMessages = messages.map((m) => ({
        role: m.role,
        content: typeof m.content === "string"
          ? m.content
          : JSON.stringify(m.content),
      }));

      // Build request body — include tools if provided
      const body: Record<string, unknown> = {
        model,
        max_tokens: maxTokens,
        messages: openaiMessages,
      };
      if (Array.isArray(tools) && tools.length > 0) {
        body.tools = tools;
      }

      const response = await fetch(ZAI_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify(body),
        ...(signal ? { signal } : {}),
      });

      if (!response.ok) {
        const body = await response.text();
        throw new Error(`Z.AI request failed (${response.status}): ${body}`);
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
        content: typeof m.content === "string"
          ? m.content
          : JSON.stringify(m.content),
      }));

      const response = await fetch(ZAI_API_URL, {
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
        throw new Error(`Z.AI stream failed (${response.status}): ${body}`);
      }

      if (!response.body) {
        throw new Error("No response body for streaming");
      }

      yield* parseSseStream(response.body);
    },
  };
}
