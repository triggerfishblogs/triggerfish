/**
 * Unit tests for the CLI context usage progress bar logic.
 *
 * Tests the pure `buildContextBarSegments` helper that drives the visual
 * bar rendered in the bottom separator line.
 *
 * @module
 */

import { assertEquals } from "@std/assert";
import { buildContextBarSegments } from "../../src/cli/screen.ts";

// ─── Empty / zero state ─────────────────────────────────────────

Deno.test("buildContextBarSegments: returns all-empty when max=0", () => {
  const seg = buildContextBarSegments(0, 0, 0);
  assertEquals(seg.filled, 0);
  assertEquals(seg.overflow, 0);
  assertEquals(seg.empty, 20);
  assertEquals(seg.markerPos, 0);
});

Deno.test("buildContextBarSegments: returns all-empty when current=0", () => {
  const seg = buildContextBarSegments(0, 100_000, 70_000);
  assertEquals(seg.filled, 0);
  assertEquals(seg.overflow, 0);
  assertEquals(seg.empty, 20);
});

// ─── Normal fill (below compact threshold) ──────────────────────

Deno.test("buildContextBarSegments: 50% fill has no overflow", () => {
  const seg = buildContextBarSegments(50_000, 100_000, 70_000);
  assertEquals(seg.overflow, 0);
  assertEquals(seg.filled, 10); // 50% of 20 = 10
  assertEquals(seg.empty, 10);
});

Deno.test("buildContextBarSegments: exactly at compact threshold (70%)", () => {
  const seg = buildContextBarSegments(70_000, 100_000, 70_000);
  assertEquals(seg.overflow, 0);
  assertEquals(seg.filled, 14); // 70% of 20 = 14
  assertEquals(seg.empty, 6);
  assertEquals(seg.markerPos, 14); // marker at 70%
});

// ─── Overflow (past compact threshold) ──────────────────────────

Deno.test("buildContextBarSegments: 85% fill has overflow beyond marker", () => {
  const seg = buildContextBarSegments(85_000, 100_000, 70_000);
  assertEquals(seg.filled, 14); // up to compact threshold (70%)
  // overflow = (85% - 70%) of 20 = 3
  assertEquals(seg.overflow, 3);
  assertEquals(seg.empty > 0, true);
});

Deno.test("buildContextBarSegments: at 100% clamps correctly", () => {
  const seg = buildContextBarSegments(100_000, 100_000, 70_000);
  assertEquals(seg.filled, 14); // up to compact threshold
  assertEquals(seg.filled + seg.overflow, 20); // bar completely full
  assertEquals(seg.empty, 0);
});

// ─── Marker position ────────────────────────────────────────────

Deno.test("buildContextBarSegments: marker at correct position for 70% threshold", () => {
  const seg = buildContextBarSegments(0, 200_000, 140_000); // 70% of 200k
  assertEquals(seg.markerPos, 14); // 70% of 20 = 14
});

Deno.test("buildContextBarSegments: custom bar width scales correctly", () => {
  const seg = buildContextBarSegments(50_000, 100_000, 70_000, 10);
  assertEquals(seg.filled, 5); // 50% of 10
  assertEquals(seg.markerPos, 7); // 70% of 10 = 7
});

// ─── Total always equals barWidth ───────────────────────────────

Deno.test("buildContextBarSegments: filled+overflow+empty always equals barWidth", () => {
  const cases: [number, number, number][] = [
    [0, 100_000, 70_000],
    [35_000, 100_000, 70_000],
    [70_000, 100_000, 70_000],
    [85_000, 100_000, 70_000],
    [100_000, 100_000, 70_000],
    [120_000, 100_000, 70_000], // over max → should clamp
  ];
  for (const [current, max, compactAt] of cases) {
    const seg = buildContextBarSegments(current, max, compactAt);
    assertEquals(
      seg.filled + seg.overflow + seg.empty,
      20,
      `total must equal barWidth for current=${current}`,
    );
  }
});
