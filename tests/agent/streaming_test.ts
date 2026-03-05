/**
 * Tests for LLM streaming interface, SSE parsing, and in-flight repetition detection.
 */
import { assert, assertEquals } from "@std/assert";
import type { LlmStreamChunk } from "../../src/agent/llm.ts";
import { consumeProviderStream } from "../../src/agent/loop/mod.ts";
import type { OrchestratorEvent } from "../../src/agent/orchestrator/orchestrator_types.ts";
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
      controller.enqueue(
        encoder.encode('ta":{"content":"frag"}}]}\n\ndata: [DONE]\n\n'),
      );
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

// ─── consumeProviderStream: in-flight repetition detection ──────────────────

/** Create an async iterable of LlmStreamChunks from text segments. */
async function* fakeStream(
  segments: string[],
): AsyncIterable<LlmStreamChunk> {
  for (let i = 0; i < segments.length; i++) {
    const isLast = i === segments.length - 1;
    yield {
      text: segments[i],
      done: isLast,
      ...(isLast
        ? { usage: { inputTokens: 10, outputTokens: segments.length } }
        : {}),
    };
  }
}

Deno.test("consumeProviderStream: aborts on repetition loop during streaming", async () => {
  // Simulate an LLM stuck repeating the same 70-char phrase
  const phrase =
    "Now let me create the lights, locks, and thermostat services. Starting:";
  // 70 chars × 20 repetitions = 1400 chars total — far more than the check interval
  const segments = Array.from({ length: 20 }, () => phrase);
  const events: OrchestratorEvent[] = [];
  const emit = (e: OrchestratorEvent) => events.push(e);

  const result = await consumeProviderStream(fakeStream(segments), emit);

  // Content should be truncated to the first occurrence (before repetition)
  assert(
    result.content.length < phrase.length * 3,
    "content should be truncated",
  );
  assert(result.content.length > 0, "content should not be empty");
  // finishReason should indicate repetition
  assertEquals(result.finishReason, "repetition");
  // Should have emitted a done event
  const doneEvents = events.filter(
    (e) => e.type === "response_chunk" && "done" in e && e.done,
  );
  assert(doneEvents.length >= 1, "should emit done event");
});

Deno.test("consumeProviderStream: does not false-positive on normal streaming", async () => {
  const segments = [
    "Here is the information you requested. ",
    "The article discusses AI transformation in enterprises. ",
    "Key findings include improved productivity and reduced costs. ",
    "I recommend reading the full report for detailed analysis.",
  ];
  const events: OrchestratorEvent[] = [];
  const emit = (e: OrchestratorEvent) => events.push(e);

  const result = await consumeProviderStream(fakeStream(segments), emit);

  assertEquals(result.content, segments.join(""));
  assert(result.finishReason !== "repetition", "should not detect repetition");
});

Deno.test("consumeProviderStream: stops on abort signal during streaming", async () => {
  const controller = new AbortController();
  // Yield 3 chunks, then abort, then yield more
  async function* abortableStream(): AsyncIterable<LlmStreamChunk> {
    yield { text: "First chunk. ", done: false };
    yield { text: "Second chunk. ", done: false };
    // Abort after 2 chunks
    controller.abort();
    yield { text: "Should not appear. ", done: false };
    yield {
      text: "",
      done: true,
      usage: { inputTokens: 10, outputTokens: 4 },
    };
  }
  const events: OrchestratorEvent[] = [];
  const emit = (e: OrchestratorEvent) => events.push(e);

  const result = await consumeProviderStream(abortableStream(), emit, {
    signal: controller.signal,
  });

  assertEquals(result.finishReason, "cancelled");
  assertEquals(result.content, "First chunk. Second chunk. ");
  const doneEvents = events.filter(
    (e) => e.type === "response_chunk" && "done" in e && e.done,
  );
  assert(doneEvents.length >= 1, "should emit done event on abort");
});

Deno.test("consumeProviderStream: catches repetition with unique prefix", async () => {
  const prefix = "Sure, let me help with that. Here's my plan:\n\n";
  const phrase =
    "I'll create the integration module with full type definitions and error handling. ";
  // prefix + 15 repetitions — repetition starts after the unique intro
  const segments = [prefix, ...Array.from({ length: 15 }, () => phrase)];
  const events: OrchestratorEvent[] = [];
  const emit = (e: OrchestratorEvent) => events.push(e);

  const result = await consumeProviderStream(fakeStream(segments), emit);

  assertEquals(result.finishReason, "repetition");
  // Should preserve the prefix and first occurrence
  assert(result.content.includes("Sure, let me help"), "should keep prefix");
  assert(
    result.content.length < (prefix.length + phrase.length * 5),
    "should truncate",
  );
});
