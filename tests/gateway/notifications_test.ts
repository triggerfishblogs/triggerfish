/**
 * Notification service tests — classification, delivery channels, flush.
 */

import { assertEquals } from "@std/assert";
import { createNotificationService } from "../../src/gateway/notifications/notifications.ts";
import { createMemoryStorage } from "../../src/core/storage/memory.ts";
import type { UserId } from "../../src/core/types/session.ts";
import type { ClassificationLevel } from "../../src/core/types/classification.ts";

const USER = "test-user" as UserId;

// ── Basic deliver + getPending ────────────────────────────────────────

Deno.test("deliver: queues notification when no channels registered", async () => {
  const storage = createMemoryStorage();
  const svc = createNotificationService(storage);

  await svc.deliver({ userId: USER, message: "hello", priority: "normal" });

  const pending = await svc.getPending(USER);
  assertEquals(pending.length, 1);
  assertEquals(pending[0].message, "hello");
  assertEquals(pending[0].priority, "normal");
});

Deno.test("acknowledge: removes notification from pending", async () => {
  const storage = createMemoryStorage();
  const svc = createNotificationService(storage);

  await svc.deliver({ userId: USER, message: "ack me", priority: "normal" });
  const pending = await svc.getPending(USER);
  assertEquals(pending.length, 1);

  await svc.acknowledge(pending[0].id);
  const after = await svc.getPending(USER);
  assertEquals(after.length, 0);
});

// ── Classification field ──────────────────────────────────────────────

Deno.test("deliver: stores classification field", async () => {
  const storage = createMemoryStorage();
  const svc = createNotificationService(storage);

  await svc.deliver({
    userId: USER,
    message: "classified",
    priority: "normal",
    classification: "INTERNAL" as ClassificationLevel,
  });

  const pending = await svc.getPending(USER);
  assertEquals(pending.length, 1);
  assertEquals(pending[0].classification, "INTERNAL");
});

Deno.test("classification persists through serialize/deserialize", async () => {
  const storage = createMemoryStorage();
  const svc = createNotificationService(storage);

  await svc.deliver({
    userId: USER,
    message: "secret",
    priority: "critical",
    classification: "CONFIDENTIAL" as ClassificationLevel,
  });

  // Create a new service instance from the same storage to force deserialization
  const svc2 = createNotificationService(storage);
  const pending = await svc2.getPending(USER);
  assertEquals(pending.length, 1);
  assertEquals(pending[0].classification, "CONFIDENTIAL");
  assertEquals(pending[0].priority, "critical");
  assertEquals(pending[0].message, "secret");
});

Deno.test("deliver: classification is optional", async () => {
  const storage = createMemoryStorage();
  const svc = createNotificationService(storage);

  await svc.deliver({
    userId: USER,
    message: "no classification",
    priority: "low",
  });

  const pending = await svc.getPending(USER);
  assertEquals(pending.length, 1);
  assertEquals(pending[0].classification, undefined);
});

// ── Delivery channels ─────────────────────────────────────────────────

Deno.test("deliver: sends to registered channel and auto-acknowledges", async () => {
  const storage = createMemoryStorage();
  const svc = createNotificationService(storage);
  const delivered: string[] = [];

  svc.registerChannel({
    name: "test",
    // deno-lint-ignore require-await
    send: async (msg) => {
      delivered.push(msg);
    },
  });

  await svc.deliver({ userId: USER, message: "push me", priority: "normal" });

  assertEquals(delivered.length, 1);
  assertEquals(delivered[0], "push me");

  // Should be auto-acknowledged (no longer pending)
  const pending = await svc.getPending(USER);
  assertEquals(pending.length, 0);
});

Deno.test("deliver: channel failure leaves notification pending", async () => {
  const storage = createMemoryStorage();
  const svc = createNotificationService(storage);

  svc.registerChannel({
    name: "broken",
    // deno-lint-ignore require-await
    send: async () => {
      throw new Error("send failed");
    },
  });

  await svc.deliver({
    userId: USER,
    message: "should stay queued",
    priority: "normal",
  });

  const pending = await svc.getPending(USER);
  assertEquals(pending.length, 1);
  assertEquals(pending[0].message, "should stay queued");
});

Deno.test("deliver: fans out to multiple channels", async () => {
  const storage = createMemoryStorage();
  const svc = createNotificationService(storage);
  const ch1: string[] = [];
  const ch2: string[] = [];

  // deno-lint-ignore require-await
  svc.registerChannel({
    name: "ch1",
    send: async (msg) => {
      ch1.push(msg);
    },
  });
  // deno-lint-ignore require-await
  svc.registerChannel({
    name: "ch2",
    send: async (msg) => {
      ch2.push(msg);
    },
  });

  await svc.deliver({ userId: USER, message: "broadcast", priority: "normal" });

  assertEquals(ch1.length, 1);
  assertEquals(ch2.length, 1);
  assertEquals((await svc.getPending(USER)).length, 0);
});

Deno.test("deliver: cli-websocket channel receives trigger notifications via fan-out", async () => {
  const storage = createMemoryStorage();
  const svc = createNotificationService(storage);
  const received: string[] = [];

  svc.registerChannel({
    name: "cli-websocket",
    // deno-lint-ignore require-await
    send: async (msg) => {
      received.push(msg);
    },
  });

  await svc.deliver({
    userId: USER,
    message: "trigger fired",
    priority: "normal",
  });

  assertEquals(received.length, 1);
  assertEquals(received[0], "trigger fired");
  // Auto-acknowledged after successful delivery
  assertEquals((await svc.getPending(USER)).length, 0);
});

// ── flushPending ──────────────────────────────────────────────────────

Deno.test("flushPending: delivers queued notifications when channel becomes available", async () => {
  const storage = createMemoryStorage();
  const svc = createNotificationService(storage);

  // Deliver with no channels — stays queued
  await svc.deliver({ userId: USER, message: "queued 1", priority: "normal" });
  await svc.deliver({ userId: USER, message: "queued 2", priority: "normal" });
  assertEquals((await svc.getPending(USER)).length, 2);

  // Register a channel and flush
  const delivered: string[] = [];
  // deno-lint-ignore require-await
  svc.registerChannel({
    name: "late",
    send: async (msg) => {
      delivered.push(msg);
    },
  });

  const remaining = await svc.flushPending(USER);
  assertEquals(remaining, 0);
  assertEquals(delivered.length, 2);
  assertEquals((await svc.getPending(USER)).length, 0);
});

Deno.test("flushPending: returns count of undelivered notifications", async () => {
  const storage = createMemoryStorage();
  const svc = createNotificationService(storage);

  await svc.deliver({ userId: USER, message: "stuck", priority: "normal" });

  // No channels registered — flush can't deliver
  const remaining = await svc.flushPending(USER);
  assertEquals(remaining, 1);
  assertEquals((await svc.getPending(USER)).length, 1);
});
