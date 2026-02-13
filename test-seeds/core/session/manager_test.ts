/**
 * Phase 4: Session Manager
 * Tests MUST FAIL until session manager is implemented.
 * Tests CRUD, taint propagation, reset, StorageProvider integration.
 */
import { assertEquals, assertExists, assertNotEquals, assert } from "@std/assert";
import { createSessionManager } from "../../src/core/session/manager.ts";
import { createMemoryStorage } from "../../src/core/storage/memory.ts";
import type { UserId, ChannelId } from "../../src/core/types/session.ts";

async function makeManager() {
  const storage = createMemoryStorage();
  return createSessionManager(storage);
}

Deno.test("SessionManager: create returns session with PUBLIC taint", async () => {
  const mgr = await makeManager();
  const session = await mgr.create({ userId: "u" as UserId, channelId: "c" as ChannelId });
  assertEquals(session.taint, "PUBLIC");
  assertExists(session.id);
});

Deno.test("SessionManager: get retrieves created session", async () => {
  const mgr = await makeManager();
  const created = await mgr.create({ userId: "u" as UserId, channelId: "c" as ChannelId });
  const fetched = await mgr.get(created.id);
  assertExists(fetched);
  assertEquals(fetched!.id, created.id);
});

Deno.test("SessionManager: get returns null for nonexistent ID", async () => {
  const mgr = await makeManager();
  const result = await mgr.get("nonexistent" as any);
  assertEquals(result, null);
});

Deno.test("SessionManager: list returns all sessions", async () => {
  const mgr = await makeManager();
  await mgr.create({ userId: "u1" as UserId, channelId: "c" as ChannelId });
  await mgr.create({ userId: "u2" as UserId, channelId: "c" as ChannelId });
  const all = await mgr.list();
  assertEquals(all.length, 2);
});

Deno.test("SessionManager: delete removes session", async () => {
  const mgr = await makeManager();
  const session = await mgr.create({ userId: "u" as UserId, channelId: "c" as ChannelId });
  await mgr.delete(session.id);
  assertEquals(await mgr.get(session.id), null);
});

Deno.test("SessionManager: taint update escalates only", async () => {
  const mgr = await makeManager();
  const session = await mgr.create({ userId: "u" as UserId, channelId: "c" as ChannelId });
  const updated = await mgr.updateTaint(session.id, "CONFIDENTIAL", "accessed CRM");
  assertEquals(updated.taint, "CONFIDENTIAL");
  // Try to downgrade — should remain CONFIDENTIAL
  const noDowngrade = await mgr.updateTaint(session.id, "PUBLIC", "attempt");
  assertEquals(noDowngrade.taint, "CONFIDENTIAL");
});

Deno.test("SessionManager: reset clears taint and history", async () => {
  const mgr = await makeManager();
  const session = await mgr.create({ userId: "u" as UserId, channelId: "c" as ChannelId });
  await mgr.updateTaint(session.id, "RESTRICTED", "secret doc");
  const reset = await mgr.reset(session.id);
  assertEquals(reset.taint, "PUBLIC");
  assertEquals(reset.history.length, 0);
  assertEquals(reset.userId, session.userId);
  assertNotEquals(reset.id, session.id);
});
