/**
 * Tests for content block types and helper functions.
 * @module
 */

import { assert, assertEquals } from "@std/assert";
import {
  extractText,
  hasImages,
  imageBlock,
  MAX_IMAGE_BYTES,
  normalizeContent,
} from "../../src/core/image/content.ts";
import type { ContentBlock } from "../../src/core/image/content.ts";

Deno.test("normalizeContent — string input wraps in TextContentBlock", () => {
  const result = normalizeContent("hello");
  assertEquals(result, [{ type: "text", text: "hello" }]);
});

Deno.test("normalizeContent — empty string wraps in TextContentBlock", () => {
  const result = normalizeContent("");
  assertEquals(result, [{ type: "text", text: "" }]);
});

Deno.test("normalizeContent — content block array passes through unchanged", () => {
  const blocks: readonly ContentBlock[] = [
    { type: "text", text: "describe this" },
    {
      type: "image",
      source: { type: "base64", media_type: "image/png", data: "abc123" },
    },
  ];
  const result = normalizeContent(blocks);
  assertEquals(result, blocks);
});

Deno.test("extractText — from string returns string directly", () => {
  assertEquals(extractText("hello world"), "hello world");
});

Deno.test("extractText — from mixed blocks concatenates text blocks", () => {
  const blocks: readonly ContentBlock[] = [
    { type: "text", text: "first" },
    {
      type: "image",
      source: { type: "base64", media_type: "image/png", data: "abc" },
    },
    { type: "text", text: "second" },
  ];
  assertEquals(extractText(blocks), "first\nsecond");
});

Deno.test("extractText — from image-only blocks returns empty string", () => {
  const blocks: readonly ContentBlock[] = [
    {
      type: "image",
      source: { type: "base64", media_type: "image/png", data: "abc" },
    },
  ];
  assertEquals(extractText(blocks), "");
});

Deno.test("hasImages — string content returns false", () => {
  assertEquals(hasImages("hello"), false);
});

Deno.test("hasImages — text-only blocks returns false", () => {
  const blocks: readonly ContentBlock[] = [
    { type: "text", text: "hello" },
  ];
  assertEquals(hasImages(blocks), false);
});

Deno.test("hasImages — blocks with image returns true", () => {
  const blocks: readonly ContentBlock[] = [
    { type: "text", text: "describe this" },
    {
      type: "image",
      source: { type: "base64", media_type: "image/png", data: "abc" },
    },
  ];
  assertEquals(hasImages(blocks), true);
});

Deno.test("imageBlock — creates correct structure with base64", () => {
  // Small test image: 4 bytes
  const data = new Uint8Array([0x89, 0x50, 0x4E, 0x47]);
  const result = imageBlock(data, "image/png");

  assertEquals(result.ok, true);
  if (result.ok) {
    assertEquals(result.value.type, "image");
    assertEquals(result.value.source.type, "base64");
    assertEquals(result.value.source.media_type, "image/png");
    // Verify it's valid base64 by decoding
    const decoded = atob(result.value.source.data);
    assertEquals(decoded.length, 4);
    assertEquals(decoded.charCodeAt(0), 0x89);
    assertEquals(decoded.charCodeAt(1), 0x50);
  }
});

Deno.test("imageBlock — handles larger data (multi-chunk)", () => {
  // Create data larger than the 8192 chunk size
  const data = new Uint8Array(10000);
  for (let i = 0; i < data.length; i++) {
    data[i] = i % 256;
  }
  const result = imageBlock(data, "image/jpeg");

  assertEquals(result.ok, true);
  if (result.ok) {
    assertEquals(result.value.type, "image");
    assertEquals(result.value.source.media_type, "image/jpeg");
    // Verify round-trip
    const decoded = atob(result.value.source.data);
    assertEquals(decoded.length, 10000);
  }
});

Deno.test("imageBlock — rejects images exceeding MAX_IMAGE_BYTES", () => {
  const data = new Uint8Array(MAX_IMAGE_BYTES + 1);
  const result = imageBlock(data, "image/png");
  assertEquals(result.ok, false);
  if (!result.ok) {
    assert(result.error.includes("too large"));
  }
});

Deno.test("imageBlock — accepts images within MAX_IMAGE_BYTES limit", () => {
  const data = new Uint8Array([0x89, 0x50, 0x4E, 0x47]);
  const result = imageBlock(data, "image/png");
  assertEquals(result.ok, true);
});
