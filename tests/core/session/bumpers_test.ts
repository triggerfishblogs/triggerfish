/**
 * Bumpers — taint escalation guard tests.
 *
 * Covers toggle behavior, blocking logic, immutability,
 * and block message content.
 */
import { assertEquals, assertNotStrictEquals } from "@std/assert";
import {
  BUMPER_BLOCK_MESSAGE,
  toggleBumpers,
  wouldBumpersBlock,
} from "../../src/core/session/bumpers.ts";
import { createSession } from "../../src/core/types/session.ts";
import type {
  ChannelId,
  SessionState,
  UserId,
} from "../../src/core/types/session.ts";
import { updateTaint } from "../../src/core/types/session.ts";

function makeSession(
  opts?: Partial<{ bumpersEnabled: boolean; taint: string }>,
): SessionState {
  const session = createSession({
    userId: "u" as UserId,
    channelId: "c" as ChannelId,
    bumpersEnabled: opts?.bumpersEnabled,
  });
  if (opts?.taint && opts.taint !== "PUBLIC") {
    return updateTaint(
      session,
      opts.taint as SessionState["taint"],
      "test setup",
    );
  }
  return session;
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
  const session = makeSession({ bumpersEnabled: true });
  assertEquals(wouldBumpersBlock(session, "CONFIDENTIAL"), true);
});

Deno.test("Bumpers: wouldBumpersBlock returns false for same level", () => {
  const session = makeSession({ bumpersEnabled: true });
  assertEquals(wouldBumpersBlock(session, "PUBLIC"), false);
});

Deno.test("Bumpers: wouldBumpersBlock returns false for lower level", () => {
  const session = makeSession({ bumpersEnabled: true, taint: "CONFIDENTIAL" });
  assertEquals(wouldBumpersBlock(session, "PUBLIC"), false);
});

Deno.test("Bumpers: wouldBumpersBlock returns false when bumpers disabled", () => {
  const session = makeSession({ bumpersEnabled: false });
  assertEquals(wouldBumpersBlock(session, "RESTRICTED"), false);
});

Deno.test("Bumpers: no-op at RESTRICTED (maximum taint)", () => {
  const session = makeSession({ bumpersEnabled: true, taint: "RESTRICTED" });
  assertEquals(wouldBumpersBlock(session, "RESTRICTED"), false);
});

Deno.test("Bumpers: toggleBumpers returns new object (immutability)", () => {
  const session = makeSession();
  const toggled = toggleBumpers(session);
  assertNotStrictEquals(session, toggled);
  assertEquals(session.bumpersEnabled, true);
  assertEquals(toggled.bumpersEnabled, false);
});

Deno.test("Bumpers: block message contains expected content", () => {
  assertEquals(BUMPER_BLOCK_MESSAGE.includes("[Bumpers]"), true);
  assertEquals(BUMPER_BLOCK_MESSAGE.includes("/bumpers"), true);
});
