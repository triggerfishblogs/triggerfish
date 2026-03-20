/**
 * Reddit rate limiter tests.
 *
 * @module
 */
import { assertEquals } from "@std/assert";
import { createRateLimiter } from "../../src/integrations/reddit/rate_limiter.ts";

Deno.test("RateLimiter: allows requests within limit", () => {
  const limiter = createRateLimiter({ maxRequests: 3, windowMs: 1000 });
  assertEquals(limiter.tryAcquire(), true);
  assertEquals(limiter.tryAcquire(), true);
  assertEquals(limiter.tryAcquire(), true);
  assertEquals(limiter.tryAcquire(), false);
});

Deno.test("RateLimiter: allows requests after window expires", () => {
  let now = 0;
  const limiter = createRateLimiter({
    maxRequests: 2,
    windowMs: 1000,
    nowFn: () => now,
  });

  assertEquals(limiter.tryAcquire(), true);
  assertEquals(limiter.tryAcquire(), true);
  assertEquals(limiter.tryAcquire(), false);

  // Advance past the window
  now = 1001;
  assertEquals(limiter.tryAcquire(), true);
});
