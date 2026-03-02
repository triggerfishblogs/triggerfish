/**
 * Tests for clipboard image reading utilities.
 * @module
 */

import { assertEquals } from "@std/assert";
import { detectImageType } from "../../src/tools/image/clipboard.ts";

Deno.test("detectImageType — PNG magic bytes", () => {
  const pngData = new Uint8Array([
    0x89,
    0x50,
    0x4E,
    0x47,
    0x0D,
    0x0A,
    0x1A,
    0x0A,
    0x00,
    0x00,
  ]);
  assertEquals(detectImageType(pngData), "image/png");
});

Deno.test("detectImageType — JPEG magic bytes", () => {
  const jpegData = new Uint8Array([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10]);
  assertEquals(detectImageType(jpegData), "image/jpeg");
});

Deno.test("detectImageType — JPEG with EXIF marker", () => {
  const jpegData = new Uint8Array([0xFF, 0xD8, 0xFF, 0xE1, 0x00, 0x00]);
  assertEquals(detectImageType(jpegData), "image/jpeg");
});

Deno.test("detectImageType — too short data returns null", () => {
  const short = new Uint8Array([0x89, 0x50]);
  assertEquals(detectImageType(short), null);
});

Deno.test("detectImageType — empty data returns null", () => {
  const empty = new Uint8Array(0);
  assertEquals(detectImageType(empty), null);
});

Deno.test("detectImageType — non-image data returns null", () => {
  // Text-like bytes
  const text = new TextEncoder().encode("Hello, world!");
  assertEquals(detectImageType(text), null);
});

Deno.test("detectImageType — random bytes returns null", () => {
  const random = new Uint8Array([
    0x01,
    0x02,
    0x03,
    0x04,
    0x05,
    0x06,
    0x07,
    0x08,
  ]);
  assertEquals(detectImageType(random), null);
});
