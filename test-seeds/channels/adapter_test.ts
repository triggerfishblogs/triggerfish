/**
 * Phases 15-16: Channel Adapters, Ripple & Groups
 * Tests MUST FAIL until adapters, ripple, and group chat are implemented.
 */
import { assertEquals, assertExists, assert } from "@std/assert";
import type { ChannelAdapter } from "../../src/channels/types.ts";
import { createChannelRouter } from "../../src/channels/router.ts";
import { createRippleManager } from "../../src/channels/ripple.ts";
import { createGroupManager } from "../../src/channels/groups.ts";

// --- Channel router ---

Deno.test("ChannelRouter: dispatches to correct adapter by channel config", () => {
  const mockAdapter: ChannelAdapter = {
    connect: async () => {},
    disconnect: async () => {},
    send: async () => {},
    onMessage: () => {},
    status: () => ({ connected: true, channelType: "mock" }),
    classification: "INTERNAL",
    isOwner: true,
  };
  const router = createChannelRouter();
  router.register("test-channel", mockAdapter);
  const found = router.getAdapter("test-channel");
  assertExists(found);
  assertEquals(found!.status().channelType, "mock");
});

// --- Ripple ---

Deno.test("PresenceManager: tracks typing state", async () => {
  const ripple = createRippleManager();
  ripple.setTyping("channel-1", true);
  assertEquals(ripple.isTyping("channel-1"), true);
  ripple.setTyping("channel-1", false);
  assertEquals(ripple.isTyping("channel-1"), false);
});

Deno.test("PresenceManager: tracks online/away/busy state", () => {
  const ripple = createRippleManager();
  ripple.setState("online");
  assertEquals(ripple.getState(), "online");
  ripple.setState("away");
  assertEquals(ripple.getState(), "away");
});

// --- Group chat ---

Deno.test("GroupManager: mentioned-only mode filters messages", () => {
  const groups = createGroupManager();
  groups.configure("group-1", { mode: "mentioned-only", botName: "triggerfish" });
  assertEquals(groups.shouldRespond("group-1", "hey everyone"), false);
  assertEquals(groups.shouldRespond("group-1", "hey @triggerfish help me"), true);
});

Deno.test("GroupManager: owner-only commands rejected from non-owners", () => {
  const groups = createGroupManager();
  const allowed = groups.isOwnerCommand("/reset", { isOwner: false });
  assertEquals(allowed, false);
});
