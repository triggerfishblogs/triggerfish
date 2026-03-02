/**
 * Tests for log input sanitization — sanitizeExternal, tagExternal, formatTaggedEntry.
 *
 * @module
 */
import {
  assertEquals,
  assertNotEquals,
  assertStringIncludes,
} from "@std/assert";
import {
  formatTaggedEntry,
  MAX_EXTERNAL_BYTES,
  sanitizeExternal,
  tagExternal,
} from "../../src/core/logger/sanitizer.ts";

// ─── sanitizeExternal ───────────────────────────────────────────────────────

Deno.test("sanitizeExternal: truncates to 256 bytes", () => {
  const input = "a".repeat(300);
  const result = sanitizeExternal(input);
  assertEquals(new TextEncoder().encode(result).byteLength, MAX_EXTERNAL_BYTES);
});

Deno.test("sanitizeExternal: clean UTF-8 boundary on truncation", () => {
  // Build a string that has a 4-byte emoji crossing the 256-byte boundary.
  // Pad with 254 ASCII chars, then add a 4-byte emoji (🚀 = U+1F680).
  const prefix = "a".repeat(254);
  const emoji = "🚀"; // 4 bytes in UTF-8: F0 9F 9A 80
  const input = prefix + emoji + "trailing";
  const result = sanitizeExternal(input);
  // Must not throw on re-encode/decode — result must be valid UTF-8
  const reEncoded = new TextEncoder().encode(result);
  new TextDecoder("utf-8", { fatal: true }).decode(reEncoded);
  // Result should be close to the byte limit (allows for U+FFFD replacement which is 3 bytes)
  assertEquals(reEncoded.byteLength <= MAX_EXTERNAL_BYTES + 2, true);
});

Deno.test("sanitizeExternal: replaces \\n with space", () => {
  assertEquals(sanitizeExternal("line1\nline2"), "line1 line2");
});

Deno.test("sanitizeExternal: replaces \\r\\n with space", () => {
  assertEquals(sanitizeExternal("line1\r\nline2"), "line1 line2");
});

Deno.test("sanitizeExternal: replaces bare \\r with space", () => {
  assertEquals(sanitizeExternal("line1\rline2"), "line1 line2");
});

Deno.test("sanitizeExternal: strips null byte", () => {
  assertEquals(sanitizeExternal("foo\x00bar"), "foobar");
});

Deno.test("sanitizeExternal: strips BEL (U+0007)", () => {
  assertEquals(sanitizeExternal("foo\x07bar"), "foobar");
});

Deno.test("sanitizeExternal: strips ESC (U+001B)", () => {
  assertEquals(sanitizeExternal("foo\x1Bbar"), "foobar");
});

Deno.test("sanitizeExternal: strips DEL (U+007F)", () => {
  assertEquals(sanitizeExternal("foo\x7Fbar"), "foobar");
});

Deno.test("sanitizeExternal: preserves tab (U+0009)", () => {
  assertStringIncludes(sanitizeExternal("foo\tbar"), "\t");
});

Deno.test("sanitizeExternal: escapes « delimiter to ‹", () => {
  assertEquals(sanitizeExternal("foo\u00ABbar"), "foo\u2039bar");
});

Deno.test("sanitizeExternal: escapes » delimiter to ›", () => {
  assertEquals(sanitizeExternal("foo\u00BBbar"), "foo\u203Abar");
});

Deno.test("sanitizeExternal: handles empty string", () => {
  assertEquals(sanitizeExternal(""), "");
});

Deno.test("sanitizeExternal: short string unchanged beyond sanitization", () => {
  const short = "hello world";
  assertEquals(sanitizeExternal(short), short);
});

// ─── tagExternal ────────────────────────────────────────────────────────────

Deno.test("tagExternal: wraps value in « »", () => {
  assertEquals(tagExternal("x"), "\u00ABx\u00BB");
});

Deno.test("tagExternal: sanitizes before wrapping — newline replaced", () => {
  const result = tagExternal("line1\nline2");
  assertEquals(result, "\u00ABline1 line2\u00BB");
});

Deno.test("tagExternal: inner « escaped so no nested delimiter", () => {
  const result = tagExternal("a\u00ABb");
  // The « inside must be escaped to ‹, so the outer «» are the only real delimiters
  assertStringIncludes(result, "\u2039"); // ‹ present
  assertEquals(result.indexOf("\u00AB"), 0); // only the outer opening «
  assertEquals(result.lastIndexOf("\u00BB"), result.length - 1); // only the outer closing »
});

// ─── formatTaggedEntry ──────────────────────────────────────────────────────

Deno.test("formatTaggedEntry: trusted message left unchanged", () => {
  const result = formatTaggedEntry("WS upgrade", {
    origin: "http://example.com",
  });
  // Message part should not be wrapped in « »
  assertEquals(result.startsWith("WS upgrade"), true);
});

Deno.test("formatTaggedEntry: each field value is wrapped in « »", () => {
  const result = formatTaggedEntry("msg", {
    origin: "http://a.com",
    ua: "curl",
  });
  assertStringIncludes(result, "origin=\u00AB");
  assertStringIncludes(result, "ua=\u00AB");
  assertStringIncludes(result, "\u00BB");
});

Deno.test("formatTaggedEntry: empty fields map returns just the message", () => {
  assertEquals(formatTaggedEntry("just a message", {}), "just a message");
});

Deno.test("formatTaggedEntry: multiple fields space-separated", () => {
  const result = formatTaggedEntry("msg", { a: "1", b: "2" });
  assertStringIncludes(result, "a=\u00AB1\u00BB b=\u00AB2\u00BB");
});

Deno.test("formatTaggedEntry: field key is not wrapped in delimiters", () => {
  const result = formatTaggedEntry("msg", { myKey: "val" });
  // Key 'myKey' should not have « or » around it
  assertNotEquals(result.indexOf("\u00AB"), result.indexOf("myKey") - 1);
  assertStringIncludes(result, "myKey=\u00AB");
});
