/**
 * Per-user rate limiter tests.
 *
 * Verifies that createUserRateLimiter correctly enforces per-sender
 * sliding window limits and prunes expired entries.
 */

import { assertEquals } from "@std/assert";
import { createUserRateLimiter } from "../../src/channels/rate_limiter.ts";

// ─── Basic allow/deny ─────────────────────────────────────────────────────

Deno.test("isAllowed: first request always allowed", () => {
  const rl = createUserRateLimiter({ maxRequests: 3, windowMs: 60_000 });
  assertEquals(rl.isAllowed("user-1"), true);
});

Deno.test("isAllowed: requests within limit all allowed", () => {
  const rl = createUserRateLimiter({ maxRequests: 3, windowMs: 60_000 });
  assertEquals(rl.isAllowed("user-1"), true);
  assertEquals(rl.isAllowed("user-1"), true);
  assertEquals(rl.isAllowed("user-1"), true);
});

Deno.test("isAllowed: request exceeding limit rejected", () => {
  const rl = createUserRateLimiter({ maxRequests: 3, windowMs: 60_000 });
  rl.isAllowed("user-1");
  rl.isAllowed("user-1");
  rl.isAllowed("user-1");
  // 4th request should be rejected
  assertEquals(rl.isAllowed("user-1"), false);
});

Deno.test("isAllowed: rejection is consistent when at limit", () => {
  const rl = createUserRateLimiter({ maxRequests: 2, windowMs: 60_000 });
  rl.isAllowed("user-1");
  rl.isAllowed("user-1");
  assertEquals(rl.isAllowed("user-1"), false);
  assertEquals(rl.isAllowed("user-1"), false);
});

// ─── Per-sender isolation ─────────────────────────────────────────────────

Deno.test("isAllowed: limits are per-senderId (different senders independent)", () => {
  const rl = createUserRateLimiter({ maxRequests: 2, windowMs: 60_000 });
  // Exhaust user-1's limit
  rl.isAllowed("user-1");
  rl.isAllowed("user-1");
  assertEquals(rl.isAllowed("user-1"), false);
  // user-2 should still be allowed
  assertEquals(rl.isAllowed("user-2"), true);
  assertEquals(rl.isAllowed("user-2"), true);
});

Deno.test("isAllowed: unknown sender starts fresh", () => {
  const rl = createUserRateLimiter({ maxRequests: 1, windowMs: 60_000 });
  assertEquals(rl.isAllowed("new-user"), true);
  assertEquals(rl.isAllowed("new-user"), false);
});

// ─── Window expiration ────────────────────────────────────────────────────

Deno.test("isAllowed: window resets after windowMs elapses", async () => {
  const rl = createUserRateLimiter({ maxRequests: 2, windowMs: 50 });
  rl.isAllowed("user-1");
  rl.isAllowed("user-1");
  assertEquals(rl.isAllowed("user-1"), false);
  // Wait for window to expire
  await new Promise((r) => setTimeout(r, 60));
  assertEquals(rl.isAllowed("user-1"), true);
});

// ─── Prune ────────────────────────────────────────────────────────────────

Deno.test("prune: removes fully expired entries", async () => {
  const rl = createUserRateLimiter({ maxRequests: 5, windowMs: 30 });
  rl.isAllowed("user-a");
  rl.isAllowed("user-b");
  await new Promise((r) => setTimeout(r, 40));
  // After prune, both users are cleared and start fresh
  rl.prune();
  assertEquals(rl.isAllowed("user-a"), true);
  assertEquals(rl.isAllowed("user-b"), true);
});

Deno.test("prune: preserves entries within the window", () => {
  const rl = createUserRateLimiter({ maxRequests: 2, windowMs: 60_000 });
  rl.isAllowed("user-1");
  rl.isAllowed("user-1");
  rl.prune(); // Should not clear user-1 (window hasn't expired)
  assertEquals(rl.isAllowed("user-1"), false); // Still at limit
});

// ─── Edge cases ───────────────────────────────────────────────────────────

Deno.test("isAllowed: maxRequests=1 allows exactly one request", () => {
  const rl = createUserRateLimiter({ maxRequests: 1, windowMs: 60_000 });
  assertEquals(rl.isAllowed("user-x"), true);
  assertEquals(rl.isAllowed("user-x"), false);
});

Deno.test("isAllowed: rejection does not consume capacity", () => {
  const rl = createUserRateLimiter({ maxRequests: 2, windowMs: 60_000 });
  rl.isAllowed("user-1");
  rl.isAllowed("user-1");
  // Reject several times
  rl.isAllowed("user-1");
  rl.isAllowed("user-1");
  // Still at limit, not some inflated count
  assertEquals(rl.isAllowed("user-1"), false);
});
