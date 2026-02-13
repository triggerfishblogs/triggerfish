/**
 * Phase 1: Core Types — Session
 * Tests MUST FAIL until session.ts is implemented.
 * Tests branded IDs, SessionState, taint escalation, canOutput.
 */
import { assertEquals, assertNotEquals, assertExists } from "@std/assert";
import {
  type UserId,
  type ChannelId,
  createSession,
  updateTaint,
  canOutput,
  resetSession,
} from "../../src/core/types/session.ts";

// --- createSession ---

Deno.test("createSession: returns session with PUBLIC taint", () => {
  const session = createSession({ userId: "user-1" as UserId, channelId: "ch-1" as ChannelId });
  assertEquals(session.taint, "PUBLIC");
});

Deno.test("createSession: generates unique session ID", () => {
  const a = createSession({ userId: "user-1" as UserId, channelId: "ch-1" as ChannelId });
  const b = createSession({ userId: "user-1" as UserId, channelId: "ch-1" as ChannelId });
  assertNotEquals(a.id, b.id);
});

Deno.test("createSession: sets userId and channelId", () => {
  const session = createSession({ userId: "user-1" as UserId, channelId: "ch-1" as ChannelId });
  assertEquals(session.userId, "user-1" as UserId);
  assertEquals(session.channelId, "ch-1" as ChannelId);
});

Deno.test("createSession: history starts empty", () => {
  const session = createSession({ userId: "u" as UserId, channelId: "c" as ChannelId });
  assertEquals(session.history.length, 0);
});

// --- updateTaint ---

Deno.test("updateTaint: escalates taint from PUBLIC to CONFIDENTIAL", () => {
  const session = createSession({ userId: "u" as UserId, channelId: "c" as ChannelId });
  const updated = updateTaint(session, "CONFIDENTIAL", "accessed CRM data");
  assertEquals(updated.taint, "CONFIDENTIAL");
});

Deno.test("updateTaint: does NOT decrease taint", () => {
  const session = createSession({ userId: "u" as UserId, channelId: "c" as ChannelId });
  const escalated = updateTaint(session, "RESTRICTED", "secret doc");
  const attempted = updateTaint(escalated, "PUBLIC", "tried to downgrade");
  assertEquals(attempted.taint, "RESTRICTED");
});

Deno.test("updateTaint: returns NEW object (immutable)", () => {
  const session = createSession({ userId: "u" as UserId, channelId: "c" as ChannelId });
  const updated = updateTaint(session, "INTERNAL", "test");
  assertNotEquals(session, updated);
  assertEquals(session.taint, "PUBLIC"); // original unchanged
});

Deno.test("updateTaint: appends TaintEvent to history", () => {
  const session = createSession({ userId: "u" as UserId, channelId: "c" as ChannelId });
  const updated = updateTaint(session, "CONFIDENTIAL", "reason");
  assertEquals(updated.history.length, 1);
  assertEquals(updated.history[0].previousLevel, "PUBLIC");
  assertEquals(updated.history[0].newLevel, "CONFIDENTIAL");
  assertEquals(updated.history[0].reason, "reason");
  assertExists(updated.history[0].timestamp);
});

// --- canOutput ---

Deno.test("canOutput: CONFIDENTIAL taint to PUBLIC target returns FALSE", () => {
  const session = createSession({ userId: "u" as UserId, channelId: "c" as ChannelId });
  const tainted = updateTaint(session, "CONFIDENTIAL", "test");
  assertEquals(canOutput(tainted, "PUBLIC"), false);
});

Deno.test("canOutput: PUBLIC taint to RESTRICTED target returns TRUE", () => {
  const session = createSession({ userId: "u" as UserId, channelId: "c" as ChannelId });
  assertEquals(canOutput(session, "RESTRICTED"), true);
});

Deno.test("canOutput: INTERNAL taint to INTERNAL target returns TRUE", () => {
  const session = createSession({ userId: "u" as UserId, channelId: "c" as ChannelId });
  const tainted = updateTaint(session, "INTERNAL", "test");
  assertEquals(canOutput(tainted, "INTERNAL"), true);
});

// --- resetSession ---

Deno.test("resetSession: creates fresh session with PUBLIC taint", () => {
  const session = createSession({ userId: "u" as UserId, channelId: "c" as ChannelId });
  const tainted = updateTaint(session, "RESTRICTED", "secret");
  const reset = resetSession(tainted);
  assertEquals(reset.taint, "PUBLIC");
  assertEquals(reset.history.length, 0);
});

Deno.test("resetSession: preserves userId and channelId", () => {
  const session = createSession({ userId: "user-x" as UserId, channelId: "ch-y" as ChannelId });
  const reset = resetSession(session);
  assertEquals(reset.userId, "user-x" as UserId);
  assertEquals(reset.channelId, "ch-y" as ChannelId);
});

Deno.test("resetSession: generates new session ID", () => {
  const session = createSession({ userId: "u" as UserId, channelId: "c" as ChannelId });
  const reset = resetSession(session);
  assertNotEquals(session.id, reset.id);
});
