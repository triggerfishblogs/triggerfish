/**
 * Tests for response quality detection: repetition, empty/junk, leaked intent.
 */
import { assertEquals } from "@std/assert";
import {
  classifyResponseQuality,
  detectRepetition,
} from "../../src/agent/dispatch/response_handling.ts";

// ─── detectRepetition ────────────────────────────────────────────────────────

Deno.test("detectRepetition: returns null for normal text", () => {
  const text =
    "This is a perfectly normal response about how to navigate a website. " +
    "I found the article you were looking for and clicked on it. " +
    "The page is now showing the full content of the AI article from IBM.";
  assertEquals(detectRepetition(text), null);
});

Deno.test("detectRepetition: returns null for short text", () => {
  assertEquals(detectRepetition("hello"), null);
  assertEquals(detectRepetition(""), null);
});

Deno.test("detectRepetition: detects obvious repetition loop", () => {
  const phrase =
    "You're absolutely right—I apologize for that confusing response! " +
    "I actually did complete the task successfully. Let me take a snapshot to show you the article that was opened:";
  const repeated = phrase.repeat(50);
  const result = detectRepetition(repeated);
  assertEquals(result !== null, true);
  // Should return just the first occurrence, not the whole mess
  assertEquals(result!.length < repeated.length, true);
  assertEquals(result!.length <= phrase.length * 2, true);
});

Deno.test("detectRepetition: detects repetition with slight prefix variation", () => {
  const intro = "Sure, here's what I found. ";
  const phrase =
    "The article discusses how AI is transforming enterprise workflows and improving productivity across organizations. ";
  const text = intro + phrase.repeat(20);
  const result = detectRepetition(text);
  // Should detect the repetition even with a different intro
  assertEquals(result !== null, true);
});

Deno.test("detectRepetition: does not false-positive on legitimate repeated words", () => {
  // Short repeated phrases below the threshold length should not trigger
  const text =
    "The quick brown fox. The quick brown fox jumped over the lazy dog. " +
    "The quick brown fox is a common typing test phrase. " +
    "The quick brown fox appears in many tutorials.";
  assertEquals(detectRepetition(text), null);
});

Deno.test("detectRepetition: handles exact 3x repetition at threshold", () => {
  const phrase = "A".repeat(60) + " "; // 61 chars, just above MIN_REPEAT_PHRASE_LEN
  const text = phrase.repeat(3);
  const result = detectRepetition(text);
  assertEquals(result !== null, true);
});

Deno.test("detectRepetition: does not trigger for 2x repetition (below threshold)", () => {
  const phrase =
    "This is a long enough phrase that it should be detected if repeated three times but not if only repeated twice. ";
  const text = phrase.repeat(2);
  assertEquals(detectRepetition(text), null);
});

// ─── classifyResponseQuality ─────────────────────────────────────────────────

Deno.test("classifyResponseQuality: empty string is junk", () => {
  const result = classifyResponseQuality("", false);
  assertEquals(result.isEmptyOrJunk, true);
});

Deno.test("classifyResponseQuality: short JSON is junk", () => {
  const result = classifyResponseQuality('{"tool": "web_search"}', false);
  assertEquals(result.isEmptyOrJunk, true);
});

Deno.test("classifyResponseQuality: echoed tool placeholder is junk", () => {
  const result = classifyResponseQuality(
    "(3 tool call(s) executed — see results below)",
    true,
  );
  assertEquals(result.isEmptyOrJunk, true);
});

Deno.test("classifyResponseQuality: normal response is not junk", () => {
  const result = classifyResponseQuality(
    "Here's the article I found about AI on IBM's website.",
    true,
  );
  assertEquals(result.isEmptyOrJunk, false);
  assertEquals(result.isLeakedIntent, false);
});
