/**
 * Phase 14: Gateway WebSocket, Session Manager & Notifications
 * Tests MUST FAIL until gateway server, enhanced sessions, and notifications are implemented.
 */
import { assertEquals, assertExists, assert } from "jsr:@std/assert";
import { createGatewayServer } from "../../src/gateway/server.ts";
import { createEnhancedSessionManager } from "../../src/gateway/sessions.ts";
import { createNotificationService } from "../../src/gateway/notifications.ts";
import { createMemoryStorage } from "../../src/core/storage/memory.ts";
import { createSessionManager } from "../../src/core/session/manager.ts";
import type { UserId, ChannelId, SessionId } from "../../src/core/types/session.ts";

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
  const svc = createNotificationService();
  await svc.deliver({
    userId: "u" as UserId,
    message: "test notification",
    priority: "normal",
  });
  const queued = await svc.getPending("u" as UserId);
  assert(queued.length >= 1);
});
