/**
 * Tests for session retention policies.
 */
import { assert, assertEquals } from "@std/assert";
import { applyRetention } from "../../../src/core/session/retention.ts";
import { createMemoryStorage } from "../../../src/core/storage/memory.ts";
import type { StorageProvider } from "../../../src/core/storage/provider.ts";

/** Helper: store a fake session with a given createdAt date. */
async function storeSession(
  storage: StorageProvider,
  id: string,
  createdAt: Date,
): Promise<void> {
  const session = JSON.stringify({
    id,
    userId: "user_1",
    channelId: "ch_1",
    taint: "PUBLIC",
    createdAt: createdAt.toISOString(),
    history: [],
  });
  await storage.set(`sessions:${id}`, session);
}

// ── TTL-based deletion ──────────────────────────────────────────────

Deno.test("applyRetention: deletes sessions older than configured TTL", async () => {
  const storage = createMemoryStorage();
  const now = new Date("2026-02-09T12:00:00Z");

  // Session created 10 days ago — should be deleted with maxAgeDays=7
  await storeSession(storage, "old-1", new Date("2026-01-30T12:00:00Z"));

  // Session created 3 days ago — should be kept
  await storeSession(storage, "recent-1", new Date("2026-02-06T12:00:00Z"));

  const result = await applyRetention(
    storage,
    { maxAgeDays: 7 },
    now,
  );

  assert(result.ok);
  if (!result.ok) return;
  assertEquals(result.value, 1);

  // Verify the old session was deleted
  assertEquals(await storage.get("sessions:old-1"), null);
  // Verify the recent session was kept
  assert(await storage.get("sessions:recent-1") !== null);
});

Deno.test("applyRetention: keeps sessions within TTL", async () => {
  const storage = createMemoryStorage();
  const now = new Date("2026-02-09T12:00:00Z");

  // All sessions within TTL
  await storeSession(storage, "s1", new Date("2026-02-08T00:00:00Z"));
  await storeSession(storage, "s2", new Date("2026-02-07T00:00:00Z"));
  await storeSession(storage, "s3", new Date("2026-02-03T00:00:00Z"));

  const result = await applyRetention(
    storage,
    { maxAgeDays: 7 },
    now,
  );

  assert(result.ok);
  if (!result.ok) return;
  assertEquals(result.value, 0);

  // All sessions still present
  const keys = await storage.list("sessions:");
  assertEquals(keys.length, 3);
});

Deno.test("applyRetention: returns count of deleted sessions", async () => {
  const storage = createMemoryStorage();
  const now = new Date("2026-02-09T12:00:00Z");

  // 3 old sessions, 2 recent
  await storeSession(storage, "old-a", new Date("2026-01-01T00:00:00Z"));
  await storeSession(storage, "old-b", new Date("2026-01-15T00:00:00Z"));
  await storeSession(storage, "old-c", new Date("2026-01-20T00:00:00Z"));
  await storeSession(storage, "new-a", new Date("2026-02-08T00:00:00Z"));
  await storeSession(storage, "new-b", new Date("2026-02-09T00:00:00Z"));

  const result = await applyRetention(
    storage,
    { maxAgeDays: 7 },
    now,
  );

  assert(result.ok);
  if (!result.ok) return;
  assertEquals(result.value, 3);

  const remaining = await storage.list("sessions:");
  assertEquals(remaining.length, 2);
});

Deno.test("applyRetention: handles empty session list", async () => {
  const storage = createMemoryStorage();

  const result = await applyRetention(
    storage,
    { maxAgeDays: 30 },
    new Date("2026-02-09T12:00:00Z"),
  );

  assert(result.ok);
  if (!result.ok) return;
  assertEquals(result.value, 0);
});

// ── maxSessions limit ───────────────────────────────────────────────

Deno.test("applyRetention: maxSessions keeps only the N newest", async () => {
  const storage = createMemoryStorage();
  const now = new Date("2026-02-09T12:00:00Z");

  // 5 sessions, all within TTL
  await storeSession(storage, "s1", new Date("2026-02-05T00:00:00Z")); // oldest
  await storeSession(storage, "s2", new Date("2026-02-06T00:00:00Z"));
  await storeSession(storage, "s3", new Date("2026-02-07T00:00:00Z"));
  await storeSession(storage, "s4", new Date("2026-02-08T00:00:00Z"));
  await storeSession(storage, "s5", new Date("2026-02-09T00:00:00Z")); // newest

  const result = await applyRetention(
    storage,
    { maxAgeDays: 30, maxSessions: 3 },
    now,
  );

  assert(result.ok);
  if (!result.ok) return;
  assertEquals(result.value, 2); // s1 and s2 deleted

  // Only the 3 newest remain
  assertEquals(await storage.get("sessions:s1"), null);
  assertEquals(await storage.get("sessions:s2"), null);
  assert(await storage.get("sessions:s3") !== null);
  assert(await storage.get("sessions:s4") !== null);
  assert(await storage.get("sessions:s5") !== null);
});

Deno.test("applyRetention: maxSessions combined with TTL", async () => {
  const storage = createMemoryStorage();
  const now = new Date("2026-02-09T12:00:00Z");

  // 1 expired + 4 within TTL
  await storeSession(storage, "expired", new Date("2026-01-01T00:00:00Z"));
  await storeSession(storage, "s1", new Date("2026-02-06T00:00:00Z"));
  await storeSession(storage, "s2", new Date("2026-02-07T00:00:00Z"));
  await storeSession(storage, "s3", new Date("2026-02-08T00:00:00Z"));
  await storeSession(storage, "s4", new Date("2026-02-09T00:00:00Z"));

  const result = await applyRetention(
    storage,
    { maxAgeDays: 7, maxSessions: 2 },
    now,
  );

  assert(result.ok);
  if (!result.ok) return;
  // 1 from TTL + 2 from maxSessions limit = 3
  assertEquals(result.value, 3);

  const remaining = await storage.list("sessions:");
  assertEquals(remaining.length, 2);
});
