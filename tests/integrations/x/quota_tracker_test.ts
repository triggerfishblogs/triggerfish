import { assertEquals } from "@std/assert";
import { createMemorySecretStore } from "../../../src/core/secrets/keychain/keychain.ts";
import { createXQuotaTracker } from "../../../src/integrations/x/client/quota_tracker.ts";

/** 2026-03-15T00:00:00Z — mid-month baseline. */
const now = Date.UTC(2026, 2, 15);
const nowFn = () => now;

Deno.test("XQuotaTracker: fresh tracker reports zero usage", async () => {
  const store = createMemorySecretStore();
  const tracker = createXQuotaTracker(store, "basic", { nowFn });
  const usage = await tracker.getUsage();
  assertEquals(usage.reads.used, 0);
  assertEquals(usage.writes.used, 0);
  assertEquals(usage.tier, "basic");
});

Deno.test("XQuotaTracker: recordRead increments read counter", async () => {
  const store = createMemorySecretStore();
  const tracker = createXQuotaTracker(store, "basic", { nowFn });
  await tracker.recordRead();
  await tracker.recordRead();
  const usage = await tracker.getUsage();
  assertEquals(usage.reads.used, 2);
  assertEquals(usage.writes.used, 0);
});

Deno.test("XQuotaTracker: recordWrite increments write counter", async () => {
  const store = createMemorySecretStore();
  const tracker = createXQuotaTracker(store, "basic", { nowFn });
  await tracker.recordWrite();
  await tracker.recordWrite();
  await tracker.recordWrite();
  const usage = await tracker.getUsage();
  assertEquals(usage.writes.used, 3);
  assertEquals(usage.reads.used, 0);
});

Deno.test("XQuotaTracker: free tier blocks reads with limit 0", async () => {
  const store = createMemorySecretStore();
  const tracker = createXQuotaTracker(store, "free", { nowFn });
  const result = await tracker.checkReadQuota();
  assertEquals(result.ok, false);
  if (!result.ok) {
    assertEquals(result.error.includes("not available"), true);
  }
});

Deno.test("XQuotaTracker: basic tier allows reads under limit", async () => {
  const store = createMemorySecretStore();
  const tracker = createXQuotaTracker(store, "basic", { nowFn });
  await tracker.recordRead();
  const result = await tracker.checkReadQuota();
  assertEquals(result.ok, true);
});

Deno.test("XQuotaTracker: write quota exhausted at limit", async () => {
  const store = createMemorySecretStore();
  // Use free tier with 500 write limit
  const tracker = createXQuotaTracker(store, "free", { nowFn });
  for (let i = 0; i < 500; i++) {
    await tracker.recordWrite();
  }
  const result = await tracker.checkWriteQuota();
  assertEquals(result.ok, false);
  if (!result.ok) {
    assertEquals(result.error.includes("exhausted"), true);
  }
});

Deno.test("XQuotaTracker: 80% warning threshold triggers warning log", async () => {
  const store = createMemorySecretStore();
  // basic tier: 50000 write limit, 80% = 40000
  const tracker = createXQuotaTracker(store, "basic", {
    nowFn,
    warningThreshold: 0.8,
    cutoffThreshold: 0.95,
  });
  for (let i = 0; i < 40_000; i++) {
    await tracker.recordWrite();
  }
  const result = await tracker.checkWriteQuota();
  // At exactly 80%, the warning threshold is hit but not cutoff,
  // so checkUsage returns ok: true with no warning in the result
  // (warning is only logged, not returned — returned warning is for cutoff)
  assertEquals(result.ok, true);
  if (result.ok) {
    assertEquals(result.warning, undefined);
  }
});

Deno.test("XQuotaTracker: 95% cutoff threshold includes warning in response", async () => {
  const store = createMemorySecretStore();
  // basic tier: 50000 write limit, 95% = 47500
  const tracker = createXQuotaTracker(store, "basic", {
    nowFn,
    warningThreshold: 0.8,
    cutoffThreshold: 0.95,
  });
  for (let i = 0; i < 47_500; i++) {
    await tracker.recordWrite();
  }
  const result = await tracker.checkWriteQuota();
  assertEquals(result.ok, true);
  if (result.ok) {
    assertEquals(typeof result.warning, "string");
    assertEquals(result.warning!.includes("Approaching limit"), true);
  }
});

Deno.test("XQuotaTracker: month rollover resets counters", async () => {
  let testNow = Date.UTC(2026, 2, 15); // March 2026
  const store = createMemorySecretStore();
  const tracker = createXQuotaTracker(store, "basic", {
    nowFn: () => testNow,
  });
  await tracker.recordWrite();
  await tracker.recordWrite();
  await tracker.recordRead();

  const usageBefore = await tracker.getUsage();
  assertEquals(usageBefore.writes.used, 2);
  assertEquals(usageBefore.reads.used, 1);
  assertEquals(usageBefore.month, "2026-03");

  // Advance to mid-April (avoids timezone edge at month boundary)
  testNow = Date.UTC(2026, 3, 15);
  const usageAfter = await tracker.getUsage();
  assertEquals(usageAfter.writes.used, 0);
  assertEquals(usageAfter.reads.used, 0);
});

Deno.test("XQuotaTracker: getUsage returns correct tier and limits", async () => {
  const store = createMemorySecretStore();
  const tracker = createXQuotaTracker(store, "basic", { nowFn });
  const usage = await tracker.getUsage();
  assertEquals(usage.tier, "basic");
  assertEquals(usage.reads.limit, 10_000);
  assertEquals(usage.writes.limit, 50_000);
});
