/**
 * Phase 14: Gateway WebSocket, Session Manager & Notifications
 * Tests MUST FAIL until gateway server, enhanced sessions, and notifications are implemented.
 */
import { assertEquals, assertExists, assert } from "@std/assert";
import { createGatewayServer } from "../../src/gateway/server.ts";
import { createEnhancedSessionManager } from "../../src/gateway/sessions.ts";
import { createNotificationService } from "../../src/gateway/notifications.ts";
import { createMemoryStorage } from "../../src/core/storage/memory.ts";
import { createSessionManager } from "../../src/core/session/manager.ts";
import type { UserId, ChannelId } from "../../src/core/types/session.ts";

// --- Gateway server ---

Deno.test("GatewayServer: starts on configurable port", async () => {
  const server = createGatewayServer({ port: 0 }); // port 0 = random available
  try {
    const addr = await server.start();
    assertExists(addr.port);
    assert(addr.port > 0);
  } finally {
    await server.stop();
  }
});

Deno.test("GatewayServer: POST /debug/run-triggers returns 503 when no scheduler", async () => {
  const server = createGatewayServer({ port: 0 });
  try {
    const addr = await server.start();
    const response = await fetch(
      `http://127.0.0.1:${addr.port}/debug/run-triggers`,
      { method: "POST" },
    );
    assertEquals(response.status, 503);
    const body = await response.json();
    assertEquals(body.error, "Scheduler not configured");
  } finally {
    await server.stop();
  }
});

Deno.test("GatewayServer: POST /debug/run-triggers fires trigger when scheduler present", async () => {
  // Minimal mock scheduler service
  let runTriggerCalled = false;
  const mockScheduler = {
    start() {},
    stop() {},
    cronManager: { list: () => [], create: () => ({ ok: true as const, value: {} as never }), delete: () => ({ ok: true as const, value: undefined }), history: () => [], recordExecution: () => {} },
    webhookHandler: { on: () => {}, handle: async () => {} },
    // deno-lint-ignore require-await
    async handleWebhookRequest() { return { ok: false as const, error: "unused" }; },
    // deno-lint-ignore require-await
    async runTrigger() { runTriggerCalled = true; },
  };

  // deno-lint-ignore no-explicit-any
  const server = createGatewayServer({ port: 0, schedulerService: mockScheduler as any });
  try {
    const addr = await server.start();
    const response = await fetch(
      `http://127.0.0.1:${addr.port}/debug/run-triggers`,
      { method: "POST" },
    );
    assertEquals(response.status, 200);
    const body = await response.json();
    assertEquals(body.ok, true);
    // Give the fire-and-forget a moment to execute
    await new Promise((r) => setTimeout(r, 20));
    assertEquals(runTriggerCalled, true);
  } finally {
    await server.stop();
  }
});

// --- Enhanced session manager ---

Deno.test("EnhancedSessionManager: sessions_list returns active sessions", async () => {
  const storage = createMemoryStorage();
  const baseMgr = await createSessionManager(storage);
  const mgr = createEnhancedSessionManager(baseMgr);
  await mgr.create({ userId: "u" as UserId, channelId: "c" as ChannelId });
  const list = await mgr.sessionsList();
  assert(list.length >= 1);
});

Deno.test("EnhancedSessionManager: sessions_spawn creates background session with PUBLIC taint", async () => {
  const storage = createMemoryStorage();
  const baseMgr = await createSessionManager(storage);
  const mgr = createEnhancedSessionManager(baseMgr);
  const parent = await mgr.create({ userId: "u" as UserId, channelId: "c" as ChannelId });
  const spawned = await mgr.sessionsSpawn(parent.id, "background task");
  assertEquals(spawned.taint, "PUBLIC");
});

Deno.test("EnhancedSessionManager: sessions_send blocks write-down", async () => {
  const storage = createMemoryStorage();
  const baseMgr = await createSessionManager(storage);
  const mgr = createEnhancedSessionManager(baseMgr);
  const confidential = await mgr.create({ userId: "u" as UserId, channelId: "c" as ChannelId });
  await mgr.updateTaint(confidential.id, "CONFIDENTIAL", "secret");
  const publicSession = await mgr.create({ userId: "u" as UserId, channelId: "pub" as ChannelId });
  // CONFIDENTIAL -> PUBLIC session should be blocked
  const result = await mgr.sessionsSend(confidential.id, publicSession.id, "secret data", "PUBLIC");
  assertEquals(result.ok, false);
});

// --- Notification service ---

Deno.test("NotificationService: queues notification for offline user", async () => {
  const storage = createMemoryStorage();
  const svc = createNotificationService(storage);
  await svc.deliver({
    userId: "u" as UserId,
    message: "test notification",
    priority: "normal",
  });
  const queued = await svc.getPending("u" as UserId);
  assert(queued.length >= 1);
});

Deno.test("NotificationService: persists across service instances", async () => {
  const storage = createMemoryStorage();
  const svc1 = createNotificationService(storage);
  await svc1.deliver({
    userId: "u" as UserId,
    message: "persistent notification",
    priority: "critical",
  });
  // Create a second service instance sharing the same storage
  const svc2 = createNotificationService(storage);
  const queued = await svc2.getPending("u" as UserId);
  assert(queued.length >= 1);
  assertEquals(queued[0].message, "persistent notification");
  assertEquals(queued[0].priority, "critical");
});

Deno.test("NotificationService: acknowledge removes notification", async () => {
  const storage = createMemoryStorage();
  const svc = createNotificationService(storage);
  await svc.deliver({
    userId: "u" as UserId,
    message: "ack me",
    priority: "normal",
  });
  const before = await svc.getPending("u" as UserId);
  assertEquals(before.length, 1);
  await svc.acknowledge(before[0].id);
  const after = await svc.getPending("u" as UserId);
  assertEquals(after.length, 0);
});
