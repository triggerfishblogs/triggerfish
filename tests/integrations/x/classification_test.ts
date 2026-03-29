/**
 * Tests for X (Twitter) tool prefix classification mapping.
 *
 * Verifies that mapToolPrefixClassifications correctly handles
 * default and configured classification levels for the x_ prefix.
 *
 * @module
 */

import { assertEquals } from "@std/assert";
import { mapToolPrefixClassifications } from "../../../src/agent/orchestrator/classification_map.ts";

// ─── Default classification ─────────────────────────────────────────────────

Deno.test("XClassification: X tools default to INTERNAL when no config override", () => {
  const maps = mapToolPrefixClassifications({});
  assertEquals(maps.all.get("x_"), "INTERNAL");
  assertEquals(maps.integrations.get("x_"), "INTERNAL");
});

// ─── Configured classification ───────────────────────────────────────────────

Deno.test("XClassification: X tools use configured classification when set", () => {
  const maps = mapToolPrefixClassifications({
    x: { classification: "CONFIDENTIAL" },
  });
  assertEquals(maps.all.get("x_"), "CONFIDENTIAL");
  assertEquals(maps.integrations.get("x_"), "CONFIDENTIAL");
});

// ─── Independence from other integrations ────────────────────────────────────

Deno.test("XClassification: X classification independent of GitHub classification", () => {
  const maps = mapToolPrefixClassifications({
    github: { classification: "RESTRICTED" },
    x: { classification: "INTERNAL" },
  });
  assertEquals(maps.all.get("x_"), "INTERNAL");
  assertEquals(maps.all.get("github_"), "RESTRICTED");
});

// ─── Missing config ──────────────────────────────────────────────────────────

Deno.test("XClassification: missing x config still defaults to INTERNAL", () => {
  const maps = mapToolPrefixClassifications({
    google: { classification: "CONFIDENTIAL" },
    github: { classification: "INTERNAL" },
  });
  assertEquals(maps.all.get("x_"), "INTERNAL");
  assertEquals(maps.integrations.get("x_"), "INTERNAL");
});
