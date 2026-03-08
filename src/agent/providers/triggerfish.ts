/**
 * Triggerfish Gateway LLM provider implementation.
 *
 * Routes LLM requests through the Triggerfish Gateway, which handles
 * model selection, provider failover, and token clamping internally.
 * Uses the OpenAI-compatible chat completions format.
 *
 * The gateway currently routes to KimiK2.5 which requires explicit
 * thinking/reasoning control: disabled when tools are present (the
 * agent acts via tool calls), enabled when no tools are available
 * (the agent reasons via LLM_TASK).
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
import { parseSseStream } from "./sse.ts";
import type { ContentBlock } from "../../core/image/content.ts";

const log = createLogger("triggerfish-cloud");

// ─── Constants ───────────────────────────────────────────────────────────────

/**
 * Frequency penalty applied to all requests.
 *
 * Open-source models (KimiK2.5, etc.) are more prone to degenerate
 * repetition loops than frontier models. A modest penalty (0.3 on a
 * -2..2 scale) discourages token-level repetition without degrading
 * code generation quality.
 */
const FREQUENCY_PENALTY = 0.3;

/**
 * Temperature used when tool calling is active (thinking disabled).
 * Lower temperature for precise, deterministic tool usage.
 */
const TOOL_CALLING_TEMPERATURE = 0.6;

/**
 * Temperature used when thinking is active (no tools).
 * KimiK2.5/Fireworks requires temperature = 1.0 when thinking is enabled.
 */
const THINKING_TEMPERATURE = 1.0;

/** Budget for thinking tokens when reasoning mode is active. */
const THINKING_BUDGET_TOKENS = 4096;

/** Maximum retries for transient failures (502, 503, 429). */
const MAX_RETRIES = 2;

// ─── Content formatting ──────────────────────────────────────────────────────

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

/**
 * Strip reasoning_content from message history.
 *
 * The gateway model injects `reasoning_content` into assistant responses
 * when thinking is enabled. Sending it back in follow-up requests confuses
 * the model — it tries to continue reasoning instead of acting. We keep
 * only `role` and `content` (plus `tool_calls` / `tool_call_id` when present).
 */
function stripReasoningContent(
  msg: Record<string, unknown>,
): Record<string, unknown> {
  const clean: Record<string, unknown> = {
    role: msg.role,
    content: msg.content,
  };
  if (msg.tool_calls) clean.tool_calls = msg.tool_calls;
  if (msg.tool_call_id) clean.tool_call_id = msg.tool_call_id;
  if (msg.name) clean.name = msg.name;
  return clean;
}

// ─── Request building ────────────────────────────────────────────────────────

/** Build the chat request body with proper thinking/tool mode. */
function buildChatRequestBody(
  maxTokens: number,
  messages: readonly LlmMessage[],
  tools: readonly unknown[],
  streaming: boolean,
): Record<string, unknown> {
  const openaiMessages = messages.map((m) =>
    stripReasoningContent({
      role: m.role,
      content: toOpenAiContent(m.content),
    })
  );

  const hasTools = Array.isArray(tools) && tools.length > 0;

  const body: Record<string, unknown> = {
    max_tokens: maxTokens,
    messages: openaiMessages,
    frequency_penalty: FREQUENCY_PENALTY,
  };

  if (hasTools) {
    body.tools = tools;
    body.temperature = TOOL_CALLING_TEMPERATURE;
    body.thinking = { type: "disabled" };
    body.reasoning_history = "disabled";
  } else {
    body.temperature = THINKING_TEMPERATURE;
    body.thinking = { type: "enabled", budget_tokens: THINKING_BUDGET_TOKENS };
    body.reasoning_history = "interleaved";
  }

  if (streaming) body.stream = true;

  log.debug("Request body built", {
    operation: "buildChatRequestBody",
    messageCount: openaiMessages.length,
    hasTools,
    toolCount: hasTools ? (tools as unknown[]).length : 0,
    temperature: body.temperature,
    thinking: body.thinking,
    streaming,
  });

  return body;
}

/** Build request headers with auth and session affinity. */
function buildHeaders(
  licenseKey: string,
  sessionId?: string,
): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${licenseKey}`,
  };
  if (sessionId) {
    headers["X-Session-Id"] = sessionId;
  }
  return headers;
}

// ─── Response parsing ────────────────────────────────────────────────────────

/** Parse a non-streaming completion response. */
function parseCompletionResponse(
  data: Record<string, unknown>,
): LlmCompletionResult {
  const choices = data.choices as Record<string, unknown>[] | undefined;
  const message = choices?.[0]?.message as Record<string, unknown> | undefined;
  const usage = data.usage as Record<string, unknown> | undefined;
  const finishReason = choices?.[0]?.finish_reason as string | undefined;
  return {
    content: (message?.content as string) ?? "",
    toolCalls: (message?.tool_calls as unknown[]) ?? [],
    usage: {
      inputTokens: (usage?.prompt_tokens as number) ?? 0,
      outputTokens: (usage?.completion_tokens as number) ?? 0,
    },
    ...(finishReason ? { finishReason } : {}),
  };
}

/** Log budget-related response headers at debug level. */
function logBudgetHeaders(headers: Headers): void {
  const daily = headers.get("X-Daily-Budget-Remaining-Cents");
  const session = headers.get("X-Session-Budget-Remaining-Cents");
  const provider = headers.get("X-Provider");
  if (daily !== null || session !== null) {
    log.debug(
      `budget: daily=${daily ?? "?"}c session=${session ?? "?"}c provider=${
        provider ?? "?"
      }`,
    );
  }
}

/** Check if an HTTP status is transiently retriable. */
function isRetriableStatus(status: number): boolean {
  return status === 502 || status === 503 || status === 429;
}

// ─── Provider config ─────────────────────────────────────────────────────────

/** Configuration for the Triggerfish Gateway provider. */
export interface TriggerfishConfig {
  /** Gateway base URL. Defaults to production. */
  readonly gatewayUrl?: string;
  /** License key. Falls back to TRIGGERFISH_LICENSE_KEY env var. */
  readonly licenseKey?: string;
  /** Maximum tokens for completion. Default: 16384 */
  readonly maxTokens?: number;
}

// ─── Provider factory ────────────────────────────────────────────────────────

/**
 * Create a Triggerfish Gateway LLM provider.
 *
 * Routes all LLM requests through the Triggerfish Gateway.
 * The gateway handles model selection and provider failover — the agent
 * does not send a `model` field. Thinking/reasoning is explicitly
 * controlled: disabled when tools are present, enabled otherwise.
 *
 * @param config - Provider configuration
 * @returns An LlmProvider backed by the Triggerfish Gateway
 */
export function createTriggerfishProvider(
  config: TriggerfishConfig,
): LlmProvider {
  const gatewayUrl = config.gatewayUrl ??
    Deno.env.get("TRIGGERFISH_GATEWAY_URL") ??
    "https://api.trigger.fish";
  const licenseKey = config.licenseKey ??
    Deno.env.get("TRIGGERFISH_LICENSE_KEY") ?? "";
  const maxTokens = config.maxTokens ?? 16384;
  const chatUrl = `${gatewayUrl}/v1/llm/chat`;

  if (!licenseKey) {
    log.warn(
      "Triggerfish Gateway license key not configured. " +
        "Run 'triggerfish dive' to set up your subscription, " +
        "or set TRIGGERFISH_LICENSE_KEY in your environment.",
    );
  }

  return {
    name: "triggerfish",
    supportsStreaming: true,
    contextWindow: 200_000,

    async complete(
      messages: readonly LlmMessage[],
      tools: readonly unknown[],
      options: Record<string, unknown>,
    ): Promise<LlmCompletionResult> {
      const signal = options.signal as AbortSignal | undefined;
      const sessionId = options.sessionId as string | undefined;
      const body = buildChatRequestBody(maxTokens, messages, tools, false);
      const requestBody = JSON.stringify(body);
      const headers = buildHeaders(licenseKey, sessionId);

      let lastError: string | undefined;

      for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        if (attempt > 0) {
          const delayMs = 1000 * Math.pow(2, attempt - 1);
          log.debug(`retry ${attempt}/${MAX_RETRIES} after ${delayMs}ms`);
          await new Promise((r) => setTimeout(r, delayMs));
        }

        const response = await fetch(chatUrl, {
          method: "POST",
          headers,
          body: requestBody,
          ...(signal ? { signal } : {}),
        });

        logBudgetHeaders(response.headers);

        if (!response.ok) {
          const text = await response.text();
          if (isRetriableStatus(response.status) && attempt < MAX_RETRIES) {
            log.debug(`HTTP ${response.status}: ${text.slice(0, 200)}`);
            lastError = `HTTP ${response.status}: ${text.slice(0, 200)}`;
            continue;
          }
          throw new Error(
            `Triggerfish Gateway request failed (${response.status}): ${
              text.slice(0, 200)
            }`,
          );
        }

        const rawText = await response.text();
        log.trace(`status=${response.status} rawLen=${rawText.length}`);

        const data = JSON.parse(rawText);

        if (data.error) {
          const code = data.error.code;
          if (isRetriableStatus(code) && attempt < MAX_RETRIES) {
            log.debug(
              `API error ${code}: ${JSON.stringify(data.error).slice(0, 200)}`,
            );
            lastError = `API ${code}: ${
              JSON.stringify(data.error).slice(0, 200)
            }`;
            continue;
          }
          throw new Error(
            `Triggerfish Gateway API error: ${
              JSON.stringify(data.error).slice(0, 200)
            }`,
          );
        }

        return parseCompletionResponse(data);
      }

      throw new Error(
        `Triggerfish Gateway request failed after ${MAX_RETRIES} retries: ${
          lastError ?? "unknown"
        }`,
      );
    },

    async *stream(
      messages: readonly LlmMessage[],
      tools: readonly unknown[],
      options: Record<string, unknown>,
    ): AsyncIterable<LlmStreamChunk> {
      const signal = options.signal as AbortSignal | undefined;
      const sessionId = options.sessionId as string | undefined;
      const body = buildChatRequestBody(maxTokens, messages, tools, true);
      const headers = buildHeaders(licenseKey, sessionId);

      const response = await fetch(chatUrl, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
        ...(signal ? { signal } : {}),
      });

      logBudgetHeaders(response.headers);

      if (!response.ok) {
        const text = await response.text();
        throw new Error(
          `Triggerfish Gateway stream failed (${response.status}): ${
            text.slice(0, 200)
          }`,
        );
      }

      if (!response.body) {
        throw new Error("No response body for streaming");
      }

      yield* parseSseStream(response.body);
    },
  };
}
