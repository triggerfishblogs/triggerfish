/**
 * Tests for LLM streaming interface and SSE parsing.
 */
import { assertEquals, assert } from "@std/assert";
import type { LlmStreamChunk } from "../../src/agent/llm.ts";
import { parseSseStream } from "../../src/agent/providers/sse.ts";

Deno.test("LlmStreamChunk: has correct shape", () => {
  const chunk: LlmStreamChunk = { text: "hello", done: false };
  assertEquals(chunk.text, "hello");
  assertEquals(chunk.done, false);
  assertEquals(chunk.usage, undefined);
});

Deno.test("LlmStreamChunk: final chunk includes usage", () => {
  const chunk: LlmStreamChunk = {
    text: "",
    done: true,
    usage: { inputTokens: 10, outputTokens: 5 },
  };
  assertEquals(chunk.done, true);
  assertEquals(chunk.usage?.inputTokens, 10);
  assertEquals(chunk.usage?.outputTokens, 5);
});

Deno.test("parseSseStream: parses OpenAI-compatible SSE chunks", async () => {
  const sseData = [
    'data: {"choices":[{"delta":{"content":"Hello"}}]}\n\n',
    'data: {"choices":[{"delta":{"content":" world"}}]}\n\n',
    'data: {"choices":[{"delta":{}}],"usage":{"prompt_tokens":5,"completion_tokens":2}}\n\n',
    "data: [DONE]\n\n",
  ].join("");

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(encoder.encode(sseData));
      controller.close();
    },
  });

  const chunks: LlmStreamChunk[] = [];
  for await (const chunk of parseSseStream(stream)) {
    chunks.push(chunk);
  }

  // Should have text chunks + final done chunk
  assert(chunks.length >= 2);
  assertEquals(chunks[0].text, "Hello");
  assertEquals(chunks[0].done, false);
  assertEquals(chunks[1].text, " world");
  assertEquals(chunks[1].done, false);

  // Last chunk should be done with usage
  const last = chunks[chunks.length - 1];
  assertEquals(last.done, true);
  assertEquals(last.usage?.inputTokens, 5);
  assertEquals(last.usage?.outputTokens, 2);
});

Deno.test("parseSseStream: handles fragmented SSE data", async () => {
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      // Fragment across two chunks
      controller.enqueue(encoder.encode('data: {"choices":[{"del'));
      controller.enqueue(encoder.encode('ta":{"content":"frag"}}]}\n\ndata: [DONE]\n\n'));
      controller.close();
    },
  });

  const chunks: LlmStreamChunk[] = [];
  for await (const chunk of parseSseStream(stream)) {
    chunks.push(chunk);
  }

  // Should recover fragmented JSON
  assert(chunks.length >= 1);
  assertEquals(chunks[0].text, "frag");
});

Deno.test("parseSseStream: skips empty and non-data lines", async () => {
  const sseData = [
    ": comment line\n",
    "\n",
    'data: {"choices":[{"delta":{"content":"ok"}}]}\n\n',
    "data: [DONE]\n\n",
  ].join("");

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(encoder.encode(sseData));
      controller.close();
    },
  });

  const chunks: LlmStreamChunk[] = [];
  for await (const chunk of parseSseStream(stream)) {
    chunks.push(chunk);
  }

  assertEquals(chunks[0].text, "ok");
});
