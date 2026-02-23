/**
 * Skill content integrity verification.
 *
 * Computes and verifies SHA-256 hashes of SKILL.md content to detect
 * tampering between install time and activation time.
 *
 * Hash records are written alongside the skill directory as `.skill-hash.json`
 * during installation from The Reef. At activation time, the current content
 * hash is compared against the stored record to detect unauthorized edits.
 *
 * Bundled skills and locally-authored skills without hash records are not
 * subject to integrity enforcement (verifySkillIntegrity returns null).
 *
 * @module
 */

import { join } from "@std/path";

/** Filename for stored integrity hash records. */
const HASH_FILENAME = ".skill-hash.json";

/**
 * Compute SHA-256 hash of skill content.
 *
 * Uses the Web Crypto API available in Deno.
 * Returns a lowercase hex string of the SHA-256 digest.
 */
export async function computeSkillHash(content: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Stored hash record written at install time. */
export interface SkillHashRecord {
  /** Skill name from frontmatter. */
  readonly skillName: string;
  /** SHA-256 hex hash of SKILL.md content at install time. */
  readonly contentHash: string;
  /** ISO 8601 timestamp when the hash was recorded. */
  readonly recordedAt: string;
  /** Whether this skill came from the marketplace or a local install. */
  readonly source: "reef" | "local";
}

/**
 * Record the install-time hash of a skill.
 *
 * Writes `.skill-hash.json` alongside the skill's SKILL.md directory.
 * Called during skill installation from The Reef.
 */
export async function recordSkillHash(
  skillDir: string,
  skillName: string,
  contentHash: string,
  source: "reef" | "local",
): Promise<void> {
  const record: SkillHashRecord = {
    skillName,
    contentHash,
    recordedAt: new Date().toISOString(),
    source,
  };
  await Deno.writeTextFile(
    join(skillDir, HASH_FILENAME),
    JSON.stringify(record, null, 2),
  );
}

/**
 * Load the stored hash record for a skill directory.
 *
 * Returns null if no hash record exists (bundled skills, pre-hash installs).
 */
export async function loadSkillHashRecord(
  skillDir: string,
): Promise<SkillHashRecord | null> {
  try {
    const text = await Deno.readTextFile(join(skillDir, HASH_FILENAME));
    return JSON.parse(text) as SkillHashRecord;
  } catch {
    return null;
  }
}

/**
 * Verify a skill's current content against its stored install-time hash.
 *
 * Returns null if no hash record exists (no enforcement for un-hashed skills).
 * Returns true if the hash matches (content is unmodified).
 * Returns false if the hash does not match (content has been tampered with).
 */
export async function verifySkillIntegrity(
  skillDir: string,
  currentHash: string,
): Promise<boolean | null> {
  const record = await loadSkillHashRecord(skillDir);
  if (!record) return null;
  return record.contentHash === currentHash;
}
