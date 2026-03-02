/**
 * Notification priority routing and deduplication tests.
 */

import { assertEquals } from "@std/assert";
import { createPriorityRouter } from "../../src/gateway/notifications/priority_router.ts";
import type { DeliverOptions } from "../../src/gateway/notifications/notifications.ts";
import type { UserId } from "../../src/core/types/session.ts";

// ---------------------------------------------------------------------------
// Routing decisions
// ---------------------------------------------------------------------------

Deno.test("route: critical priority routes to all channels", () => {
  const router = createPriorityRouter();
  assertEquals(router.route("critical"), "all_channels");
});

Deno.test("route: normal priority routes to primary only", () => {
  const router = createPriorityRouter();
  assertEquals(router.route("normal"), "primary_only");
});

Deno.test("route: low priority routes to batch digest", () => {
  const router = createPriorityRouter();
  assertEquals(router.route("low"), "batch_digest");
});

// ---------------------------------------------------------------------------
// Deduplication
// ---------------------------------------------------------------------------

function makeOptions(
  message: string,
  userId = "user-1" as UserId,
): DeliverOptions {
  return { userId, message, priority: "normal" };
}

Deno.test("isDuplicate: returns false for new notification", () => {
  const router = createPriorityRouter();
  assertEquals(router.isDuplicate(makeOptions("hello")), false);
});

Deno.test("isDuplicate: returns true after recording delivery", () => {
  const router = createPriorityRouter();
  const opts = makeOptions("hello");

  router.recordDelivery(opts);
  assertEquals(router.isDuplicate(opts), true);
});

Deno.test("isDuplicate: different messages are not duplicates", () => {
  const router = createPriorityRouter();

  router.recordDelivery(makeOptions("hello"));
  assertEquals(router.isDuplicate(makeOptions("world")), false);
});

Deno.test("isDuplicate: different users are not duplicates", () => {
  const router = createPriorityRouter();

  router.recordDelivery(makeOptions("hello", "user-1" as UserId));
  assertEquals(
    router.isDuplicate(makeOptions("hello", "user-2" as UserId)),
    false,
  );
});

Deno.test("isDuplicate: returns false after deduplication window expires", () => {
  // Use a very short window for testing
  const router = createPriorityRouter({ deduplicationWindowMs: 1 });
  const opts = makeOptions("hello");

  router.recordDelivery(opts);

  // Wait for window to expire
  const start = Date.now();
  while (Date.now() - start < 5) {
    // busy-wait a few ms
  }

  assertEquals(router.isDuplicate(opts), false);
});

// ---------------------------------------------------------------------------
// Sweep
// ---------------------------------------------------------------------------

Deno.test("sweep: clears expired entries", () => {
  const router = createPriorityRouter({ deduplicationWindowMs: 1 });
  const opts = makeOptions("hello");

  router.recordDelivery(opts);

  // Wait for window to expire
  const start = Date.now();
  while (Date.now() - start < 5) {
    // busy-wait
  }

  router.sweep();
  // After sweep, a new identical notification is not considered duplicate
  assertEquals(router.isDuplicate(opts), false);
});

Deno.test("sweep: keeps non-expired entries", () => {
  const router = createPriorityRouter({ deduplicationWindowMs: 60000 });
  const opts = makeOptions("hello");

  router.recordDelivery(opts);
  router.sweep();

  assertEquals(router.isDuplicate(opts), true);
});
