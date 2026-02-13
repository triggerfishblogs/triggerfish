/**
 * Anthropic LLM provider implementation.
 *
 * Uses API key authentication for all Anthropic models.
 *
 * @module
 */

import Anthropic from "@anthropic-ai/sdk";
import type { MessageCreateParamsNonStreaming, MessageParam } from "@anthropic-ai/sdk/resources/messages.js";
import type { LlmProvider, LlmMessage, LlmCompletionResult, LlmStreamChunk } from "../llm.ts";
import { getModelInfo } from "../models.ts";

/** Configuration for the Anthropic provider. */
export interface AnthropicConfig {
  /** Anthropic API key. Falls back to ANTHROPIC_API_KEY env var. */
  readonly apiKey?: string;
  /** Model to use. Default: claude-sonnet-4-5-20250929 */
  readonly model?: string;
  /** Maximum tokens for completion. Default: 4096 */
  readonly maxTokens?: number;
}

/**
 * Create an Anthropic LLM provider.
 *
 * @param config - Provider configuration
 * @returns An LlmProvider backed by the Anthropic API
 */
export function createAnthropicProvider(config: AnthropicConfig = {}): LlmProvider {
  const model = config.model ?? "claude-sonnet-4-5-20250929";
  const maxTokens = config.maxTokens ?? 4096;

  // Defer client creation to first use — avoids throwing during
  // provider registration when credentials aren't yet available.
  let client: Anthropic | undefined;

  function getClient(): Anthropic {
    if (!client) {
      const apiKey = config.apiKey ?? Deno.env.get("ANTHROPIC_API_KEY");

      if (!apiKey) {
        throw new Error(
          "Anthropic API key not configured. " +
          "Set apiKey in triggerfish.yaml under models.providers.anthropic, " +
          "or run 'triggerfish dive' to reconfigure.",
        );
      }

      client = new Anthropic({ apiKey });
    }
    return client;
  }

  return {
    name: "anthropic",
    supportsStreaming: true,
    contextWindow: getModelInfo(model).contextWindow,

    async complete(
      messages: readonly LlmMessage[],
      tools: readonly unknown[],
      options: Record<string, unknown>,
    ): Promise<LlmCompletionResult> {
      const anthropicClient = getClient();
      const signal = options.signal as AbortSignal | undefined;

      // Extract system prompt from messages
      const systemMessage = messages.find((m) => m.role === "system");
      const systemPrompt = systemMessage
        ? (typeof systemMessage.content === "string"
          ? systemMessage.content
          : JSON.stringify(systemMessage.content))
        : undefined;

      // Convert remaining messages to Anthropic format.
      // Structured content (tool_use blocks, tool_result arrays) passes through as-is.
      const anthropicMessages: MessageParam[] = messages
        .filter((m) => m.role !== "system")
        .map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content as MessageParam["content"],
        }));

      // Convert OpenAI-format tool definitions to Anthropic format
      const anthropicTools = convertToolsToAnthropicFormat(tools);

      const requestParams: MessageCreateParamsNonStreaming = {
        model,
        max_tokens: maxTokens,
        messages: anthropicMessages,
        ...(systemPrompt ? { system: systemPrompt } : {}),
        ...(anthropicTools.length > 0 ? { tools: anthropicTools } : {}),
      };

      const response = await anthropicClient.messages.create(
        requestParams,
        signal ? { signal } : undefined,
      );

      // Extract text from response content blocks
      const textContent = response.content
        .filter((block) => block.type === "text")
        .map((block) => block.type === "text" ? block.text : "")
        .join("");

      return {
        content: textContent,
        toolCalls: response.content
          .filter((block) => block.type === "tool_use"),
        usage: {
          inputTokens: response.usage.input_tokens,
          outputTokens: response.usage.output_tokens,
        },
      };
    },

    async *stream(
      messages: readonly LlmMessage[],
      tools: readonly unknown[],
      options: Record<string, unknown>,
    ): AsyncIterable<LlmStreamChunk> {
      const anthropicClient = getClient();
      const signal = options.signal as AbortSignal | undefined;

      const systemMessage = messages.find((m) => m.role === "system");
      const systemPrompt = systemMessage
        ? (typeof systemMessage.content === "string"
          ? systemMessage.content
          : JSON.stringify(systemMessage.content))
        : undefined;

      const anthropicMessages: MessageParam[] = messages
        .filter((m) => m.role !== "system")
        .map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content as MessageParam["content"],
        }));

      const anthropicTools = convertToolsToAnthropicFormat(tools);

      const stream = anthropicClient.messages.stream({
        model,
        max_tokens: maxTokens,
        messages: anthropicMessages,
        ...(systemPrompt ? { system: systemPrompt } : {}),
        ...(anthropicTools.length > 0 ? { tools: anthropicTools } : {}),
      }, signal ? { signal } : undefined);

      for await (const event of stream) {
        if (event.type === "content_block_delta" && "delta" in event) {
          const delta = event.delta as { type: string; text?: string };
          if (delta.type === "text_delta" && delta.text) {
            yield { text: delta.text, done: false };
          }
        }
      }

      const finalMessage = await stream.finalMessage();
      yield {
        text: "",
        done: true,
        usage: {
          inputTokens: finalMessage.usage.input_tokens,
          outputTokens: finalMessage.usage.output_tokens,
        },
      };
    },
  };
}

/** OpenAI-format tool definition shape. */
interface OpenAiToolDef {
  readonly type: string;
  readonly function: {
    readonly name: string;
    readonly description: string;
    readonly parameters: Record<string, unknown>;
  };
}

/** Convert OpenAI-format tool definitions to Anthropic's native format. */
function convertToolsToAnthropicFormat(
  tools: readonly unknown[],
  // deno-lint-ignore no-explicit-any
): any[] {
  if (!Array.isArray(tools) || tools.length === 0) return [];
  return tools
    .filter((t): t is OpenAiToolDef => {
      const td = t as Record<string, unknown>;
      return td !== null && typeof td === "object" &&
        typeof td.function === "object";
    })
    .map((t) => ({
      name: t.function.name,
      description: t.function.description,
      input_schema: t.function.parameters,
    }));
}
