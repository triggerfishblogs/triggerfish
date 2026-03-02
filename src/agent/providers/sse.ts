/**
 * SSE (Server-Sent Events) stream parser for OpenAI-compatible streaming.
 *
 * Parses `data: ...` lines from an SSE response body into typed chunks.
 *
 * @module
 */

import type { LlmStreamChunk } from "../llm.ts";
import { createLogger } from "../../core/logger/logger.ts";

const log = createLogger("llm");

/**
 * Parse an SSE response stream from an OpenAI-compatible endpoint.
 *
 * Yields LlmStreamChunk objects for each content delta.
 * The final chunk has `done: true` and includes usage if available.
 */
export async function* parseSseStream(
  body: ReadableStream<Uint8Array>,
): AsyncIterable<LlmStreamChunk> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let inputTokens = 0;
  let outputTokens = 0;

  // Accumulate streaming tool call deltas keyed by index
  const toolCallAccum = new Map<
    number,
    { id?: string; name: string; arguments: string }
  >();
  // Track whether we're inside a reasoning_content block so we can synthesize think tags
  let inReasoning = false;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      // Keep the last potentially incomplete line in the buffer
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith("data: ")) continue;

        const data = trimmed.slice(6);
        if (data === "[DONE]") continue;

        try {
          const parsed = JSON.parse(data);
          const delta = parsed.choices?.[0]?.delta;
          // Handle reasoning_content (used by OpenAI-compatible servers for
          // models with thinking/reasoning like DeepSeek, Qwen, GLM etc.)
          if (delta?.reasoning_content) {
            if (!inReasoning) {
              yield { text: "<think>", done: false };
              inReasoning = true;
            }
            yield { text: delta.reasoning_content, done: false };
          }
          if (delta?.content) {
            if (inReasoning) {
              yield { text: "</think>", done: false };
              inReasoning = false;
            }
            yield { text: delta.content, done: false };
          }
          // Accumulate tool_calls deltas (OpenAI streaming format)
          if (Array.isArray(delta?.tool_calls)) {
            for (const tc of delta.tool_calls) {
              const idx = tc.index ?? 0;
              const existing = toolCallAccum.get(idx);
              if (existing) {
                if (tc.function?.arguments) {
                  existing.arguments += tc.function.arguments;
                }
              } else {
                toolCallAccum.set(idx, {
                  id: tc.id,
                  name: tc.function?.name ?? "",
                  arguments: tc.function?.arguments ?? "",
                });
              }
            }
          }
          if (parsed.usage) {
            inputTokens = parsed.usage.prompt_tokens ?? 0;
            outputTokens = parsed.usage.completion_tokens ?? 0;
          }
        } catch (parseErr: unknown) {
          log.debug("SSE line parse failed", {
            error: parseErr instanceof Error
              ? parseErr.message
              : String(parseErr),
          });
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  // Close any open reasoning block before the final chunk
  if (inReasoning) {
    yield { text: "</think>", done: false };
    inReasoning = false;
  }

  // Assemble accumulated tool calls into OpenAI format.
  // Skip entries with no function name (phantom deltas from models that
  // send empty tool_calls fragments in their stream).
  const toolCalls: unknown[] = [];
  for (
    const [_, tc] of [...toolCallAccum.entries()].sort((a, b) => a[0] - b[0])
  ) {
    if (!tc.name) continue;
    toolCalls.push({
      id: tc.id,
      type: "function",
      function: {
        name: tc.name,
        arguments: tc.arguments,
      },
    });
  }

  yield {
    text: "",
    done: true,
    usage: { inputTokens, outputTokens },
    ...(toolCalls.length > 0 ? { toolCalls } : {}),
  };
}
