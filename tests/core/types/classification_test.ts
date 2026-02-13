/**
 * Phase 1: Core Types — Classification
 * Tests MUST FAIL until classification.ts is implemented.
 * Tests the exact interfaces and behaviors from triggerfish-build-plan.md Phase 1.
 */
import { assertEquals } from "@std/assert";
import {
  CLASSIFICATION_ORDER,
  canFlowTo,
  compareClassification,
  maxClassification,
  parseClassification,
} from "../../src/core/types/classification.ts";

// --- Classification ordering ---

Deno.test("CLASSIFICATION_ORDER assigns RESTRICTED=4, CONFIDENTIAL=3, INTERNAL=2, PUBLIC=1", () => {
  assertEquals(CLASSIFICATION_ORDER["RESTRICTED"], 4);
  assertEquals(CLASSIFICATION_ORDER["CONFIDENTIAL"], 3);
  assertEquals(CLASSIFICATION_ORDER["INTERNAL"], 2);
  assertEquals(CLASSIFICATION_ORDER["PUBLIC"], 1);
});

// --- compareClassification ---

Deno.test("compareClassification: RESTRICTED > CONFIDENTIAL returns 1", () => {
  assertEquals(compareClassification("RESTRICTED", "CONFIDENTIAL"), 1);
});

Deno.test("compareClassification: PUBLIC < INTERNAL returns -1", () => {
  assertEquals(compareClassification("PUBLIC", "INTERNAL"), -1);
});

Deno.test("compareClassification: INTERNAL = INTERNAL returns 0", () => {
  assertEquals(compareClassification("INTERNAL", "INTERNAL"), 0);
});

// --- canFlowTo (no write-down) ---

Deno.test("canFlowTo: RESTRICTED -> CONFIDENTIAL is FALSE (write-down)", () => {
  assertEquals(canFlowTo("RESTRICTED", "CONFIDENTIAL"), false);
});

Deno.test("canFlowTo: RESTRICTED -> PUBLIC is FALSE (write-down)", () => {
  assertEquals(canFlowTo("RESTRICTED", "PUBLIC"), false);
});

Deno.test("canFlowTo: PUBLIC -> RESTRICTED is TRUE (write-up allowed)", () => {
  assertEquals(canFlowTo("PUBLIC", "RESTRICTED"), true);
});

Deno.test("canFlowTo: CONFIDENTIAL -> CONFIDENTIAL is TRUE (same level)", () => {
  assertEquals(canFlowTo("CONFIDENTIAL", "CONFIDENTIAL"), true);
});

Deno.test("canFlowTo: PUBLIC -> PUBLIC is TRUE", () => {
  assertEquals(canFlowTo("PUBLIC", "PUBLIC"), true);
});

Deno.test("canFlowTo: INTERNAL -> PUBLIC is FALSE (write-down)", () => {
  assertEquals(canFlowTo("INTERNAL", "PUBLIC"), false);
});

// --- maxClassification ---

Deno.test("maxClassification: returns more restrictive level", () => {
  assertEquals(maxClassification("PUBLIC", "CONFIDENTIAL"), "CONFIDENTIAL");
  assertEquals(maxClassification("RESTRICTED", "PUBLIC"), "RESTRICTED");
  assertEquals(maxClassification("INTERNAL", "INTERNAL"), "INTERNAL");
});

// --- parseClassification ---

Deno.test("parseClassification: valid string returns ok Result", () => {
  const result = parseClassification("RESTRICTED");
  assertEquals(result.ok, true);
  if (result.ok) {
    assertEquals(result.value, "RESTRICTED");
  }
});

Deno.test("parseClassification: invalid string returns error Result", () => {
  const result = parseClassification("INVALID_LEVEL");
  assertEquals(result.ok, false);
});

Deno.test("parseClassification: case handling", () => {
  // Should handle at least exact match
  const result = parseClassification("PUBLIC");
  assertEquals(result.ok, true);
});
