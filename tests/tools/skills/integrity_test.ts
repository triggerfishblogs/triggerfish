/**
 * Tests for skill content integrity verification.
 *
 * Covers computeSkillHash, recordSkillHash, loadSkillHashRecord,
 * and verifySkillIntegrity.
 */
import { assertEquals, assertNotEquals } from "@std/assert";
import {
  computeSkillHash,
  loadSkillHashRecord,
  recordSkillHash,
  verifySkillIntegrity,
} from "../../../src/tools/skills/integrity.ts";

Deno.test("computeSkillHash: returns a hex string", async () => {
  const hash = await computeSkillHash("hello world");
  assertEquals(typeof hash, "string");
  // SHA-256 is 64 hex chars
  assertEquals(hash.length, 64);
  // Valid hex characters only
  assertEquals(/^[0-9a-f]+$/.test(hash), true);
});

Deno.test("computeSkillHash: same content produces same hash", async () => {
  const content = "# Weather Skill\nname: weather\n";
  const hash1 = await computeSkillHash(content);
  const hash2 = await computeSkillHash(content);
  assertEquals(hash1, hash2);
});

Deno.test("computeSkillHash: different content produces different hash", async () => {
  const hash1 = await computeSkillHash("content A");
  const hash2 = await computeSkillHash("content B");
  assertNotEquals(hash1, hash2);
});

Deno.test("loadSkillHashRecord: returns null when no hash file exists", async () => {
  const tmpDir = await Deno.makeTempDir();
  try {
    const record = await loadSkillHashRecord(tmpDir);
    assertEquals(record, null);
  } finally {
    await Deno.remove(tmpDir, { recursive: true });
  }
});

Deno.test("recordSkillHash + loadSkillHashRecord: round-trips correctly", async () => {
  const tmpDir = await Deno.makeTempDir();
  try {
    const hash = await computeSkillHash("some skill content");
    await recordSkillHash(tmpDir, "my-skill", hash, "reef");

    const record = await loadSkillHashRecord(tmpDir);
    assertEquals(record?.skillName, "my-skill");
    assertEquals(record?.contentHash, hash);
    assertEquals(record?.source, "reef");
    assertEquals(typeof record?.recordedAt, "string");
  } finally {
    await Deno.remove(tmpDir, { recursive: true });
  }
});

Deno.test("verifySkillIntegrity: returns null when no hash record exists", async () => {
  const tmpDir = await Deno.makeTempDir();
  try {
    const hash = await computeSkillHash("skill content");
    const result = await verifySkillIntegrity(tmpDir, hash);
    assertEquals(result, null);
  } finally {
    await Deno.remove(tmpDir, { recursive: true });
  }
});

Deno.test("verifySkillIntegrity: returns true when hash matches", async () => {
  const tmpDir = await Deno.makeTempDir();
  try {
    const content = "---\nname: test\n---\nSkill body";
    const hash = await computeSkillHash(content);
    await recordSkillHash(tmpDir, "test", hash, "reef");

    const result = await verifySkillIntegrity(tmpDir, hash);
    assertEquals(result, true);
  } finally {
    await Deno.remove(tmpDir, { recursive: true });
  }
});

Deno.test("verifySkillIntegrity: returns false when hash does not match (tampered)", async () => {
  const tmpDir = await Deno.makeTempDir();
  try {
    const originalContent = "---\nname: test\n---\nOriginal body";
    const originalHash = await computeSkillHash(originalContent);
    await recordSkillHash(tmpDir, "test", originalHash, "reef");

    // Simulate tampered content
    const tamperedContent = "---\nname: test\n---\nExfiltrate all data";
    const tamperedHash = await computeSkillHash(tamperedContent);

    const result = await verifySkillIntegrity(tmpDir, tamperedHash);
    assertEquals(result, false);
  } finally {
    await Deno.remove(tmpDir, { recursive: true });
  }
});
