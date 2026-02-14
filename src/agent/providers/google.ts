/**
 * Google (Gemini) LLM provider implementation.
 *
 * Supports Gemini models via the Google Generative AI SDK.
 *
 * @module
 */

import { GoogleGenerativeAI } from "@google/generative-ai";
import type { LlmProvider, LlmMessage, LlmCompletionResult, LlmStreamChunk } from "../llm.ts";
import { getModelInfo } from "../models.ts";
import type { ContentBlock } from "../../image/content.ts";

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

  /** Convert content to Gemini parts format. */
  function toGeminiParts(content: string | unknown): { text: string }[] | { inlineData: { mimeType: string; data: string } }[] | ({ text: string } | { inlineData: { mimeType: string; data: string } })[] {
    if (typeof content === "string") return [{ text: content }];
    if (!Array.isArray(content)) return [{ text: JSON.stringify(content) }];
    const parts: ({ text: string } | { inlineData: { mimeType: string; data: string } })[] = [];
    for (const block of content as ContentBlock[]) {
      if (block.type === "text") {
        parts.push({ text: block.text });
      } else if (block.type === "image") {
        parts.push({
          inlineData: {
            mimeType: block.source.media_type,
            data: block.source.data,
          },
        });
      }
    }
    return parts.length > 0 ? parts : [{ text: "" }];
  }

  return {
    name: "google",
    supportsStreaming: true,
    contextWindow: getModelInfo(modelName).contextWindow,

    async complete(
      messages: readonly LlmMessage[],
      tools: readonly unknown[],
      options: Record<string, unknown>,
    ): Promise<LlmCompletionResult> {
      const signal = options.signal as AbortSignal | undefined;
      // Extract system instruction
      const systemMessage = messages.find((m) => m.role === "system");
      const systemInstruction = systemMessage
        ? (typeof systemMessage.content === "string"
          ? systemMessage.content
          : JSON.stringify(systemMessage.content))
        : undefined;

      // Get the generative model with optional system instruction and tools
      const modelConfig: Record<string, unknown> = {};
      if (systemInstruction) {
        modelConfig.systemInstruction = systemInstruction;
      }

      // Convert OpenAI-format tools to Gemini functionDeclarations
      const geminiTools = convertToolsToGeminiFormat(tools);
      if (geminiTools.length > 0) {
        modelConfig.tools = [{ functionDeclarations: geminiTools }];
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
          parts: toGeminiParts(m.content),
        }));

      // Get the last user message
      const lastMessage = messages.filter((m) => m.role !== "system").at(-1);
      const userParts = lastMessage ? toGeminiParts(lastMessage.content) : [{ text: "" }];

      const chat = model.startChat({ history });

      // Google SDK doesn't natively support AbortSignal — use Promise.race
      const sendPromise = chat.sendMessage(userParts);
      let result;
      try {
        if (signal) {
          const abortPromise = new Promise<never>((_resolve, reject) => {
            if (signal.aborted) {
              reject(new DOMException("Operation cancelled", "AbortError"));
              return;
            }
            signal.addEventListener("abort", () => {
              reject(new DOMException("Operation cancelled", "AbortError"));
            }, { once: true });
          });
          result = await Promise.race([sendPromise, abortPromise]);
        } else {
          result = await sendPromise;
        }
      } catch (err) {
        throw wrapGoogleError(err, modelName);
      }
      const response = result.response;

      // Estimate token usage from response metadata
      const usageMetadata = response.usageMetadata;

      // Extract function calls from Gemini response
      const geminiToolCalls = extractGeminiFunctionCalls(response);

      // Extract text — response.text() throws if there are only function call parts
      let textContent = "";
      try {
        textContent = response.text();
      } catch {
        // No text content (function-call-only response)
      }

      return {
        content: textContent,
        toolCalls: geminiToolCalls,
        usage: {
          inputTokens: usageMetadata?.promptTokenCount ?? 0,
          outputTokens: usageMetadata?.candidatesTokenCount ?? 0,
        },
      };
    },

    async *stream(
      messages: readonly LlmMessage[],
      tools: readonly unknown[],
      options: Record<string, unknown>,
    ): AsyncIterable<LlmStreamChunk> {
      const signal = options.signal as AbortSignal | undefined;

      const systemMessage = messages.find((m) => m.role === "system");
      const systemInstruction = systemMessage
        ? (typeof systemMessage.content === "string"
          ? systemMessage.content
          : JSON.stringify(systemMessage.content))
        : undefined;

      const modelConfig: Record<string, unknown> = {};
      if (systemInstruction) {
        modelConfig.systemInstruction = systemInstruction;
      }

      const geminiTools = convertToolsToGeminiFormat(tools);
      if (geminiTools.length > 0) {
        modelConfig.tools = [{ functionDeclarations: geminiTools }];
      }

      const model = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: { maxOutputTokens: maxTokens },
        ...modelConfig,
      });

      const history = messages
        .filter((m) => m.role !== "system")
        .slice(0, -1)
        .map((m) => ({
          role: m.role === "assistant" ? "model" : "user",
          parts: toGeminiParts(m.content),
        }));

      const lastMessage = messages.filter((m) => m.role !== "system").at(-1);
      const userParts = lastMessage ? toGeminiParts(lastMessage.content) : [{ text: "" }];

      const chat = model.startChat({ history });
      let streamResult;
      try {
        streamResult = await chat.sendMessageStream(userParts);
      } catch (err) {
        throw wrapGoogleError(err, modelName);
      }

      // Check abort before iterating
      if (signal?.aborted) {
        throw new DOMException("Operation cancelled", "AbortError");
      }

      try {
        for await (const chunk of streamResult.stream) {
          if (signal?.aborted) {
            throw new DOMException("Operation cancelled", "AbortError");
          }
          const text = chunk.text();
          if (text) {
            yield { text, done: false };
          }
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") throw err;
        throw wrapGoogleError(err, modelName);
      }

      const finalResponse = await streamResult.response;
      const meta = finalResponse.usageMetadata;
      const geminiFunctionCalls = extractGeminiFunctionCalls(finalResponse);

      yield {
        text: "",
        done: true,
        usage: {
          inputTokens: meta?.promptTokenCount ?? 0,
          outputTokens: meta?.candidatesTokenCount ?? 0,
        },
        ...(geminiFunctionCalls.length > 0 ? { toolCalls: geminiFunctionCalls } : {}),
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

/** Convert OpenAI-format tool definitions to Gemini functionDeclarations format. */
function convertToolsToGeminiFormat(
  tools: readonly unknown[],
): Record<string, unknown>[] {
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
      parameters: t.function.parameters,
    }));
}

/**
 * Wrap Google API errors with user-friendly messages.
 *
 * Detects common error patterns (quota exceeded, invalid key, etc.)
 * and prepends a clear explanation before the raw error.
 */
function wrapGoogleError(err: unknown, modelName: string): Error {
  const msg = err instanceof Error ? err.message : String(err);

  // 429 / quota exceeded / limit: 0
  if (msg.includes("429") || msg.includes("quota") || msg.includes("RESOURCE_EXHAUSTED")) {
    if (msg.includes("limit: 0") || msg.includes("limit:0")) {
      return new Error(
        `Google API key has zero quota for ${modelName}. ` +
        `Your key may be on the free tier without access to this model, or billing is not enabled. ` +
        `Enable billing at https://console.cloud.google.com/billing or use a different model.\n\n${msg}`,
      );
    }
    return new Error(
      `Google API rate limit exceeded for ${modelName}. ` +
      `Wait a moment and try again, or check your quota at https://console.cloud.google.com/apis/dashboard\n\n${msg}`,
    );
  }

  // 401 / 403 — bad key or permissions
  if (msg.includes("401") || msg.includes("403") || msg.includes("API_KEY_INVALID") || msg.includes("PERMISSION_DENIED")) {
    return new Error(
      `Google API key is invalid or lacks permission for ${modelName}. ` +
      `Check your key at https://aistudio.google.com/apikey\n\n${msg}`,
    );
  }

  // 404 — model not found
  if (msg.includes("404") || msg.includes("not found")) {
    return new Error(
      `Model '${modelName}' not found. Check available models at https://ai.google.dev/gemini-api/docs/models\n\n${msg}`,
    );
  }

  // Pass through anything else
  return err instanceof Error ? err : new Error(msg);
}

/**
 * Extract function calls from a Gemini response.
 *
 * Returns them in Anthropic tool_use format: `{ type: "tool_use", id, name, input }`
 * so the orchestrator's native tool call parser can handle them uniformly.
 */
// deno-lint-ignore no-explicit-any
function extractGeminiFunctionCalls(response: any): unknown[] {
  const calls: unknown[] = [];
  for (const candidate of response.candidates ?? []) {
    for (const part of candidate.content?.parts ?? []) {
      const fc = part.functionCall as { name: string; args: Record<string, unknown> } | undefined;
      if (fc) {
        calls.push({
          type: "tool_use",
          id: `gemini_${crypto.randomUUID().slice(0, 8)}`,
          name: fc.name,
          input: fc.args ?? {},
        });
      }
    }
  }
  return calls;
}
