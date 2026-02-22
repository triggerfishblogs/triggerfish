/**
 * OpenRouter LLM provider implementation.
 *
 * Routes to any model available on OpenRouter via their OpenAI-compatible API.
 * Requires an OpenRouter API key.
 *
 * @module
 */

import { createLogger } from "../../core/logger/mod.ts";
import type {
  LlmCompletionResult,
  LlmMessage,
  LlmProvider,
  LlmStreamChunk,
} from "../llm.ts";
import { getModelInfo } from "../models.ts";
import { parseSseStream } from "./sse.ts";
import type { ContentBlock } from "../../core/image/content.ts";

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
      '  "Privacy and Guardrails" adjust your settings to allow the\n' +
      "  providers your model requires."
    );
  }
  return "";
}

/** Shape of an OpenRouter API response. */
interface OpenRouterApiResponse {
  readonly choices?: readonly {
    readonly message?: {
      readonly content?: string;
      readonly tool_calls?: unknown[];
    };
  }[];
  readonly usage?: {
    readonly prompt_tokens?: number;
    readonly completion_tokens?: number;
  };
  readonly error?: {
    readonly code?: number;
  };
}

/** Build the standard OpenRouter request headers. */
function buildOpenRouterHeaders(apiKey: string): Record<string, string> {
  return {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${apiKey}`,
    "HTTP-Referer": "https://trigger.fish",
    "X-Title": "Triggerfish",
  };
}

/** Check if an HTTP status or API error code is retryable. */
function isRetryableStatusCode(code: number): boolean {
  return code === 502 || code === 503 || code === 429;
}

/** Convert LLM messages to OpenAI format and build the JSON request body. */
function prepareOpenRouterPayload(
  model: string,
  maxTokens: number,
  messages: readonly LlmMessage[],
  tools: readonly unknown[],
  options?: { readonly stream?: boolean },
): {
  readonly body: string;
  readonly openaiMessages: { role: string; content: string | unknown[] }[];
} {
  const openaiMessages = messages.map((m) => ({
    role: m.role,
    content: toOpenAiContent(m.content),
  }));
  const payload: Record<string, unknown> = {
    model,
    max_tokens: maxTokens,
    messages: openaiMessages,
  };
  if (options?.stream) payload.stream = true;
  if (Array.isArray(tools) && tools.length > 0) payload.tools = tools;
  return { body: JSON.stringify(payload), openaiMessages };
}

/** Log outgoing OpenRouter request details at debug/trace level. */
function logOpenRouterRequest(
  orLog: ReturnType<typeof createLogger>,
  model: string,
  openaiMessages: readonly { role: string; content: string | unknown[] }[],
  bodyLength: number,
): void {
  orLog.debug(
    `model=${model} msgs=${openaiMessages.length} body=${bodyLength}chars`,
  );
  for (const m of openaiMessages) {
    const preview = typeof m.content === "string"
      ? m.content.slice(0, 120)
      : "(non-string)";
    orLog.trace(`  ${m.role}: ${preview}…`);
  }
}

/** Extract a completion result from a parsed OpenRouter API response. */
function extractOpenRouterResult(
  data: OpenRouterApiResponse,
  rawText: string,
  orLog: ReturnType<typeof createLogger>,
): LlmCompletionResult {
  const content = data.choices?.[0]?.message?.content ?? "";
  if (content.length === 0) {
    orLog.warn(
      `empty content! choices=${JSON.stringify(data.choices?.length)} full=${
        rawText.slice(0, 300)
      }`,
    );
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

/** Log raw OpenRouter response body at trace level. */
function logOpenRouterResponse(
  orLog: ReturnType<typeof createLogger>,
  status: number,
  rawText: string,
): void {
  orLog.trace(`status=${status} rawLen=${rawText.length}`);
  orLog.trace(
    rawText.length <= 500
      ? `raw: ${rawText}`
      : `raw: ${rawText.slice(0, 500)}…`,
  );
}

/** Execute a single OpenRouter API call and parse the response. */
async function executeOpenRouterApiCall(
  apiKey: string,
  body: string,
  signal: AbortSignal | undefined,
  orLog: ReturnType<typeof createLogger>,
): Promise<{ result: LlmCompletionResult } | { retryError: string }> {
  const response = await fetch(OPENROUTER_API_URL, {
    method: "POST",
    headers: buildOpenRouterHeaders(apiKey),
    body,
    ...(signal ? { signal } : {}),
  });
  if (!response.ok) {
    const text = await response.text();
    if (isRetryableStatusCode(response.status)) {
      return {
        retryError: `HTTP ${response.status}: ${text.slice(0, 200)}`,
      };
    }
    throw new Error(
      `OpenRouter request failed (${response.status}): ${text}${
        formatDataPolicyHint(text)
      }`,
    );
  }
  const rawText = await response.text();
  logOpenRouterResponse(orLog, response.status, rawText);
  const data = JSON.parse(rawText) as OpenRouterApiResponse;
  if (data.error) {
    const code = data.error.code ?? 0;
    if (isRetryableStatusCode(code)) {
      return {
        retryError: `API ${code}: ${JSON.stringify(data.error).slice(0, 200)}`,
      };
    }
    throw new Error(`OpenRouter API error: ${JSON.stringify(data.error)}`);
  }
  return { result: extractOpenRouterResult(data, rawText, orLog) };
}

/** Execute an OpenRouter completion with retry on transient errors. */
async function completeOpenRouterWithRetry(
  apiKey: string,
  body: string,
  signal: AbortSignal | undefined,
  orLog: ReturnType<typeof createLogger>,
): Promise<LlmCompletionResult> {
  const MAX_RETRIES = 2;
  let lastError: string | undefined;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      const delayMs = 1000 * Math.pow(2, attempt - 1);
      orLog.debug(`retry ${attempt}/${MAX_RETRIES} after ${delayMs}ms`);
      await new Promise((r) => setTimeout(r, delayMs));
    }
    const outcome = await executeOpenRouterApiCall(
      apiKey,
      body,
      signal,
      orLog,
    );
    if ("result" in outcome) return outcome.result;
    orLog.debug(outcome.retryError);
    lastError = outcome.retryError;
  }
  throw new Error(
    `OpenRouter request failed after ${MAX_RETRIES} retries: ${
      lastError ?? "unknown"
    }`,
  );
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
export function createOpenRouterProvider(
  config: OpenRouterConfig,
): LlmProvider {
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
      const { body, openaiMessages } = prepareOpenRouterPayload(
        model,
        maxTokens,
        messages,
        tools,
      );
      logOpenRouterRequest(orLog, model, openaiMessages, body.length);
      return completeOpenRouterWithRetry(apiKey, body, signal, orLog);
    },

    async *stream(
      messages: readonly LlmMessage[],
      tools: readonly unknown[],
      options: Record<string, unknown>,
    ): AsyncIterable<LlmStreamChunk> {
      const signal = options.signal as AbortSignal | undefined;
      const { body } = prepareOpenRouterPayload(
        model,
        maxTokens,
        messages,
        tools,
        { stream: true },
      );
      const response = await fetch(OPENROUTER_API_URL, {
        method: "POST",
        headers: buildOpenRouterHeaders(apiKey),
        body,
        ...(signal ? { signal } : {}),
      });
      if (!response.ok) {
        const errBody = await response.text();
        throw new Error(
          `OpenRouter stream failed (${response.status}): ${errBody}${
            formatDataPolicyHint(errBody)
          }`,
        );
      }
      if (!response.body) throw new Error("No response body for streaming");
      yield* parseSseStream(response.body);
    },
  };
}
