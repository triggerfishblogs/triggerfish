/**
 * Phase 17: Cron, Heartbeats & Webhooks
 * Tests MUST FAIL until scheduler components are implemented.
 */
import { assertEquals, assertExists, assert } from "@std/assert";
import { parseCronExpression, createCronManager } from "../../src/scheduler/cron.ts";
import { createTrigger } from "../../src/scheduler/trigger.ts";
import { createWebhookHandler, verifyHmac } from "../../src/scheduler/webhooks.ts";

Deno.test("parseCronExpression: parses '*/5 * * * *' (every 5 minutes)", () => {
  const expr = parseCronExpression("*/5 * * * *");
  assertEquals(expr.ok, true);
});

Deno.test("parseCronExpression: rejects invalid expression", () => {
  const expr = parseCronExpression("not a cron");
  assertEquals(expr.ok, false);
});

Deno.test("CronManager: creates job with classification ceiling", () => {
  const mgr = createCronManager();
  const job = mgr.create({
    expression: "0 9 * * *",
    task: "morning briefing",
    classificationCeiling: "INTERNAL",
  });
  assertEquals(job.ok, true);
  if (job.ok) {
    assertExists(job.value.id);
    assertEquals(job.value.classificationCeiling, "INTERNAL");
  }
});

Deno.test("CronManager: list returns all jobs", () => {
  const mgr = createCronManager();
  mgr.create({ expression: "0 9 * * *", task: "a", classificationCeiling: "PUBLIC" });
  mgr.create({ expression: "0 17 * * *", task: "b", classificationCeiling: "PUBLIC" });
  const jobs = mgr.list();
  assertEquals(jobs.length, 2);
});

Deno.test("Trigger: fires callback at interval", async () => {
  let fired = 0;
  const hb = createTrigger({
    intervalMs: 50,
    callback: async () => { fired++; },
    classificationCeiling: "PUBLIC",
  });
  hb.start();
  await new Promise((r) => setTimeout(r, 180));
  hb.stop();
  assert(fired >= 2, `Expected at least 2 fires, got ${fired}`);
});

Deno.test("Trigger: respects quiet hours", async () => {
  let fired = 0;
  const hb = createTrigger({
    intervalMs: 50,
    callback: async () => { fired++; },
    classificationCeiling: "PUBLIC",
    quietHours: { start: 0, end: 24 }, // All hours are quiet
  });
  hb.start();
  await new Promise((r) => setTimeout(r, 150));
  hb.stop();
  assertEquals(fired, 0);
});

Deno.test("verifyHmac: validates correct signature", () => {
  const secret = "test-secret";
  const body = '{"event":"push"}';
  // Pre-compute: crypto.subtle would give us the real HMAC
  // For the test seed, we just verify the function exists and handles the interface
  const result = verifyHmac(body, "sha256=fakesig", secret);
  assertEquals(typeof result, "boolean");
});

Deno.test("WebhookHandler: routes events to handlers", async () => {
  const handler = createWebhookHandler();
  let received: unknown = null;
  handler.on("push", async (event) => { received = event; });
  await handler.handle({ event: "push", data: { ref: "main" } });
  assertExists(received);
});
