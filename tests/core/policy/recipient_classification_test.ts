/**
 * Tests for recipient classification — effective classification computation.
 */
import { assertEquals } from "@std/assert";
import { effectiveClassification } from "../../../src/core/policy/recipient.ts";
import type { ClassificationLevel } from "../../../src/core/types/classification.ts";

// ── Same level returns that level ───────────────────────────────────

Deno.test("effectiveClassification: PUBLIC + PUBLIC = PUBLIC", () => {
  assertEquals(effectiveClassification("PUBLIC", "PUBLIC"), "PUBLIC");
});

Deno.test("effectiveClassification: INTERNAL + INTERNAL = INTERNAL", () => {
  assertEquals(effectiveClassification("INTERNAL", "INTERNAL"), "INTERNAL");
});

Deno.test("effectiveClassification: CONFIDENTIAL + CONFIDENTIAL = CONFIDENTIAL", () => {
  assertEquals(
    effectiveClassification("CONFIDENTIAL", "CONFIDENTIAL"),
    "CONFIDENTIAL",
  );
});

Deno.test("effectiveClassification: RESTRICTED + RESTRICTED = RESTRICTED", () => {
  assertEquals(
    effectiveClassification("RESTRICTED", "RESTRICTED"),
    "RESTRICTED",
  );
});

// ── Different levels return the more restrictive one ────────────────

Deno.test("effectiveClassification: PUBLIC + INTERNAL = PUBLIC", () => {
  assertEquals(effectiveClassification("PUBLIC", "INTERNAL"), "PUBLIC");
});

Deno.test("effectiveClassification: INTERNAL + PUBLIC = PUBLIC", () => {
  assertEquals(effectiveClassification("INTERNAL", "PUBLIC"), "PUBLIC");
});

Deno.test("effectiveClassification: PUBLIC + CONFIDENTIAL = PUBLIC", () => {
  assertEquals(effectiveClassification("PUBLIC", "CONFIDENTIAL"), "PUBLIC");
});

Deno.test("effectiveClassification: CONFIDENTIAL + PUBLIC = PUBLIC", () => {
  assertEquals(effectiveClassification("CONFIDENTIAL", "PUBLIC"), "PUBLIC");
});

Deno.test("effectiveClassification: PUBLIC + RESTRICTED = PUBLIC", () => {
  assertEquals(effectiveClassification("PUBLIC", "RESTRICTED"), "PUBLIC");
});

Deno.test("effectiveClassification: RESTRICTED + PUBLIC = PUBLIC", () => {
  assertEquals(effectiveClassification("RESTRICTED", "PUBLIC"), "PUBLIC");
});

Deno.test("effectiveClassification: INTERNAL + CONFIDENTIAL = INTERNAL", () => {
  assertEquals(effectiveClassification("INTERNAL", "CONFIDENTIAL"), "INTERNAL");
});

Deno.test("effectiveClassification: CONFIDENTIAL + INTERNAL = INTERNAL", () => {
  assertEquals(effectiveClassification("CONFIDENTIAL", "INTERNAL"), "INTERNAL");
});

Deno.test("effectiveClassification: INTERNAL + RESTRICTED = INTERNAL", () => {
  assertEquals(effectiveClassification("INTERNAL", "RESTRICTED"), "INTERNAL");
});

Deno.test("effectiveClassification: RESTRICTED + INTERNAL = INTERNAL", () => {
  assertEquals(effectiveClassification("RESTRICTED", "INTERNAL"), "INTERNAL");
});

Deno.test("effectiveClassification: CONFIDENTIAL + RESTRICTED = CONFIDENTIAL", () => {
  assertEquals(
    effectiveClassification("CONFIDENTIAL", "RESTRICTED"),
    "CONFIDENTIAL",
  );
});

Deno.test("effectiveClassification: RESTRICTED + CONFIDENTIAL = CONFIDENTIAL", () => {
  assertEquals(
    effectiveClassification("RESTRICTED", "CONFIDENTIAL"),
    "CONFIDENTIAL",
  );
});

// ── Exhaustive all-combinations check ───────────────────────────────

Deno.test("effectiveClassification: all combinations produce correct minimum", () => {
  const levels: readonly ClassificationLevel[] = [
    "PUBLIC",
    "INTERNAL",
    "CONFIDENTIAL",
    "RESTRICTED",
  ] as const;

  const order: Record<ClassificationLevel, number> = {
    PUBLIC: 1,
    INTERNAL: 2,
    CONFIDENTIAL: 3,
    RESTRICTED: 4,
  };

  for (const a of levels) {
    for (const b of levels) {
      const result = effectiveClassification(a, b);
      const expected = order[a] <= order[b] ? a : b;
      assertEquals(
        result,
        expected,
        `effectiveClassification(${a}, ${b}) should be ${expected}, got ${result}`,
      );
    }
  }
});
