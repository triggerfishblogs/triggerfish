/**
 * Audit log HMAC chain integrity tests.
 *
 * Verifies that the cryptographic chain correctly links entries,
 * detects tampering, and handles edge cases.
 */
import { assertEquals } from "@std/assert";
import {
  createAuditChain,
  verifyAuditChain,
  type AuditEntry,
  type ChainedAuditEntry,
} from "../../../src/core/policy/mod.ts";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeEntry(overrides?: Partial<AuditEntry>): AuditEntry {
  return {
    timestamp: new Date("2025-01-15T12:00:00Z"),
    hook: "PRE_OUTPUT",
    sessionId: "sess-001",
    action: "BLOCK",
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Append & chain structure
// ---------------------------------------------------------------------------

Deno.test("append: single entry has index 0 and genesis previousHash", async () => {
  const chain = createAuditChain("test-secret");
  const chained = await chain.append(makeEntry());

  assertEquals(chained.index, 0);
  assertEquals(
    chained.previousHash,
    "0000000000000000000000000000000000000000000000000000000000000000",
  );
  assertEquals(typeof chained.hash, "string");
  assertEquals(chained.hash.length, 64); // 32 bytes = 64 hex chars
});

Deno.test("append: second entry links to first entry's hash", async () => {
  const chain = createAuditChain("test-secret");
  const first = await chain.append(makeEntry());
  const second = await chain.append(
    makeEntry({ timestamp: new Date("2025-01-15T12:01:00Z") }),
  );

  assertEquals(second.index, 1);
  assertEquals(second.previousHash, first.hash);
});

Deno.test("append: three entries form a linked chain", async () => {
  const chain = createAuditChain("test-secret");
  const entries: ChainedAuditEntry[] = [];

  for (let i = 0; i < 3; i++) {
    entries.push(
      await chain.append(
        makeEntry({ timestamp: new Date(`2025-01-15T12:0${i}:00Z`) }),
      ),
    );
  }

  assertEquals(entries[0].index, 0);
  assertEquals(entries[1].previousHash, entries[0].hash);
  assertEquals(entries[2].previousHash, entries[1].hash);
});

Deno.test("entries: returns snapshot of all chained entries", async () => {
  const chain = createAuditChain("test-secret");
  await chain.append(makeEntry());
  await chain.append(makeEntry({ timestamp: new Date("2025-01-15T12:01:00Z") }));

  const snapshot = chain.entries();
  assertEquals(snapshot.length, 2);
  assertEquals(snapshot[0].index, 0);
  assertEquals(snapshot[1].index, 1);
});

// ---------------------------------------------------------------------------
// Verification — valid chains
// ---------------------------------------------------------------------------

Deno.test("verify: empty chain is valid", async () => {
  const chain = createAuditChain("test-secret");
  const result = await chain.verify();

  assertEquals(result.ok, true);
  if (result.ok) {
    assertEquals(result.value, true);
  }
});

Deno.test("verify: single-entry chain is valid", async () => {
  const chain = createAuditChain("test-secret");
  await chain.append(makeEntry());

  const result = await chain.verify();
  assertEquals(result.ok, true);
});

Deno.test("verify: multi-entry chain is valid", async () => {
  const chain = createAuditChain("test-secret");

  for (let i = 0; i < 5; i++) {
    await chain.append(
      makeEntry({ timestamp: new Date(`2025-01-15T12:0${i}:00Z`) }),
    );
  }

  const result = await chain.verify();
  assertEquals(result.ok, true);
});

// ---------------------------------------------------------------------------
// Verification — tampering detection
// ---------------------------------------------------------------------------

Deno.test("verify: tampered entry hash breaks chain", async () => {
  const chain = createAuditChain("test-secret");
  await chain.append(makeEntry());
  await chain.append(makeEntry({ timestamp: new Date("2025-01-15T12:01:00Z") }));
  await chain.append(makeEntry({ timestamp: new Date("2025-01-15T12:02:00Z") }));

  // Extract entries and tamper with the middle one's hash
  const snapshot = chain.entries() as ChainedAuditEntry[];
  const tampered: ChainedAuditEntry[] = snapshot.map((e, i) => {
    if (i === 1) {
      return { ...e, hash: "deadbeef".repeat(8) };
    }
    return e;
  });

  const result = await verifyAuditChain("test-secret", tampered);
  assertEquals(result.ok, false);
  if (!result.ok) {
    assertEquals(result.error.includes("Chain broken"), true);
  }
});

Deno.test("verify: tampered entry data breaks chain", async () => {
  const chain = createAuditChain("test-secret");
  await chain.append(makeEntry());
  await chain.append(makeEntry({ timestamp: new Date("2025-01-15T12:01:00Z") }));

  // Extract entries and modify the first entry's payload
  const snapshot = chain.entries() as ChainedAuditEntry[];
  const tampered: ChainedAuditEntry[] = snapshot.map((e, i) => {
    if (i === 0) {
      return {
        ...e,
        entry: { ...e.entry, action: "ALLOW" }, // changed from BLOCK
      };
    }
    return e;
  });

  const result = await verifyAuditChain("test-secret", tampered);
  assertEquals(result.ok, false);
  if (!result.ok) {
    assertEquals(result.error.includes("HMAC mismatch"), true);
  }
});

Deno.test("verify: tampered previousHash breaks chain", async () => {
  const chain = createAuditChain("test-secret");
  await chain.append(makeEntry());
  await chain.append(makeEntry({ timestamp: new Date("2025-01-15T12:01:00Z") }));

  const snapshot = chain.entries() as ChainedAuditEntry[];
  const tampered: ChainedAuditEntry[] = snapshot.map((e, i) => {
    if (i === 1) {
      return { ...e, previousHash: "abcd1234".repeat(8) };
    }
    return e;
  });

  const result = await verifyAuditChain("test-secret", tampered);
  assertEquals(result.ok, false);
  if (!result.ok) {
    assertEquals(result.error.includes("previousHash mismatch"), true);
  }
});

Deno.test("verify: wrong secret fails verification", async () => {
  const chain = createAuditChain("correct-secret");
  await chain.append(makeEntry());
  await chain.append(makeEntry({ timestamp: new Date("2025-01-15T12:01:00Z") }));

  const snapshot = chain.entries();
  const result = await verifyAuditChain("wrong-secret", snapshot);
  assertEquals(result.ok, false);
  if (!result.ok) {
    assertEquals(result.error.includes("HMAC mismatch"), true);
  }
});

// ---------------------------------------------------------------------------
// Standalone verifyAuditChain
// ---------------------------------------------------------------------------

Deno.test("verifyAuditChain: empty array is valid", async () => {
  const result = await verifyAuditChain("any-secret", []);
  assertEquals(result.ok, true);
});

Deno.test("verifyAuditChain: valid entries from chain pass", async () => {
  const chain = createAuditChain("shared-secret");
  await chain.append(makeEntry());
  await chain.append(makeEntry({ timestamp: new Date("2025-01-15T12:01:00Z") }));
  await chain.append(makeEntry({ timestamp: new Date("2025-01-15T12:02:00Z") }));

  const result = await verifyAuditChain("shared-secret", chain.entries());
  assertEquals(result.ok, true);
});

Deno.test("verifyAuditChain: detects out-of-order index", async () => {
  const chain = createAuditChain("test-secret");
  await chain.append(makeEntry());
  await chain.append(makeEntry({ timestamp: new Date("2025-01-15T12:01:00Z") }));

  const snapshot = chain.entries() as ChainedAuditEntry[];
  // Swap the index on the second entry
  const tampered: ChainedAuditEntry[] = snapshot.map((e, i) => {
    if (i === 1) {
      return { ...e, index: 99 };
    }
    return e;
  });

  const result = await verifyAuditChain("test-secret", tampered);
  assertEquals(result.ok, false);
  if (!result.ok) {
    assertEquals(result.error.includes("expected index"), true);
  }
});

// ---------------------------------------------------------------------------
// Determinism
// ---------------------------------------------------------------------------

Deno.test("append: same entry and secret produce same hash", async () => {
  const entry = makeEntry();

  const chain1 = createAuditChain("deterministic-secret");
  const chained1 = await chain1.append(entry);

  const chain2 = createAuditChain("deterministic-secret");
  const chained2 = await chain2.append(entry);

  assertEquals(chained1.hash, chained2.hash);
});

Deno.test("append: different secrets produce different hashes", async () => {
  const entry = makeEntry();

  const chain1 = createAuditChain("secret-a");
  const chained1 = await chain1.append(entry);

  const chain2 = createAuditChain("secret-b");
  const chained2 = await chain2.append(entry);

  // Hashes should differ — technically could collide but astronomically unlikely
  assertEquals(chained1.hash !== chained2.hash, true);
});

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------

Deno.test("append: entries with nested objects are chained correctly", async () => {
  const chain = createAuditChain("test-secret");
  const entry: AuditEntry = {
    timestamp: new Date("2025-01-15T12:00:00Z"),
    nested: { a: 1, b: { c: "deep" } },
    list: [1, 2, 3],
  };

  await chain.append(entry);
  const result = await chain.verify();
  assertEquals(result.ok, true);
});

Deno.test("append: entry with only timestamp is valid", async () => {
  const chain = createAuditChain("test-secret");
  await chain.append({ timestamp: new Date() });

  const result = await chain.verify();
  assertEquals(result.ok, true);
});

Deno.test("verify: removing an entry from the middle breaks chain", async () => {
  const chain = createAuditChain("test-secret");
  await chain.append(makeEntry());
  await chain.append(makeEntry({ timestamp: new Date("2025-01-15T12:01:00Z") }));
  await chain.append(makeEntry({ timestamp: new Date("2025-01-15T12:02:00Z") }));

  const snapshot = chain.entries() as ChainedAuditEntry[];
  // Remove middle entry
  const withoutMiddle = [snapshot[0], snapshot[2]];

  const result = await verifyAuditChain("test-secret", withoutMiddle);
  assertEquals(result.ok, false);
});
