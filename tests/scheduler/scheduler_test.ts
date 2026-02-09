/**
 * Phase 17: Cron, Triggers & Webhooks — full test suite.
 */
import { assertEquals, assertExists, assert } from "jsr:@std/assert";
import {
  parseCronExpression,
  createCronManager,
  matchesNow,
} from "../../src/scheduler/cron.ts";
import { createTrigger } from "../../src/scheduler/trigger.ts";
import {
  createWebhookHandler,
  verifyHmac,
  verifyHmacAsync,
  computeHmac,
} from "../../src/scheduler/webhooks.ts";
import { createSchedulerService } from "../../src/scheduler/service.ts";
import type {
  OrchestratorFactory,
  SchedulerServiceConfig,
} from "../../src/scheduler/service.ts";

// ── Cron Parser ──────────────────────────────────────────────────────

Deno.test("parseCronExpression: parses '*/5 * * * *' (every 5 minutes)", () => {
  const expr = parseCronExpression("*/5 * * * *");
  assertEquals(expr.ok, true);
});

Deno.test("parseCronExpression: rejects invalid expression", () => {
  const expr = parseCronExpression("not a cron");
  assertEquals(expr.ok, false);
});

// ── CronManager ──────────────────────────────────────────────────────

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

Deno.test("CronManager: recordExecution stores history", () => {
  const mgr = createCronManager();
  const result = mgr.create({
    expression: "0 9 * * *",
    task: "test",
    classificationCeiling: "PUBLIC",
  });
  assert(result.ok);
  if (!result.ok) return;

  const jobId = result.value.id;
  mgr.recordExecution({
    jobId,
    executedAt: new Date(),
    durationMs: 123,
    success: true,
  });
  mgr.recordExecution({
    jobId,
    executedAt: new Date(),
    durationMs: 456,
    success: false,
    error: "test error",
  });

  const hist = mgr.history(jobId);
  assertEquals(hist.length, 2);
  assertEquals(hist[0].success, true);
  assertEquals(hist[1].success, false);
  assertEquals(hist[1].error, "test error");
});

// ── matchesNow ───────────────────────────────────────────────────────

Deno.test("matchesNow: matches specific time", () => {
  const result = parseCronExpression("30 14 * * *"); // 14:30 every day
  assert(result.ok);
  if (!result.ok) return;

  // Feb 9, 2026 14:30 is a Monday (day 1)
  const matching = new Date(2026, 1, 9, 14, 30, 0);
  assertEquals(matchesNow(result.value, matching), true);

  // Wrong minute
  const wrongMin = new Date(2026, 1, 9, 14, 31, 0);
  assertEquals(matchesNow(result.value, wrongMin), false);

  // Wrong hour
  const wrongHour = new Date(2026, 1, 9, 15, 30, 0);
  assertEquals(matchesNow(result.value, wrongHour), false);
});

Deno.test("matchesNow: matches step expression", () => {
  const result = parseCronExpression("*/15 * * * *"); // every 15 mins
  assert(result.ok);
  if (!result.ok) return;

  assertEquals(matchesNow(result.value, new Date(2026, 0, 1, 0, 0)), true);   // :00
  assertEquals(matchesNow(result.value, new Date(2026, 0, 1, 0, 15)), true);  // :15
  assertEquals(matchesNow(result.value, new Date(2026, 0, 1, 0, 30)), true);  // :30
  assertEquals(matchesNow(result.value, new Date(2026, 0, 1, 0, 45)), true);  // :45
  assertEquals(matchesNow(result.value, new Date(2026, 0, 1, 0, 7)), false);  // :07
});

Deno.test("matchesNow: matches day-of-week", () => {
  const result = parseCronExpression("0 9 * * 1"); // Mon at 09:00
  assert(result.ok);
  if (!result.ok) return;

  // Feb 9, 2026 is Monday
  assertEquals(matchesNow(result.value, new Date(2026, 1, 9, 9, 0)), true);
  // Feb 10, 2026 is Tuesday
  assertEquals(matchesNow(result.value, new Date(2026, 1, 10, 9, 0)), false);
});

Deno.test("matchesNow: matches month field", () => {
  const result = parseCronExpression("0 0 1 6 *"); // Jun 1st at midnight
  assert(result.ok);
  if (!result.ok) return;

  // June 1, 2026 at midnight (Sunday = 0)
  assertEquals(matchesNow(result.value, new Date(2026, 5, 1, 0, 0)), true);
  // July 1, 2026 at midnight
  assertEquals(matchesNow(result.value, new Date(2026, 6, 1, 0, 0)), false);
});

// ── Trigger ──────────────────────────────────────────────────────────

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

// ── verifyHmac (sync) ───────────────────────────────────────────────

Deno.test("verifyHmac: validates correct signature format", () => {
  const secret = "test-secret";
  const body = '{"event":"push"}';
  const result = verifyHmac(body, "sha256=fakesig", secret);
  assertEquals(typeof result, "boolean");
});

// ── verifyHmacAsync ──────────────────────────────────────────────────

Deno.test("verifyHmacAsync: accepts valid signature", async () => {
  const secret = "webhook-secret-123";
  const body = '{"event":"push","data":{"ref":"main"}}';
  const sig = await computeHmac(body, secret);
  const valid = await verifyHmacAsync(body, sig, secret);
  assertEquals(valid, true);
});

Deno.test("verifyHmacAsync: rejects tampered payload", async () => {
  const secret = "webhook-secret-123";
  const body = '{"event":"push"}';
  const sig = await computeHmac(body, secret);
  const valid = await verifyHmacAsync(body + "tampered", sig, secret);
  assertEquals(valid, false);
});

Deno.test("verifyHmacAsync: rejects wrong secret", async () => {
  const body = '{"event":"push"}';
  const sig = await computeHmac(body, "correct-secret");
  const valid = await verifyHmacAsync(body, sig, "wrong-secret");
  assertEquals(valid, false);
});

Deno.test("verifyHmacAsync: rejects malformed signature", async () => {
  assertEquals(await verifyHmacAsync("body", "noseparator", "sec"), false);
  assertEquals(await verifyHmacAsync("body", "md5=abc", "sec"), false);
  assertEquals(await verifyHmacAsync("body", "", "sec"), false);
});

// ── computeHmac ──────────────────────────────────────────────────────

Deno.test("computeHmac: returns sha256= prefixed hex", async () => {
  const sig = await computeHmac("hello", "secret");
  assert(sig.startsWith("sha256="), "Should start with sha256=");
  const hex = sig.slice(7);
  assertEquals(hex.length, 64, "SHA-256 hex should be 64 chars");
  assert(/^[0-9a-f]+$/.test(hex), "Should be lowercase hex");
});

// ── WebhookHandler ───────────────────────────────────────────────────

Deno.test("WebhookHandler: routes events to handlers", async () => {
  const handler = createWebhookHandler();
  let received: unknown = null;
  handler.on("push", async (event) => { received = event; });
  await handler.handle({ event: "push", data: { ref: "main" } });
  assertExists(received);
});

Deno.test("WebhookHandler: ignores unregistered event types", async () => {
  const handler = createWebhookHandler();
  let called = false;
  handler.on("push", async () => { called = true; });
  await handler.handle({ event: "release", data: {} });
  assertEquals(called, false);
});

// ── SchedulerService ─────────────────────────────────────────────────

/** Create a mock OrchestratorFactory that records calls. */
function createMockFactory(): {
  factory: OrchestratorFactory;
  calls: string[];
} {
  const calls: string[] = [];
  const factory: OrchestratorFactory = {
    async create(channelId: string) {
      calls.push(channelId);
      return {
        orchestrator: {
          processMessage: async () => ({ ok: true as const, value: "done" }),
        // deno-lint-ignore no-explicit-any
        } as any,
        session: {
          id: "mock-session",
          taint: "PUBLIC",
          createdAt: new Date(),
          lastActivityAt: new Date(),
          messages: [],
          context: {},
        // deno-lint-ignore no-explicit-any
        } as any,
      };
    },
  };
  return { factory, calls };
}

function createTestConfig(
  factory: OrchestratorFactory,
  overrides?: Partial<SchedulerServiceConfig>,
): SchedulerServiceConfig {
  return {
    orchestratorFactory: factory,
    triggerMdPath: "/tmp/nonexistent-trigger.md",
    trigger: {
      enabled: false,
      intervalMinutes: 30,
      classificationCeiling: "INTERNAL",
    },
    webhooks: {
      enabled: true,
      sources: {
        github: { secret: "gh-secret", classification: "INTERNAL" },
      },
    },
    ...overrides,
  };
}

Deno.test("SchedulerService: start and stop without error", () => {
  const { factory } = createMockFactory();
  const svc = createSchedulerService(createTestConfig(factory));
  svc.start();
  svc.stop();
});

Deno.test("SchedulerService: webhook rejects when disabled", async () => {
  const { factory } = createMockFactory();
  const svc = createSchedulerService(createTestConfig(factory, {
    webhooks: { enabled: false, sources: {} },
  }));

  const result = await svc.handleWebhookRequest("github", "{}", "sha256=abc");
  assertEquals(result.ok, false);
  if (!result.ok) {
    assertEquals(result.error, "Webhooks are disabled");
  }
});

Deno.test("SchedulerService: webhook rejects unknown source", async () => {
  const { factory } = createMockFactory();
  const svc = createSchedulerService(createTestConfig(factory));

  const result = await svc.handleWebhookRequest("unknown", "{}", "sha256=abc");
  assertEquals(result.ok, false);
  if (!result.ok) {
    assert(result.error.includes("Unknown webhook source"));
  }
});

Deno.test("SchedulerService: webhook rejects invalid signature", async () => {
  const { factory } = createMockFactory();
  const svc = createSchedulerService(createTestConfig(factory));

  const body = '{"event":"push","data":{}}';
  const result = await svc.handleWebhookRequest("github", body, "sha256=bad");
  assertEquals(result.ok, false);
  if (!result.ok) {
    assertEquals(result.error, "Invalid HMAC signature");
  }
});

Deno.test("SchedulerService: webhook processes valid request", async () => {
  const { factory, calls } = createMockFactory();
  const svc = createSchedulerService(createTestConfig(factory));

  const body = '{"event":"push","data":{"ref":"main"}}';
  const sig = await computeHmac(body, "gh-secret");
  const result = await svc.handleWebhookRequest("github", body, sig);
  assertEquals(result.ok, true);
  assertEquals(calls.length, 1);
  assertEquals(calls[0], "webhook-github");
});

Deno.test("SchedulerService: webhook dispatches to event handler", async () => {
  const { factory } = createMockFactory();
  const svc = createSchedulerService(createTestConfig(factory));

  let receivedEvent: unknown = null;
  svc.webhookHandler.on("push", async (evt) => { receivedEvent = evt; });

  const body = '{"event":"push","data":{"ref":"main"}}';
  const sig = await computeHmac(body, "gh-secret");
  await svc.handleWebhookRequest("github", body, sig);

  assertExists(receivedEvent);
});

Deno.test("SchedulerService: cron manager is accessible", () => {
  const { factory } = createMockFactory();
  const svc = createSchedulerService(createTestConfig(factory));

  const result = svc.cronManager.create({
    expression: "0 9 * * *",
    task: "morning check",
    classificationCeiling: "PUBLIC",
  });
  assert(result.ok);
  assertEquals(svc.cronManager.list().length, 1);
});
