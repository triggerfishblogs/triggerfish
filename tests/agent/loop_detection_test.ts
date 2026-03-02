/**
 * Tests for tool call loop detection.
 */
import { assertEquals } from "@std/assert";
import {
  recordToolCallsAndDetectLoop,
  serializeToolCallKey,
  TOOL_LOOP_THRESHOLD,
  type ToolCallHistory,
} from "../../src/agent/loop/loop_types.ts";

// ─── serializeToolCallKey ────────────────────────────────────────────────────

Deno.test("serializeToolCallKey: produces deterministic key", () => {
  const key1 = serializeToolCallKey("web_search", { query: "test" });
  const key2 = serializeToolCallKey("web_search", { query: "test" });
  assertEquals(key1, key2);
});

Deno.test("serializeToolCallKey: different args produce different keys", () => {
  const key1 = serializeToolCallKey("web_search", { query: "foo" });
  const key2 = serializeToolCallKey("web_search", { query: "bar" });
  assertEquals(key1 === key2, false);
});

Deno.test("serializeToolCallKey: different names produce different keys", () => {
  const key1 = serializeToolCallKey("web_search", { query: "test" });
  const key2 = serializeToolCallKey("web_fetch", { query: "test" });
  assertEquals(key1 === key2, false);
});

Deno.test("serializeToolCallKey: key order does not affect result", () => {
  const key1 = serializeToolCallKey("tool", { a: 1, b: 2 });
  const key2 = serializeToolCallKey("tool", { b: 2, a: 1 });
  assertEquals(key1, key2);
});

Deno.test("serializeToolCallKey: nested objects are serialized", () => {
  const key = serializeToolCallKey("tool", { nested: { a: 1 } });
  assertEquals(typeof key, "string");
  assertEquals(key.includes("nested"), true);
});

// ─── recordToolCallsAndDetectLoop ────────────────────────────────────────────

function makeHistory(): ToolCallHistory {
  return { calls: new Map() };
}

Deno.test("recordToolCallsAndDetectLoop: no loop on first call", () => {
  const history = makeHistory();
  const detected = recordToolCallsAndDetectLoop(history, [
    { name: "web_search", args: { query: "test" } },
  ]);
  assertEquals(detected, false);
});

Deno.test("recordToolCallsAndDetectLoop: no loop below threshold", () => {
  const history = makeHistory();
  for (let i = 0; i < TOOL_LOOP_THRESHOLD - 1; i++) {
    recordToolCallsAndDetectLoop(history, [
      { name: "web_search", args: { query: "test" } },
    ]);
  }
  assertEquals(history.calls.get(serializeToolCallKey("web_search", { query: "test" })), TOOL_LOOP_THRESHOLD - 1);
});

Deno.test("recordToolCallsAndDetectLoop: detects loop at threshold", () => {
  const history = makeHistory();
  let detected = false;
  for (let i = 0; i < TOOL_LOOP_THRESHOLD; i++) {
    detected = recordToolCallsAndDetectLoop(history, [
      { name: "web_search", args: { query: "test" } },
    ]);
  }
  assertEquals(detected, true);
});

Deno.test("recordToolCallsAndDetectLoop: different args do not trigger loop", () => {
  const history = makeHistory();
  let detected = false;
  for (let i = 0; i < TOOL_LOOP_THRESHOLD; i++) {
    detected = recordToolCallsAndDetectLoop(history, [
      { name: "web_search", args: { query: `query-${i}` } },
    ]);
  }
  assertEquals(detected, false);
});

Deno.test("recordToolCallsAndDetectLoop: batch with multiple calls", () => {
  const history = makeHistory();
  // Call two different tools in a batch, repeated 3 times
  let detected = false;
  for (let i = 0; i < TOOL_LOOP_THRESHOLD; i++) {
    detected = recordToolCallsAndDetectLoop(history, [
      { name: "web_search", args: { query: "same" } },
      { name: "web_fetch", args: { url: "same" } },
    ]);
  }
  assertEquals(detected, true);
});

Deno.test("recordToolCallsAndDetectLoop: mixed unique and repeated calls", () => {
  const history = makeHistory();
  // Only one tool is repeated enough times
  for (let i = 0; i < TOOL_LOOP_THRESHOLD - 1; i++) {
    recordToolCallsAndDetectLoop(history, [
      { name: "web_search", args: { query: "same" } },
    ]);
  }
  // Different tool in the same batch as the threshold-hitting one
  const detected = recordToolCallsAndDetectLoop(history, [
    { name: "web_search", args: { query: "same" } },
    { name: "web_fetch", args: { url: "unique" } },
  ]);
  assertEquals(detected, true);
});

Deno.test("TOOL_LOOP_THRESHOLD: is 3", () => {
  assertEquals(TOOL_LOOP_THRESHOLD, 3);
});
