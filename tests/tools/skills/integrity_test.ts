/**
 * Tests for skill integrity verification (SHA-256 hashing).
 *
 * Covers hash computation, record storage, and tamper detection.
 */
import { assert, assertEquals } from "@std/assert";
import {
  computeSkillHash,
  loadSkillHashRecord,
  recordSkillHash,
  verifySkillIntegrity,
} from "../../../src/tools/skills/integrity.ts";

Deno.test("computeSkillHash: returns consistent hex string for same content", async () => {
  const hash1 = await computeSkillHash("hello world");
  const hash2 = await computeSkillHash("hello world");
  assertEquals(hash1, hash2);
});

Deno.test("computeSkillHash: returns different hash for different content", async () => {
  const hash1 = await computeSkillHash("hello world");
  const hash2 = await computeSkillHash("hello world!");
  assert(hash1 !== hash2);
});

Deno.test("computeSkillHash: returns 64-character hex string (SHA-256)", async () => {
  const hash = await computeSkillHash("test content");
  assertEquals(hash.length, 64);
  assert(/^[0-9a-f]{64}$/.test(hash));
});

Deno.test("recordSkillHash + loadSkillHashRecord: round-trips all fields correctly", async () => {
  const tmpDir = await Deno.makeTempDir();
  try {
    await recordSkillHash(tmpDir, "test-skill", "abc123def456", "reef");
    const record = await loadSkillHashRecord(tmpDir);
    assert(record !== null);
    assertEquals(record!.skillName, "test-skill");
    assertEquals(record!.contentHash, "abc123def456");
    assertEquals(record!.source, "reef");
    assertEquals(typeof record!.recordedAt, "string");
    // Verify it's a valid ISO 8601 date
    assert(!isNaN(Date.parse(record!.recordedAt)));
  } finally {
    await Deno.remove(tmpDir, { recursive: true });
  }
});

Deno.test("verifySkillIntegrity: returns null when no hash record (no enforcement)", async () => {
  const tmpDir = await Deno.makeTempDir();
  try {
    const result = await verifySkillIntegrity(tmpDir, "anyhash");
    assertEquals(result, null);
  } finally {
    await Deno.remove(tmpDir, { recursive: true });
  }
});

Deno.test("verifySkillIntegrity: returns true when hash matches stored record", async () => {
  const tmpDir = await Deno.makeTempDir();
  try {
    const hash = await computeSkillHash("skill content here");
    await recordSkillHash(tmpDir, "my-skill", hash, "local");
    const result = await verifySkillIntegrity(tmpDir, hash);
    assertEquals(result, true);
  } finally {
    await Deno.remove(tmpDir, { recursive: true });
  }
});

Deno.test("verifySkillIntegrity: returns false when hash does not match (tampered content)", async () => {
  const tmpDir = await Deno.makeTempDir();
  try {
    const originalHash = await computeSkillHash("original content");
    await recordSkillHash(tmpDir, "my-skill", originalHash, "reef");
    const tamperedHash = await computeSkillHash("tampered content");
    const result = await verifySkillIntegrity(tmpDir, tamperedHash);
    assertEquals(result, false);
  } finally {
    await Deno.remove(tmpDir, { recursive: true });
  }
});
