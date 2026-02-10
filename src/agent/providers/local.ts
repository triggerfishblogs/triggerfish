/**
 * Local LLM provider implementation.
 *
 * Connects to any OpenAI-compatible local endpoint such as Ollama,
 * LM Studio, or llama.cpp server. No authentication required.
 *
 * @module
 */

import type { LlmProvider, LlmMessage, LlmCompletionResult, LlmStreamChunk } from "../llm.ts";
import { parseSseStream } from "./sse.ts";

/** Configuration for the local LLM provider. */
export interface LocalConfig {
  /** Endpoint URL. Default: http://localhost:11434 (Ollama) */
  readonly endpoint?: string;
  /** Model name. e.g. "llama3", "mistral", "codellama" */
  readonly model: string;
  /** Maximum tokens for completion. Default: 4096 */
  readonly maxTokens?: number;
}

/**
 * Create a local LLM provider using an OpenAI-compatible API.
 *
 * Works with Ollama (default), LM Studio, llama.cpp server, and any
 * other local server exposing the /v1/chat/completions endpoint.
 *
 * @param config - Provider configuration
 * @returns An LlmProvider backed by a local LLM server
 */
export function createLocalProvider(config: LocalConfig): LlmProvider {
  const endpoint = config.endpoint ?? "http://localhost:11434";
  const model = config.model;
  const maxTokens = config.maxTokens ?? 4096;

  return {
    name: "local",
    supportsStreaming: true,

    async complete(
      messages: readonly LlmMessage[],
      _tools: readonly unknown[],
      options: Record<string, unknown>,
    ): Promise<LlmCompletionResult> {
      const signal = options.signal as AbortSignal | undefined;
      const openaiMessages = messages.map((m) => ({
        role: m.role,
        content: typeof m.content === "string"
          ? m.content
          : JSON.stringify(m.content),
      }));

      const response = await fetch(`${endpoint}/v1/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          max_tokens: maxTokens,
          messages: openaiMessages,
        }),
        ...(signal ? { signal } : {}),
      });

      if (!response.ok) {
        const body = await response.text();
        throw new Error(`Local LLM request failed (${response.status}): ${body}`);
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

      const response = await fetch(`${endpoint}/v1/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
        throw new Error(`Local LLM stream failed (${response.status}): ${body}`);
      }

      if (!response.body) {
        throw new Error("No response body for streaming");
      }

      yield* parseSseStream(response.body);
    },
  };
}
