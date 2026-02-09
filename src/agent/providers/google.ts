/**
 * Google (Gemini) LLM provider implementation.
 *
 * Supports Gemini models via the Google Generative AI SDK.
 *
 * @module
 */

import { GoogleGenerativeAI } from "@google/generative-ai";
import type { LlmProvider, LlmMessage, LlmCompletionResult } from "../llm.ts";

/** Configuration for the Google provider. */
export interface GoogleConfig {
  /** Google AI API key. Falls back to GOOGLE_API_KEY env var. */
  readonly apiKey?: string;
  /** Model to use. Default: gemini-2.0-flash */
  readonly model?: string;
  /** Maximum tokens for completion. Default: 4096 */
  readonly maxTokens?: number;
}

/**
 * Create a Google (Gemini) LLM provider.
 *
 * @param config - Provider configuration
 * @returns An LlmProvider backed by the Google Generative AI API
 */
export function createGoogleProvider(config: GoogleConfig = {}): LlmProvider {
  const apiKey = config.apiKey ?? Deno.env.get("GOOGLE_API_KEY") ?? "";

  const genAI = new GoogleGenerativeAI(apiKey);
  const modelName = config.model ?? "gemini-2.0-flash";
  const maxTokens = config.maxTokens ?? 4096;

  return {
    name: "google",
    supportsStreaming: true,

    async complete(
      messages: readonly LlmMessage[],
      _tools: readonly unknown[],
      _options: Record<string, unknown>,
    ): Promise<LlmCompletionResult> {
      // Extract system instruction
      const systemMessage = messages.find((m) => m.role === "system");
      const systemInstruction = systemMessage
        ? (typeof systemMessage.content === "string"
          ? systemMessage.content
          : JSON.stringify(systemMessage.content))
        : undefined;

      // Get the generative model with optional system instruction
      const modelConfig: Record<string, unknown> = {};
      if (systemInstruction) {
        modelConfig.systemInstruction = systemInstruction;
      }

      const model = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: { maxOutputTokens: maxTokens },
        ...modelConfig,
      });

      // Convert to Gemini chat format — Gemini uses "user" and "model" roles
      const history = messages
        .filter((m) => m.role !== "system")
        .slice(0, -1) // All but last (which is the current user message)
        .map((m) => ({
          role: m.role === "assistant" ? "model" : "user",
          parts: [{
            text: typeof m.content === "string"
              ? m.content
              : JSON.stringify(m.content),
          }],
        }));

      // Get the last user message
      const lastMessage = messages.filter((m) => m.role !== "system").at(-1);
      const userContent = lastMessage
        ? (typeof lastMessage.content === "string"
          ? lastMessage.content
          : JSON.stringify(lastMessage.content))
        : "";

      const chat = model.startChat({ history });
      const result = await chat.sendMessage(userContent);
      const response = result.response;

      // Estimate token usage from response metadata
      const usageMetadata = response.usageMetadata;

      return {
        content: response.text(),
        toolCalls: [],
        usage: {
          inputTokens: usageMetadata?.promptTokenCount ?? 0,
          outputTokens: usageMetadata?.candidatesTokenCount ?? 0,
        },
      };
    },
  };
}
