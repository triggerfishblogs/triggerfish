/**
 * Bumpers: taint escalation guard tests.
 *
 * Tests default state, toggle, block/pass logic, immutability,
 * and message content.
 */
import { assertEquals, assertNotStrictEquals } from "@std/assert";
import {
  BUMPER_BLOCK_MESSAGE,
  BUMPERS_SYSTEM_PROMPT,
  toggleBumpers,
  wouldBumpersBlock,
} from "../../../src/core/session/bumpers.ts";
import { createSession } from "../../../src/core/types/session.ts";
import type {
  ChannelId,
  SessionState,
  UserId,
} from "../../../src/core/types/session.ts";
import { updateTaint } from "../../../src/core/types/session.ts";

function makeSession(overrides?: Partial<SessionState>): SessionState {
  const base = createSession({
    userId: "owner" as UserId,
    channelId: "cli" as ChannelId,
  });
  return overrides ? { ...base, ...overrides } : base;
}

Deno.test("Bumpers: new session has bumpersEnabled true by default", () => {
  const session = makeSession();
  assertEquals(session.bumpersEnabled, true);
});

Deno.test("Bumpers: toggleBumpers flips true to false", () => {
  const session = makeSession({ bumpersEnabled: true });
  const toggled = toggleBumpers(session);
  assertEquals(toggled.bumpersEnabled, false);
});

Deno.test("Bumpers: toggleBumpers flips false to true", () => {
  const session = makeSession({ bumpersEnabled: false });
  const toggled = toggleBumpers(session);
  assertEquals(toggled.bumpersEnabled, true);
});

Deno.test("Bumpers: wouldBumpersBlock returns true for escalating level", () => {
  const session = makeSession({ bumpersEnabled: true, taint: "PUBLIC" });
  assertEquals(wouldBumpersBlock(session, "CONFIDENTIAL"), true);
});

Deno.test("Bumpers: wouldBumpersBlock returns false for same level", () => {
  const session = makeSession({ bumpersEnabled: true, taint: "INTERNAL" });
  assertEquals(wouldBumpersBlock(session, "INTERNAL"), false);
});

Deno.test("Bumpers: wouldBumpersBlock returns false for lower level", () => {
  const session = updateTaint(
    makeSession({ bumpersEnabled: true }),
    "CONFIDENTIAL",
    "test escalation",
  );
  assertEquals(wouldBumpersBlock(session, "PUBLIC"), false);
});

Deno.test("Bumpers: wouldBumpersBlock returns false when bumpers disabled", () => {
  const session = makeSession({ bumpersEnabled: false, taint: "PUBLIC" });
  assertEquals(wouldBumpersBlock(session, "RESTRICTED"), false);
});

Deno.test("Bumpers: no-op at RESTRICTED (maximum taint)", () => {
  const session = updateTaint(
    makeSession({ bumpersEnabled: true }),
    "RESTRICTED",
    "test escalation",
  );
  assertEquals(wouldBumpersBlock(session, "RESTRICTED"), false);
});

Deno.test("Bumpers: toggleBumpers returns new object (immutability)", () => {
  const original = makeSession({ bumpersEnabled: true });
  const toggled = toggleBumpers(original);
  assertNotStrictEquals(original, toggled);
  assertEquals(original.bumpersEnabled, true);
  assertEquals(toggled.bumpersEnabled, false);
});

Deno.test("Bumpers: block message contains expected content", () => {
  assertEquals(BUMPER_BLOCK_MESSAGE.includes("[Bumpers]"), true);
  assertEquals(BUMPER_BLOCK_MESSAGE.includes("/bumpers"), true);
  assertEquals(
    BUMPERS_SYSTEM_PROMPT.includes("Bumpers are deployed"),
    true,
  );
});
