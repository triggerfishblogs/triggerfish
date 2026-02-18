/**
 * OpenRouter LLM provider implementation.
 *
 * Routes to any model available on OpenRouter via their OpenAI-compatible API.
 * Requires an OpenRouter API key.
 *
 * @module
 */

import { createLogger } from "../../core/logger/mod.ts";
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

/** Configuration for the OpenRouter provider. */
export interface OpenRouterConfig {
  /** OpenRouter API key. Falls back to OPENROUTER_API_KEY env var. */
  readonly apiKey?: string;
  /** Model identifier (e.g. "anthropic/claude-3.5-sonnet", "openai/gpt-4o"). */
  readonly model: string;
  /** Maximum tokens for completion. Default: 4096 */
  readonly maxTokens?: number;
}

/** OpenRouter API endpoint. */
const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";

/**
 * If the error body mentions "data policy", return a hint telling the user
 * how to fix their OpenRouter privacy settings. Otherwise return empty string.
 */
function formatDataPolicyHint(body: string): string {
  if (body.includes("data policy")) {
    return (
      "\n\n→ Your OpenRouter privacy settings are blocking this model's endpoints.\n" +
      "  Fix: visit https://openrouter.ai/settings/privacy and under\n" +
      "  \"Privacy and Guardrails\" adjust your settings to allow the\n" +
      "  providers your model requires."
    );
  }
  return "";
}

/**
 * Create an OpenRouter LLM provider.
 *
 * OpenRouter provides a unified API for many different LLM providers.
 * Uses the OpenAI-compatible chat completions format.
 *
 * @param config - Provider configuration
 * @returns An LlmProvider backed by the OpenRouter API
 */
export function createOpenRouterProvider(config: OpenRouterConfig): LlmProvider {
  const apiKey = config.apiKey ?? Deno.env.get("OPENROUTER_API_KEY") ?? "";
  const model = config.model;
  const maxTokens = config.maxTokens ?? 4096;

  if (!apiKey) {
    throw new Error(
      "OpenRouter API key not configured. " +
      "Set apiKey in triggerfish.yaml under models.providers.openrouter, " +
      "or run 'triggerfish dive' to reconfigure.",
    );
  }

  const orLog = createLogger("openrouter");

  return {
    name: "openrouter",
    supportsStreaming: true,
    contextWindow: getModelInfo(model).contextWindow,

    async complete(
      messages: readonly LlmMessage[],
      tools: readonly unknown[],
      options: Record<string, unknown>,
    ): Promise<LlmCompletionResult> {
      const signal = options.signal as AbortSignal | undefined;
      const openaiMessages = messages.map((m) => ({
        role: m.role,
        content: toOpenAiContent(m.content),
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

      const requestBody = JSON.stringify(body);

      orLog.debug(`model=${model} msgs=${openaiMessages.length} body=${requestBody.length}chars`);
      for (const m of openaiMessages) {
        const preview = typeof m.content === "string"
          ? m.content.slice(0, 120)
          : "(non-string)";
        orLog.trace(`  ${m.role}: ${preview}…`);
      }

      // Retry loop for transient errors (HTTP 502/503/429 or API-level errors)
      const MAX_RETRIES = 2;
      let lastError: string | undefined;

      for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        if (attempt > 0) {
          const delayMs = 1000 * Math.pow(2, attempt - 1); // 1s, 2s
          orLog.debug(`retry ${attempt}/${MAX_RETRIES} after ${delayMs}ms`);
          await new Promise((r) => setTimeout(r, delayMs));
        }

        const response = await fetch(OPENROUTER_API_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`,
            "HTTP-Referer": "https://trigger.fish",
            "X-Title": "Triggerfish",
          },
          body: requestBody,
          ...(signal ? { signal } : {}),
        });

        // HTTP-level transient error
        if (!response.ok) {
          const body = await response.text();
          if ((response.status === 502 || response.status === 503 || response.status === 429) && attempt < MAX_RETRIES) {
            orLog.debug(`HTTP ${response.status}: ${body.slice(0, 200)}`);
            lastError = `HTTP ${response.status}: ${body.slice(0, 200)}`;
            continue;
          }
          throw new Error(`OpenRouter request failed (${response.status}): ${body}${formatDataPolicyHint(body)}`);
        }

        const rawText = await response.text();
        orLog.trace(`status=${response.status} rawLen=${rawText.length}`);
        if (rawText.length <= 500) {
          orLog.trace(`raw: ${rawText}`);
        } else {
          orLog.trace(`raw: ${rawText.slice(0, 500)}…`);
        }

        const data = JSON.parse(rawText);

        // API-level error inside 200 response (OpenRouter wraps upstream errors)
        if (data.error) {
          const code = data.error.code;
          if ((code === 502 || code === 503 || code === 429) && attempt < MAX_RETRIES) {
            orLog.debug(`API error ${code}: ${JSON.stringify(data.error).slice(0, 200)}`);
            lastError = `API ${code}: ${JSON.stringify(data.error).slice(0, 200)}`;
            continue;
          }
          throw new Error(`OpenRouter API error: ${JSON.stringify(data.error)}`);
        }

        const content = data.choices?.[0]?.message?.content ?? "";
        if (content.length === 0) {
          orLog.warn(`empty content! choices=${JSON.stringify(data.choices?.length)} full=${rawText.slice(0, 300)}`);
        }

        return {
          content,
          toolCalls: data.choices?.[0]?.message?.tool_calls ?? [],
          usage: {
            inputTokens: data.usage?.prompt_tokens ?? 0,
            outputTokens: data.usage?.completion_tokens ?? 0,
          },
        };
      }

      throw new Error(`OpenRouter request failed after ${MAX_RETRIES} retries: ${lastError ?? "unknown"}`);
    },

    async *stream(
      messages: readonly LlmMessage[],
      tools: readonly unknown[],
      options: Record<string, unknown>,
    ): AsyncIterable<LlmStreamChunk> {
      const signal = options.signal as AbortSignal | undefined;
      const openaiMessages = messages.map((m) => ({
        role: m.role,
        content: toOpenAiContent(m.content),
      }));

      const streamBody: Record<string, unknown> = {
        model,
        max_tokens: maxTokens,
        messages: openaiMessages,
        stream: true,
      };
      if (Array.isArray(tools) && tools.length > 0) {
        streamBody.tools = tools;
      }

      const response = await fetch(OPENROUTER_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
          "HTTP-Referer": "https://trigger.fish",
          "X-Title": "Triggerfish",
        },
        body: JSON.stringify(streamBody),
        ...(signal ? { signal } : {}),
      });

      if (!response.ok) {
        const body = await response.text();
        throw new Error(`OpenRouter stream failed (${response.status}): ${body}${formatDataPolicyHint(body)}`);
      }

      if (!response.body) {
        throw new Error("No response body for streaming");
      }

      yield* parseSseStream(response.body);
    },
  };
}
