/**
 * Tests for tool display formatting: in-progress indicator and edit_file diff.
 *
 * @module
 */

import { assertEquals, assert } from "@std/assert";
import {
  formatToolCompactInProgress,
  formatEditFileDiff,
} from "../../src/cli/chat/render/tool_display.ts";

// ─── formatToolCompactInProgress ─────────────────────────────

Deno.test("formatToolCompactInProgress: shows tool name and running indicator", () => {
  const result = formatToolCompactInProgress("run_command", { command: "ls -la" });
  assert(result.includes("Run"), "should use display name 'Run'");
  assert(result.includes("ls -la"), "should include lead argument");
  assert(result.includes("running"), "should show running indicator");
  assert(result.includes("\u21bb"), "should include ↻ symbol");
});

Deno.test("formatToolCompactInProgress: uses display name mapping", () => {
  const result = formatToolCompactInProgress("web_search", { query: "test query" });
  assert(result.includes("Web Search"), "should use display name 'Web Search'");
  assert(result.includes("test query"), "should include query");
});

Deno.test("formatToolCompactInProgress: falls back to raw name for unknown tools", () => {
  const result = formatToolCompactInProgress("custom_tool", { arg: "value" });
  assert(result.includes("custom_tool"), "should show raw tool name");
});

Deno.test("formatToolCompactInProgress: handles empty args", () => {
  const result = formatToolCompactInProgress("run_command", {});
  assert(result.includes("Run"), "should still show tool name");
  assert(result.includes("running"), "should still show running indicator");
});

Deno.test("formatToolCompactInProgress: contains yellow bullet", () => {
  const result = formatToolCompactInProgress("read_file", { path: "/tmp/test.ts" });
  assert(result.includes("\u25cf"), "should include bullet character ●");
});

// ─── formatEditFileDiff ──────────────────────────────────────

Deno.test("formatEditFileDiff: shows removed and added lines", () => {
  const result = formatEditFileDiff(
    'const old = "value";',
    'const updated = "value";',
    "Edited src/foo.ts (1245 bytes written)",
  );
  assert(result.includes("- const old"), "should show removed line with - prefix");
  assert(result.includes("+ const updated"), "should show added line with + prefix");
  assert(result.includes("Edit"), "should include Edit header");
  assert(result.includes("1245 bytes"), "should include result summary");
});

Deno.test("formatEditFileDiff: handles multi-line changes", () => {
  const oldText = "line1\nline2\nline3";
  const newText = "line1\nchanged\nline3\nline4";
  const result = formatEditFileDiff(oldText, newText, "Edited test.ts");
  const lines = result.split("\n");
  // Header + 3 old lines + 4 new lines + result = 9
  assertEquals(lines.length, 9);
});

Deno.test("formatEditFileDiff: caps long diffs with ellipsis", () => {
  const oldLines = Array.from({ length: 20 }, (_, i) => `old line ${i}`);
  const newLines = Array.from({ length: 15 }, (_, i) => `new line ${i}`);
  const result = formatEditFileDiff(
    oldLines.join("\n"),
    newLines.join("\n"),
    "Edited big.ts",
  );
  assert(result.includes("... "), "should include ellipsis for capped lines");
  assert(result.includes("more line"), "should indicate omitted line count");
});

Deno.test("formatEditFileDiff: single line change stays compact", () => {
  const result = formatEditFileDiff("a", "b", "Edited x.ts");
  const lines = result.split("\n");
  // Header + 1 old + 1 new + result = 4
  assertEquals(lines.length, 4);
});

Deno.test("formatEditFileDiff: contains ANSI color codes", () => {
  const result = formatEditFileDiff("old", "new", "Edited x.ts");
  // RED = \x1b[31m, GREEN = \x1b[32m
  assert(result.includes("\x1b[31m"), "should include red ANSI code for removals");
  assert(result.includes("\x1b[32m"), "should include green ANSI code for additions");
});
