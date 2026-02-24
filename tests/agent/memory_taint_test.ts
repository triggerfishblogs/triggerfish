/**
 * Tests for memory tool taint isolation.
 *
 * Verifies that memory tools (memory_save, memory_delete, memory_search,
 * memory_get, memory_list) do not escalate session taint and are not blocked
 * by integration write-down checks. Memory tools handle classification
 * internally via session taint — they operate at whatever level the session
 * currently has.
 *
 * @module
 */

import { assertEquals, assert } from "@std/assert";
import {
  escalateToolPrefixTaint,
  enforceNonOwnerToolCeiling,
} from "../../src/agent/dispatch/access_control.ts";
import {
  mapToolPrefixClassifications,
  SELF_CLASSIFYING_TOOLS,
} from "../../src/agent/orchestrator/orchestrator_types.ts";
import type { ClassificationLevel } from "../../src/core/types/classification.ts";

/** Build default tool classifications map for testing. */
function buildClassifications(): Map<string, ClassificationLevel> {
  return mapToolPrefixClassifications({});
}

// ─── SELF_CLASSIFYING_TOOLS set ─────────────────────────────────────────────

Deno.test("SELF_CLASSIFYING_TOOLS contains all memory tool names", () => {
  const expected = [
    "memory_save",
    "memory_delete",
    "memory_search",
    "memory_get",
    "memory_list",
  ];
  for (const name of expected) {
    assert(
      SELF_CLASSIFYING_TOOLS.has(name),
      `Expected SELF_CLASSIFYING_TOOLS to contain "${name}"`,
    );
  }
  assertEquals(SELF_CLASSIFYING_TOOLS.size, expected.length);
});

// ─── memory_save does NOT escalate session taint ────────────────────────────

Deno.test("memory_save does not escalate session taint from PUBLIC", () => {
  const classifications = buildClassifications();
  let escalatedTo: ClassificationLevel | null = null;
  const escalateTaint = (level: ClassificationLevel, _reason: string) => {
    escalatedTo = level;
  };
  escalateToolPrefixTaint(
    "memory_save",
    classifications,
    escalateTaint,
    SELF_CLASSIFYING_TOOLS,
  );
  assertEquals(escalatedTo, null, "memory_save should not escalate taint");
});

Deno.test("memory_save does not escalate session taint from INTERNAL", () => {
  const classifications = buildClassifications();
  let escalatedTo: ClassificationLevel | null = null;
  const escalateTaint = (level: ClassificationLevel, _reason: string) => {
    escalatedTo = level;
  };
  escalateToolPrefixTaint(
    "memory_save",
    classifications,
    escalateTaint,
    SELF_CLASSIFYING_TOOLS,
  );
  assertEquals(escalatedTo, null, "memory_save should not escalate taint");
});

Deno.test("memory_save does not escalate session taint from CONFIDENTIAL", () => {
  const classifications = buildClassifications();
  let escalatedTo: ClassificationLevel | null = null;
  const escalateTaint = (level: ClassificationLevel, _reason: string) => {
    escalatedTo = level;
  };
  escalateToolPrefixTaint(
    "memory_save",
    classifications,
    escalateTaint,
    SELF_CLASSIFYING_TOOLS,
  );
  assertEquals(escalatedTo, null, "memory_save should not escalate taint");
});

Deno.test("memory_save does not escalate session taint from RESTRICTED", () => {
  const classifications = buildClassifications();
  let escalatedTo: ClassificationLevel | null = null;
  const escalateTaint = (level: ClassificationLevel, _reason: string) => {
    escalatedTo = level;
  };
  escalateToolPrefixTaint(
    "memory_save",
    classifications,
    escalateTaint,
    SELF_CLASSIFYING_TOOLS,
  );
  assertEquals(escalatedTo, null, "memory_save should not escalate taint");
});

// ─── memory_delete does NOT escalate session taint ──────────────────────────

Deno.test("memory_delete does not escalate session taint", () => {
  const classifications = buildClassifications();
  let escalatedTo: ClassificationLevel | null = null;
  const escalateTaint = (level: ClassificationLevel, _reason: string) => {
    escalatedTo = level;
  };
  escalateToolPrefixTaint(
    "memory_delete",
    classifications,
    escalateTaint,
    SELF_CLASSIFYING_TOOLS,
  );
  assertEquals(escalatedTo, null, "memory_delete should not escalate taint");
});

// ─── memory read tools do NOT escalate taint ────────────────────────────────

Deno.test("memory_search does not escalate session taint", () => {
  const classifications = buildClassifications();
  let escalatedTo: ClassificationLevel | null = null;
  const escalateTaint = (level: ClassificationLevel, _reason: string) => {
    escalatedTo = level;
  };
  escalateToolPrefixTaint(
    "memory_search",
    classifications,
    escalateTaint,
    SELF_CLASSIFYING_TOOLS,
  );
  assertEquals(escalatedTo, null, "memory_search should not escalate taint");
});

Deno.test("memory_get does not escalate session taint", () => {
  const classifications = buildClassifications();
  let escalatedTo: ClassificationLevel | null = null;
  const escalateTaint = (level: ClassificationLevel, _reason: string) => {
    escalatedTo = level;
  };
  escalateToolPrefixTaint(
    "memory_get",
    classifications,
    escalateTaint,
    SELF_CLASSIFYING_TOOLS,
  );
  assertEquals(escalatedTo, null, "memory_get should not escalate taint");
});

Deno.test("memory_list does not escalate session taint", () => {
  const classifications = buildClassifications();
  let escalatedTo: ClassificationLevel | null = null;
  const escalateTaint = (level: ClassificationLevel, _reason: string) => {
    escalatedTo = level;
  };
  escalateToolPrefixTaint(
    "memory_list",
    classifications,
    escalateTaint,
    SELF_CLASSIFYING_TOOLS,
  );
  assertEquals(escalatedTo, null, "memory_list should not escalate taint");
});

// ─── Non-exempt tools STILL escalate taint ──────────────────────────────────

Deno.test("write_file still escalates taint to RESTRICTED", () => {
  const classifications = buildClassifications();
  let escalatedTo: ClassificationLevel | null = null;
  const escalateTaint = (level: ClassificationLevel, _reason: string) => {
    escalatedTo = level;
  };
  escalateToolPrefixTaint(
    "write_file",
    classifications,
    escalateTaint,
    SELF_CLASSIFYING_TOOLS,
  );
  assertEquals(escalatedTo, "RESTRICTED", "write_file should escalate to RESTRICTED");
});

Deno.test("web_search still escalates taint to PUBLIC", () => {
  const classifications = buildClassifications();
  let escalatedTo: ClassificationLevel | null = null;
  const escalateTaint = (level: ClassificationLevel, _reason: string) => {
    escalatedTo = level;
  };
  escalateToolPrefixTaint(
    "web_search",
    classifications,
    escalateTaint,
    SELF_CLASSIFYING_TOOLS,
  );
  assertEquals(escalatedTo, "PUBLIC", "web_search should escalate to PUBLIC");
});

Deno.test("read_file still escalates taint to INTERNAL", () => {
  const classifications = buildClassifications();
  let escalatedTo: ClassificationLevel | null = null;
  const escalateTaint = (level: ClassificationLevel, _reason: string) => {
    escalatedTo = level;
  };
  escalateToolPrefixTaint(
    "read_file",
    classifications,
    escalateTaint,
    SELF_CLASSIFYING_TOOLS,
  );
  assertEquals(escalatedTo, "INTERNAL", "read_file should escalate to INTERNAL");
});

// ─── Access control unchanged — non-owner ceiling still enforced ────────────

Deno.test("non-owner with INTERNAL ceiling cannot call memory_save (RESTRICTED)", () => {
  const classifications = buildClassifications();
  const err = enforceNonOwnerToolCeiling(
    "memory_save",
    "INTERNAL",
    classifications,
  );
  assert(err !== null, "memory_save should be blocked for INTERNAL ceiling non-owner");
  assert(err!.includes("RESTRICTED"), "Error should mention RESTRICTED classification");
});

Deno.test("non-owner with RESTRICTED ceiling can call memory_save", () => {
  const classifications = buildClassifications();
  const err = enforceNonOwnerToolCeiling(
    "memory_save",
    "RESTRICTED",
    classifications,
  );
  assertEquals(err, null, "memory_save should be allowed for RESTRICTED ceiling non-owner");
});

Deno.test("non-owner with PUBLIC ceiling can call memory_search (PUBLIC)", () => {
  const classifications = buildClassifications();
  const err = enforceNonOwnerToolCeiling(
    "memory_search",
    "PUBLIC",
    classifications,
  );
  assertEquals(err, null, "memory_search should be allowed for PUBLIC ceiling non-owner");
});

Deno.test("non-owner with PUBLIC ceiling cannot call memory_save (RESTRICTED)", () => {
  const classifications = buildClassifications();
  const err = enforceNonOwnerToolCeiling(
    "memory_save",
    "PUBLIC",
    classifications,
  );
  assert(err !== null, "memory_save should be blocked for PUBLIC ceiling non-owner");
});

// ─── escalateToolPrefixTaint without exempt set (backward compat) ───────────

Deno.test("escalateToolPrefixTaint without exempt set escalates memory_save", () => {
  const classifications = buildClassifications();
  let escalatedTo: ClassificationLevel | null = null;
  const escalateTaint = (level: ClassificationLevel, _reason: string) => {
    escalatedTo = level;
  };
  escalateToolPrefixTaint(
    "memory_save",
    classifications,
    escalateTaint,
    // No exempt set passed — old behavior
  );
  assertEquals(
    escalatedTo,
    "RESTRICTED",
    "Without exempt set, memory_save should escalate to RESTRICTED (old behavior)",
  );
});
