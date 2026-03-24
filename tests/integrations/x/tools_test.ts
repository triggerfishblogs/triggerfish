/**
 * Tests for the X tool executor.
 *
 * Verifies chain passthrough, unconfigured error messages, parameter
 * validation, tier availability gating, and x_quota dispatch.
 *
 * @module
 */

import { assertEquals, assertStringIncludes } from "@std/assert";
import { createXToolExecutor } from "../../../src/integrations/x/tools.ts";
import { checkTierAvailability } from "../../../src/integrations/x/tools_shared.ts";
import type { XToolContext } from "../../../src/integrations/x/tools_shared.ts";
import type { XRateLimiter } from "../../../src/integrations/x/client/rate_limiter.ts";
import type { XQuotaTracker } from "../../../src/integrations/x/client/quota_tracker.ts";

// ─── Mock helpers ────────────────────────────────────────────────────────────

function createMockContext(overrides?: Partial<XToolContext>): XToolContext {
  const mockRateLimiter: XRateLimiter = {
    recordResponse: () => {},
    checkLimit: () => ({ ok: true }),
    reset: () => {},
  };
  const mockQuotaTracker: XQuotaTracker = {
    recordRead: () => Promise.resolve(),
    recordWrite: () => Promise.resolve(),
    getUsage: () =>
      Promise.resolve({
        month: "2026-03",
        tier: "basic" as const,
        reads: { used: 0, limit: 10000 },
        writes: { used: 0, limit: 50000 },
      }),
    checkReadQuota: () => Promise.resolve({ ok: true }),
    checkWriteQuota: () => Promise.resolve({ ok: true }),
  };

  return {
    posts: {} as unknown as XToolContext["posts"],
    users: {} as unknown as XToolContext["users"],
    engage: {} as unknown as XToolContext["engage"],
    lists: {} as unknown as XToolContext["lists"],
    rateLimiter: mockRateLimiter,
    quotaTracker: mockQuotaTracker,
    sessionTaint: () => "PUBLIC" as const,
    sourceSessionId: "test-session" as unknown as XToolContext["sourceSessionId"],
    tier: "basic" as const,
    authenticatedUserId: "12345",
    ...overrides,
  };
}

// ─── Chain passthrough ───────────────────────────────────────────────────────

Deno.test("XToolExecutor: returns null for unknown tool name", async () => {
  const executor = createXToolExecutor(createMockContext());
  const result = await executor("unknown_tool", {});
  assertEquals(result, null);
});

// ─── Unconfigured context ────────────────────────────────────────────────────

Deno.test("XToolExecutor: returns not configured for x_posts when ctx undefined", async () => {
  const executor = createXToolExecutor(undefined);
  const result = await executor("x_posts", { action: "search" });
  assertStringIncludes(result!, "not configured");
  assertStringIncludes(result!, "triggerfish connect x");
});

Deno.test("XToolExecutor: returns not configured for x_quota when ctx undefined", async () => {
  const executor = createXToolExecutor(undefined);
  const result = await executor("x_quota", {});
  assertStringIncludes(result!, "not configured");
  assertStringIncludes(result!, "triggerfish connect x");
});

// ─── Parameter validation ────────────────────────────────────────────────────

Deno.test("XToolExecutor: returns error when action parameter is missing", async () => {
  const executor = createXToolExecutor(createMockContext());
  const result = await executor("x_posts", {});
  assertStringIncludes(result!, "requires an 'action' parameter");
});

Deno.test("XToolExecutor: returns error when action parameter is empty string", async () => {
  const executor = createXToolExecutor(createMockContext());
  const result = await executor("x_posts", { action: "" });
  assertStringIncludes(result!, "requires an 'action' parameter");
});

Deno.test("XToolExecutor: returns error for unknown action on x_posts", async () => {
  const executor = createXToolExecutor(createMockContext());
  const result = await executor("x_posts", { action: "nonexistent" });
  assertStringIncludes(result!, 'unknown action "nonexistent"');
  assertStringIncludes(result!, "Valid actions:");
});

// ─── Tier availability ───────────────────────────────────────────────────────

Deno.test("XToolExecutor: checkTierAvailability returns null for basic tier", () => {
  const result = checkTierAvailability("x_posts", "search", "basic");
  assertEquals(result, null);
});

Deno.test("XToolExecutor: checkTierAvailability blocks search on free tier", () => {
  const result = checkTierAvailability("x_posts", "search", "free");
  assertStringIncludes(result!, "requires X API Basic tier");
  assertStringIncludes(result!, "Current tier: free");
});

Deno.test("XToolExecutor: checkTierAvailability blocks x_users get on free tier", () => {
  const result = checkTierAvailability("x_users", "get", "free");
  assertStringIncludes(result!, "requires X API Basic tier");
});

Deno.test("XToolExecutor: checkTierAvailability allows x_posts create on free tier", () => {
  const result = checkTierAvailability("x_posts", "create", "free");
  assertEquals(result, null);
});

Deno.test("XToolExecutor: checkTierAvailability allows x_engage retweet on free tier", () => {
  const result = checkTierAvailability("x_engage", "retweet", "free");
  assertEquals(result, null);
});

// ─── x_quota dispatch ────────────────────────────────────────────────────────

Deno.test("XToolExecutor: x_quota returns usage JSON when ctx provided", async () => {
  const ctx = createMockContext();
  const executor = createXToolExecutor(ctx);
  const result = await executor("x_quota", {});
  const parsed = JSON.parse(result!);
  assertEquals(parsed.month, "2026-03");
  assertEquals(parsed.tier, "basic");
  assertEquals(parsed.reads.used, 0);
  assertEquals(parsed.reads.limit, 10000);
  assertEquals(parsed.writes.used, 0);
  assertEquals(parsed.writes.limit, 50000);
});
