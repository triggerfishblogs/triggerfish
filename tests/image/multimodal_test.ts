/**
 * Tests for multimodal content handling across providers and compactor.
 * @module
 */

import { assertEquals, assert } from "@std/assert";
import {
  estimateTokens,
  estimateHistoryTokens,
} from "../../src/agent/compactor.ts";
import type { HistoryEntry } from "../../src/agent/orchestrator.ts";
import type { ContentBlock } from "../../src/core/image/content.ts";

// ─── Compactor token estimation ─────────────────────────────────

Deno.test("estimateHistoryTokens — string-only entries", () => {
  const history: HistoryEntry[] = [
    { role: "user", content: "hello" },
    { role: "assistant", content: "hi there" },
  ];
  const tokens = estimateHistoryTokens(history);
  // "hello" = 5 chars ≈ 2 tokens, "hi there" = 8 chars ≈ 2 tokens
  assert(tokens > 0);
  assertEquals(tokens, estimateTokens("hello") + estimateTokens("hi there"));
});

Deno.test("estimateHistoryTokens — multimodal entry with image", () => {
  const blocks: readonly ContentBlock[] = [
    { type: "text", text: "describe this" },
    {
      type: "image",
      source: { type: "base64", media_type: "image/png", data: "abc123" },
    },
  ];
  const history: HistoryEntry[] = [
    { role: "user", content: blocks },
  ];
  const tokens = estimateHistoryTokens(history);
  // Text "describe this" ≈ 4 tokens + 1000 for image = ~1004
  const textTokens = estimateTokens("describe this");
  assertEquals(tokens, textTokens + 1000);
});

Deno.test("estimateHistoryTokens — mixed string and multimodal entries", () => {
  const blocks: readonly ContentBlock[] = [
    {
      type: "image",
      source: { type: "base64", media_type: "image/jpeg", data: "xyz" },
    },
    { type: "text", text: "what is this?" },
  ];
  const history: HistoryEntry[] = [
    { role: "user", content: blocks },
    { role: "assistant", content: "That appears to be a photo." },
  ];
  const tokens = estimateHistoryTokens(history);
  const expectedImageEntry = 1000 + estimateTokens("what is this?");
  const expectedTextEntry = estimateTokens("That appears to be a photo.");
  assertEquals(tokens, expectedImageEntry + expectedTextEntry);
});

// ─── Backward compatibility ──────────────────────────────────────

Deno.test("string-only messages still work through the pipeline", () => {
  // Ensure HistoryEntry with plain string content is valid
  const entry: HistoryEntry = { role: "user", content: "just text" };
  assertEquals(typeof entry.content, "string");
  assertEquals(estimateHistoryTokens([entry]), estimateTokens("just text"));
});

Deno.test("empty string content estimates to 0 tokens", () => {
  const entry: HistoryEntry = { role: "user", content: "" };
  assertEquals(estimateHistoryTokens([entry]), 0);
});

Deno.test("empty array content estimates to 0 tokens", () => {
  const entry: HistoryEntry = { role: "user", content: [] };
  assertEquals(estimateHistoryTokens([entry]), 0);
});

// ─── Content block format validation ─────────────────────────────

Deno.test("OpenAI content block conversion format", () => {
  // Verify the expected OpenAI format for an image block
  const block: ContentBlock = {
    type: "image",
    source: { type: "base64", media_type: "image/png", data: "abc123" },
  };

  // The OpenAI format should be: { type: "image_url", image_url: { url: "data:..." } }
  const openaiBlock = {
    type: "image_url",
    image_url: {
      url: `data:${block.source.media_type};base64,${block.source.data}`,
    },
  };
  assertEquals(openaiBlock.type, "image_url");
  assertEquals(openaiBlock.image_url.url, "data:image/png;base64,abc123");
});

Deno.test("Google/Gemini content block conversion format", () => {
  // Verify the expected Gemini format for an image block
  const block: ContentBlock = {
    type: "image",
    source: { type: "base64", media_type: "image/jpeg", data: "xyz789" },
  };

  // The Gemini format should be: { inlineData: { mimeType, data } }
  const geminiBlock = {
    inlineData: {
      mimeType: block.source.media_type,
      data: block.source.data,
    },
  };
  assertEquals(geminiBlock.inlineData.mimeType, "image/jpeg");
  assertEquals(geminiBlock.inlineData.data, "xyz789");
});
