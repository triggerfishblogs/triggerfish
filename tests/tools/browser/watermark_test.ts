/**
 * Browser profile watermark tests.
 *
 * Verifies escalation-only semantics and access control for
 * classification-aware browser profiles.
 */

import { assertEquals } from "@std/assert";
import { createMemoryStorage } from "../../../src/core/storage/memory.ts";
import {
  canAccessProfile,
  escalateWatermark,
  getWatermark,
} from "../../../src/tools/browser/watermark.ts";

Deno.test("watermark: new profile returns null", async () => {
  const storage = createMemoryStorage();
  const result = await getWatermark(storage, "agent-1");
  assertEquals(result, null);
});

Deno.test("watermark: escalates from PUBLIC to CONFIDENTIAL", async () => {
  const storage = createMemoryStorage();

  const first = await escalateWatermark(storage, "agent-1", "PUBLIC");
  assertEquals(first, "PUBLIC");

  const second = await escalateWatermark(storage, "agent-1", "CONFIDENTIAL");
  assertEquals(second, "CONFIDENTIAL");

  const stored = await getWatermark(storage, "agent-1");
  assertEquals(stored, "CONFIDENTIAL");
});

Deno.test("watermark: lower session blocked by higher watermark", () => {
  assertEquals(canAccessProfile("CONFIDENTIAL", "PUBLIC"), false);
});

Deno.test("watermark: equal session allowed", () => {
  assertEquals(canAccessProfile("CONFIDENTIAL", "CONFIDENTIAL"), true);
});

Deno.test("watermark: higher session allowed for lower watermark", () => {
  assertEquals(canAccessProfile("PUBLIC", "CONFIDENTIAL"), true);
});

Deno.test("watermark: double escalation keeps highest — lower escalation is no-op", async () => {
  const storage = createMemoryStorage();

  await escalateWatermark(storage, "agent-2", "CONFIDENTIAL");
  await escalateWatermark(storage, "agent-2", "RESTRICTED");

  const afterHigh = await getWatermark(storage, "agent-2");
  assertEquals(afterHigh, "RESTRICTED");

  // Lower escalation attempt — should be a no-op
  const afterLow = await escalateWatermark(storage, "agent-2", "PUBLIC");
  assertEquals(afterLow, "RESTRICTED");

  const stored = await getWatermark(storage, "agent-2");
  assertEquals(stored, "RESTRICTED");
});
