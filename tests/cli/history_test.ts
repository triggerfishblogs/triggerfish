/**
 * Tests for persistent input history.
 *
 * @module
 */

import { assertEquals } from "@std/assert";
import {
  createInputHistory,
  loadInputHistory,
  saveInputHistory,
} from "../../src/cli/history.ts";

// ─── Basic navigation ───────────────────────────────────────────

Deno.test("InputHistory: starts empty", () => {
  const h = createInputHistory();
  assertEquals(h.entries, []);
  assertEquals(h.index, -1);
  assertEquals(h.current(), null);
});

Deno.test("InputHistory: push adds entries", () => {
  let h = createInputHistory();
  h = h.push("hello");
  h = h.push("world");
  assertEquals(h.entries, ["hello", "world"]);
});

Deno.test("InputHistory: push deduplicates consecutive entries", () => {
  let h = createInputHistory();
  h = h.push("hello");
  h = h.push("hello");
  h = h.push("hello");
  assertEquals(h.entries, ["hello"]);
});

Deno.test("InputHistory: push allows non-consecutive duplicates", () => {
  let h = createInputHistory();
  h = h.push("hello");
  h = h.push("world");
  h = h.push("hello");
  assertEquals(h.entries, ["hello", "world", "hello"]);
});

Deno.test("InputHistory: push skips empty strings", () => {
  let h = createInputHistory();
  h = h.push("");
  h = h.push("  ");
  assertEquals(h.entries, []);
});

Deno.test("InputHistory: up navigates to previous entries", () => {
  let h = createInputHistory();
  h = h.push("first");
  h = h.push("second");
  h = h.push("third");

  h = h.up();
  assertEquals(h.current(), "third");
  h = h.up();
  assertEquals(h.current(), "second");
  h = h.up();
  assertEquals(h.current(), "first");
});

Deno.test("InputHistory: up at top stays at top", () => {
  let h = createInputHistory();
  h = h.push("only");
  h = h.up();
  assertEquals(h.current(), "only");
  h = h.up(); // Should stay at "only"
  assertEquals(h.current(), "only");
});

Deno.test("InputHistory: up on empty history returns null", () => {
  let h = createInputHistory();
  h = h.up();
  assertEquals(h.current(), null);
});

Deno.test("InputHistory: down navigates back to newer entries", () => {
  let h = createInputHistory();
  h = h.push("first");
  h = h.push("second");
  h = h.push("third");

  h = h.up(); // third
  h = h.up(); // second
  h = h.up(); // first
  h = h.down(); // second
  assertEquals(h.current(), "second");
  h = h.down(); // third
  assertEquals(h.current(), "third");
});

Deno.test("InputHistory: down past newest returns null", () => {
  let h = createInputHistory();
  h = h.push("first");
  h = h.up(); // first
  h = h.down(); // back to fresh
  assertEquals(h.current(), null);
  assertEquals(h.index, -1);
});

Deno.test("InputHistory: resetNavigation returns to fresh state", () => {
  let h = createInputHistory();
  h = h.push("first");
  h = h.push("second");
  h = h.up();
  h = h.up();
  assertEquals(h.current(), "first");
  h = h.resetNavigation();
  assertEquals(h.index, -1);
  assertEquals(h.current(), null);
});

// ─── Max entries ────────────────────────────────────────────────

Deno.test("InputHistory: respects max entries limit", () => {
  let h = createInputHistory(5);
  for (let i = 0; i < 10; i++) {
    h = h.push(`entry-${i}`);
  }
  assertEquals(h.entries.length, 5);
  // Should keep the most recent 5
  assertEquals(h.entries[0], "entry-5");
  assertEquals(h.entries[4], "entry-9");
});

// ─── Persistence ────────────────────────────────────────────────

Deno.test("loadInputHistory and saveInputHistory round-trip", async () => {
  const tmpFile = await Deno.makeTempFile({ suffix: ".json" });
  try {
    // Create and save
    let h = createInputHistory();
    h = h.push("alpha");
    h = h.push("beta");
    h = h.push("gamma");
    await saveInputHistory(tmpFile, h);

    // Load back
    const loaded = await loadInputHistory(tmpFile);
    assertEquals(loaded.entries, ["alpha", "beta", "gamma"]);
    assertEquals(loaded.index, -1);
  } finally {
    await Deno.remove(tmpFile);
  }
});

Deno.test("loadInputHistory returns empty for missing file", async () => {
  const loaded = await loadInputHistory("/tmp/nonexistent_history_file.json");
  assertEquals(loaded.entries, []);
});

Deno.test("loadInputHistory returns empty for corrupted file", async () => {
  const tmpFile = await Deno.makeTempFile({ suffix: ".json" });
  try {
    await Deno.writeTextFile(tmpFile, "not valid json{{{");
    const loaded = await loadInputHistory(tmpFile);
    assertEquals(loaded.entries, []);
  } finally {
    await Deno.remove(tmpFile);
  }
});
