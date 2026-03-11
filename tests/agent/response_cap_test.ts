/**
 * Tests for centralized tool response capping with cache + read_more.
 */
import { assertEquals, assertMatch } from "@std/assert";
import {
  capToolResponse,
  DEFAULT_RESPONSE_BUDGET,
  getReadMoreToolDefinition,
  MAX_CACHE_ENTRIES,
  readMoreFromCache,
  ResponseCache,
  TOOL_RESPONSE_BUDGETS,
  truncateAtLineBoundary,
} from "../../src/agent/dispatch/response_cap.ts";

// ─── truncateAtLineBoundary ──────────────────────────────────────────────────

Deno.test("truncateAtLineBoundary: finds last newline before budget", () => {
  const text = "line1\nline2\nline3\nline4";
  // budget 12 falls in "line3" — last \n before 12 is at index 11
  assertEquals(truncateAtLineBoundary(text, 12), 11);
});

Deno.test("truncateAtLineBoundary: falls back to budget when no newline", () => {
  const text = "no-newlines-at-all";
  assertEquals(truncateAtLineBoundary(text, 10), 10);
});

Deno.test("truncateAtLineBoundary: newline at position 0 is ignored", () => {
  const text = "\nall on second line here";
  // The only newline is at index 0 — lastIndexOf("\n", 5) = 0, but 0 is not > 0
  assertEquals(truncateAtLineBoundary(text, 5), 5);
});

// ─── ResponseCache ───────────────────────────────────────────────────────────

Deno.test("ResponseCache: store and retrieve entry", () => {
  const cache = new ResponseCache();
  const id = cache.store({
    fullText: "hello world",
    toolName: "test_tool",
    budget: 5,
    cursor: 5,
  });
  assertEquals(typeof id, "string");
  assertEquals(id.length, 6);
  const entry = cache.get(id);
  assertEquals(entry?.fullText, "hello world");
  assertEquals(entry?.toolName, "test_tool");
  assertEquals(entry?.budget, 5);
});

Deno.test("ResponseCache: returns undefined for missing ID", () => {
  const cache = new ResponseCache();
  assertEquals(cache.get("nope42"), undefined);
});

Deno.test("ResponseCache: evicts oldest entry at capacity", () => {
  const cache = new ResponseCache();
  const ids: string[] = [];
  for (let i = 0; i < MAX_CACHE_ENTRIES + 1; i++) {
    ids.push(
      cache.store({
        fullText: `entry-${i}`,
        toolName: "t",
        budget: 10,
        cursor: 10,
      }),
    );
  }
  assertEquals(cache.size, MAX_CACHE_ENTRIES);
  // First entry should be evicted
  assertEquals(cache.get(ids[0]), undefined);
  // Last entry should still be present
  assertEquals(
    cache.get(ids[MAX_CACHE_ENTRIES])?.fullText,
    `entry-${MAX_CACHE_ENTRIES}`,
  );
});

// ─── capToolResponse ─────────────────────────────────────────────────────────

Deno.test("capToolResponse: short responses pass through unchanged", () => {
  const cache = new ResponseCache();
  const text = "short response";
  const result = capToolResponse("some_tool", text, cache);
  assertEquals(result, text);
  assertEquals(cache.size, 0);
});

Deno.test("capToolResponse: empty string passes through", () => {
  const cache = new ResponseCache();
  assertEquals(capToolResponse("t", "", cache), "");
  assertEquals(cache.size, 0);
});

Deno.test("capToolResponse: over-budget response is truncated with marker", () => {
  const cache = new ResponseCache();
  // Build a response that exceeds the budget
  const lines = Array.from(
    { length: 200 },
    (_, i) => `line ${i}: ${"x".repeat(80)}`,
  );
  const text = lines.join("\n");
  const result = capToolResponse("some_tool", text, cache, 500);
  // Should be truncated
  assertEquals(result.length < text.length, true);
  assertMatch(
    result,
    /… \[truncated — \d+ chars remaining, use read_more\(cache_id="[a-f0-9]{6}"\) to continue\]/,
  );
  assertEquals(cache.size, 1);
});

Deno.test("capToolResponse: truncation at line boundary", () => {
  const cache = new ResponseCache();
  const text = "aaa\nbbb\nccc\nddd\neee";
  // budget = 10, last \n before 10 is at index 7 (\n before "ccc")
  const result = capToolResponse("some_tool", text, cache, 10);
  // The visible content before the marker should end at a line boundary
  const markerIdx = result.indexOf("\n… [truncated");
  const content = result.slice(0, markerIdx);
  // Should end at a newline boundary — no partial lines
  assertEquals(content, "aaa\nbbb");
});

Deno.test("capToolResponse: per-tool budget override takes precedence", () => {
  const cache = new ResponseCache();
  const githubBudget = TOOL_RESPONSE_BUDGETS.get("github_issues")!;
  // Build text that exceeds the github budget but not the default
  const text = "x".repeat(githubBudget + 100);
  const result = capToolResponse("github_issues", text, cache);
  assertEquals(result.length < text.length, true);
  assertMatch(result, /truncated/);
});

Deno.test("capToolResponse: config budget overrides global default for unlisted tools", () => {
  const cache = new ResponseCache();
  const configBudget = 200;
  const text = "y".repeat(300);
  const result = capToolResponse("unlisted_tool", text, cache, configBudget);
  assertMatch(result, /truncated/);
  // Without configBudget, 300 chars is well under the 12K default
  const cache2 = new ResponseCache();
  const result2 = capToolResponse("unlisted_tool", text, cache2);
  assertEquals(result2, text);
});

// ─── readMoreFromCache ───────────────────────────────────────────────────────

Deno.test("readMoreFromCache: returns correct chunk at cursor offset", () => {
  const cache = new ResponseCache();
  const fullText = "a".repeat(100);
  const id = cache.store({ fullText, toolName: "t", budget: 30, cursor: 30 });
  const result = readMoreFromCache(cache, id);
  // Default offset = cursor (30), should get chars 30..60
  assertEquals(result.includes("a".repeat(30)), true);
  assertMatch(result, /truncated/);
});

Deno.test("readMoreFromCache: cursor auto-advances on successive calls", () => {
  const cache = new ResponseCache();
  const fullText = "a".repeat(100);
  const id = cache.store({ fullText, toolName: "t", budget: 30, cursor: 30 });
  // First call: reads 30..60, cursor advances to 60
  const r1 = readMoreFromCache(cache, id);
  assertMatch(r1, /truncated/);
  // Second call without offset: reads 60..90 (auto-advanced cursor)
  const r2 = readMoreFromCache(cache, id);
  assertMatch(r2, /truncated/);
  // Third call: reads 90..100, final chunk
  const r3 = readMoreFromCache(cache, id);
  assertEquals(r3, "a".repeat(10));
  assertEquals(r3.includes("truncated"), false);
});

Deno.test("readMoreFromCache: returns final chunk without marker", () => {
  const cache = new ResponseCache();
  const fullText = "a".repeat(50);
  const id = cache.store({ fullText, toolName: "t", budget: 30, cursor: 30 });
  // offset 30, budget 30 → 30..60 but text is only 50 chars
  const result = readMoreFromCache(cache, id, 30);
  assertEquals(result, "a".repeat(20));
  assertEquals(result.includes("truncated"), false);
});

Deno.test("readMoreFromCache: custom offset works", () => {
  const cache = new ResponseCache();
  const fullText = "0123456789abcdef";
  const id = cache.store({ fullText, toolName: "t", budget: 100, cursor: 100 });
  const result = readMoreFromCache(cache, id, 5);
  // budget 100 > remaining text, so returns everything from offset 5
  assertEquals(result, "56789abcdef");
});

Deno.test("readMoreFromCache: missing cache_id returns error", () => {
  const cache = new ResponseCache();
  const result = readMoreFromCache(cache, "gone42");
  assertMatch(result, /not found/);
  assertMatch(result, /evicted/);
});

Deno.test("readMoreFromCache: handles long newline-free segments without cursor regression", () => {
  const cache = new ResponseCache();
  // Text with a newline early, then a long newline-free segment
  const fullText = "header\n" + "x".repeat(200);
  const id = cache.store({ fullText, toolName: "t", budget: 50, cursor: 50 });
  // First read: cursor=50, chunk 50..100. No newlines in that range.
  // truncateAtLineBoundary would find \n at index 6, which is < startOffset(50).
  // Without the clamp fix, effectiveEnd would be 6, causing cursor regression.
  const r1 = readMoreFromCache(cache, id);
  assertEquals(r1.length > 0, true);
  assertEquals(r1.includes("truncated"), true);
  // Second read should advance, not regress
  const r2 = readMoreFromCache(cache, id);
  assertEquals(r2.length > 0, true);
  // Should eventually reach the end
  const r3 = readMoreFromCache(cache, id);
  assertEquals(r3.length > 0, true);
});

Deno.test("readMoreFromCache: offset past end returns helpful message", () => {
  const cache = new ResponseCache();
  const id = cache.store({
    fullText: "short",
    toolName: "t",
    budget: 10,
    cursor: 10,
  });
  const result = readMoreFromCache(cache, id, 999);
  assertMatch(result, /No more content/);
});

Deno.test("readMoreFromCache: appends continuation marker when more remains", () => {
  const cache = new ResponseCache();
  const lines = Array.from({ length: 100 }, (_, i) => `line-${i}`);
  const fullText = lines.join("\n");
  const id = cache.store({ fullText, toolName: "t", budget: 50, cursor: 50 });
  const chunk1 = readMoreFromCache(cache, id);
  assertMatch(chunk1, /truncated/);
  // Cursor auto-advances — just call again without offset
  const chunk2 = readMoreFromCache(cache, id);
  assertEquals(typeof chunk2, "string");
  assertEquals(chunk2.length > 0, true);
});

// ─── getReadMoreToolDefinition ───────────────────────────────────────────────

Deno.test("getReadMoreToolDefinition: has correct shape", () => {
  const def = getReadMoreToolDefinition();
  assertEquals(def.name, "read_more");
  assertEquals(typeof def.description, "string");
  assertEquals(def.parameters.cache_id.type, "string");
  assertEquals(def.parameters.cache_id.required, true);
  assertEquals(def.parameters.offset.type, "number");
  assertEquals(def.parameters.offset.required, false);
});

// ─── Integration: cap then read_more full chain ──────────────────────────────

Deno.test("integration: cap + read_more retrieves all content", () => {
  const cache = new ResponseCache();
  const budget = 50;
  const lines = Array.from(
    { length: 20 },
    (_, i) => `line-${i}: ${"x".repeat(10)}`,
  );
  const fullText = lines.join("\n");

  const capped = capToolResponse("test_tool", fullText, cache, budget);
  assertMatch(capped, /truncated/);

  // Extract cache_id from marker
  const idMatch = capped.match(/cache_id="([a-f0-9]{6})"/);
  assertEquals(idMatch !== null, true);
  const cacheId = idMatch![1];

  // Collect all chunks — cursor auto-advances, no offset needed
  const chunks: string[] = [];
  const markerIdx = capped.indexOf("\n… [truncated");
  chunks.push(capped.slice(0, markerIdx));

  let safety = 0;
  while (safety < 50) {
    safety++;
    const chunk = readMoreFromCache(cache, cacheId);
    const chunkMarkerIdx = chunk.indexOf("\n… [truncated");
    if (chunkMarkerIdx === -1) {
      chunks.push(chunk);
      break;
    }
    chunks.push(chunk.slice(0, chunkMarkerIdx));
  }

  const reassembled = chunks.join("");
  assertEquals(reassembled, fullText);
});

// ─── Constants ───────────────────────────────────────────────────────────────

Deno.test("DEFAULT_RESPONSE_BUDGET is 12000", () => {
  assertEquals(DEFAULT_RESPONSE_BUDGET, 12_000);
});

Deno.test("MAX_CACHE_ENTRIES is 10", () => {
  assertEquals(MAX_CACHE_ENTRIES, 10);
});
