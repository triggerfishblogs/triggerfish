/**
 * SSE (Server-Sent Events) stream parser for OpenAI-compatible streaming.
 *
 * Parses `data: ...` lines from an SSE response body into typed chunks.
 *
 * @module
 */

import type { LlmStreamChunk } from "../llm.ts";

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
          if (delta?.content) {
            yield { text: delta.content, done: false };
          }
          if (parsed.usage) {
            inputTokens = parsed.usage.prompt_tokens ?? 0;
            outputTokens = parsed.usage.completion_tokens ?? 0;
          }
        } catch {
          // Skip unparseable lines
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  yield {
    text: "",
    done: true,
    usage: { inputTokens, outputTokens },
  };
}
