/**
 * Group chat management tests.
 *
 * Tests group modes, @mention detection, owner commands,
 * and poll creation/voting/closing.
 */

import { assertEquals, assertExists } from "jsr:@std/assert";
import { createGroupManager } from "../../src/channels/groups.ts";

// ---------------------------------------------------------------------------
// Group mode filtering (existing functionality)
// ---------------------------------------------------------------------------

Deno.test("shouldRespond: true by default when no config", () => {
  const gm = createGroupManager();
  assertEquals(gm.shouldRespond("g1", "hello"), true);
});

Deno.test("shouldRespond: always mode responds to everything", () => {
  const gm = createGroupManager();
  gm.configure("g1", { mode: "always", botName: "fish" });
  assertEquals(gm.shouldRespond("g1", "random message"), true);
});

Deno.test("shouldRespond: mentioned-only responds only when mentioned", () => {
  const gm = createGroupManager();
  gm.configure("g1", { mode: "mentioned-only", botName: "fish" });
  assertEquals(gm.shouldRespond("g1", "hello everyone"), false);
  assertEquals(gm.shouldRespond("g1", "hey @fish what's up"), true);
});

Deno.test("shouldRespond: owner-only never responds to messages", () => {
  const gm = createGroupManager();
  gm.configure("g1", { mode: "owner-only", botName: "fish" });
  assertEquals(gm.shouldRespond("g1", "hello @fish"), false);
});

// ---------------------------------------------------------------------------
// Owner commands
// ---------------------------------------------------------------------------

Deno.test("isOwnerCommand: non-owner blocked from owner commands", () => {
  const gm = createGroupManager();
  assertEquals(gm.isOwnerCommand("/reset", { isOwner: false }), false);
  assertEquals(gm.isOwnerCommand("/model", { isOwner: false }), false);
});

Deno.test("isOwnerCommand: owner can use owner commands", () => {
  const gm = createGroupManager();
  assertEquals(gm.isOwnerCommand("/reset", { isOwner: true }), true);
  assertEquals(gm.isOwnerCommand("/model", { isOwner: true }), true);
});

// ---------------------------------------------------------------------------
// Polls
// ---------------------------------------------------------------------------

Deno.test("createPoll: creates poll with options", () => {
  const gm = createGroupManager();
  const poll = gm.createPoll("g1", "Favorite color?", ["Red", "Blue", "Green"]);

  assertExists(poll.id);
  assertEquals(poll.groupId, "g1");
  assertEquals(poll.question, "Favorite color?");
  assertEquals(poll.options.length, 3);
  assertEquals(poll.options[0].label, "Red");
  assertEquals(poll.options[0].votes.size, 0);
  assertEquals(poll.closed, false);
});

Deno.test("vote: records a vote successfully", () => {
  const gm = createGroupManager();
  const poll = gm.createPoll("g1", "Choice?", ["A", "B"]);

  const result = gm.vote(poll.id, 0, "user-1");
  assertEquals(result, true);

  const updated = gm.getPoll(poll.id);
  assertExists(updated);
  assertEquals(updated.options[0].votes.size, 1);
  assertEquals(updated.options[0].votes.has("user-1"), true);
});

Deno.test("vote: prevents double voting", () => {
  const gm = createGroupManager();
  const poll = gm.createPoll("g1", "Choice?", ["A", "B"]);

  gm.vote(poll.id, 0, "user-1");
  const second = gm.vote(poll.id, 1, "user-1"); // Same voter, different option
  assertEquals(second, false);
});

Deno.test("vote: multiple voters can vote", () => {
  const gm = createGroupManager();
  const poll = gm.createPoll("g1", "Choice?", ["A", "B"]);

  assertEquals(gm.vote(poll.id, 0, "user-1"), true);
  assertEquals(gm.vote(poll.id, 0, "user-2"), true);
  assertEquals(gm.vote(poll.id, 1, "user-3"), true);

  const updated = gm.getPoll(poll.id);
  assertExists(updated);
  assertEquals(updated.options[0].votes.size, 2);
  assertEquals(updated.options[1].votes.size, 1);
});

Deno.test("vote: rejects invalid option index", () => {
  const gm = createGroupManager();
  const poll = gm.createPoll("g1", "Choice?", ["A", "B"]);

  assertEquals(gm.vote(poll.id, -1, "user-1"), false);
  assertEquals(gm.vote(poll.id, 5, "user-1"), false);
});

Deno.test("vote: rejects vote on closed poll", () => {
  const gm = createGroupManager();
  const poll = gm.createPoll("g1", "Choice?", ["A", "B"]);

  gm.closePoll(poll.id);
  assertEquals(gm.vote(poll.id, 0, "user-1"), false);
});

Deno.test("vote: rejects vote on nonexistent poll", () => {
  const gm = createGroupManager();
  assertEquals(gm.vote("nonexistent", 0, "user-1"), false);
});

Deno.test("closePoll: returns final results", () => {
  const gm = createGroupManager();
  const poll = gm.createPoll("g1", "Choice?", ["A", "B"]);

  gm.vote(poll.id, 0, "user-1");
  gm.vote(poll.id, 1, "user-2");

  const result = gm.closePoll(poll.id);
  assertExists(result);
  assertEquals(result.closed, true);
  assertEquals(result.options[0].votes.size, 1);
  assertEquals(result.options[1].votes.size, 1);
});

Deno.test("closePoll: returns undefined for nonexistent poll", () => {
  const gm = createGroupManager();
  assertEquals(gm.closePoll("nonexistent"), undefined);
});

Deno.test("getPoll: returns undefined for nonexistent poll", () => {
  const gm = createGroupManager();
  assertEquals(gm.getPoll("nonexistent"), undefined);
});
