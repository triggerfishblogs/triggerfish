#!/usr/bin/env -S deno run --allow-read --allow-write
/**
 * Reef Registry: PR Validation Script
 *
 * Validates skill submissions in pull requests. Parses frontmatter,
 * checks required fields, runs the security scanner, and computes checksums.
 *
 * Usage: deno run --allow-read --allow-write scripts/validate-skill.ts <skill-dir>
 *
 * Exit codes:
 *   0 — All skills valid
 *   1 — Validation failed (details printed to stderr)
 */

import { parse as parseYaml } from "@std/yaml";
import { join } from "@std/path";

/** Required frontmatter fields for a valid skill submission. */
const REQUIRED_FIELDS = [
  "name",
  "version",
  "description",
  "author",
  "tags",
  "category",
  "classification_ceiling",
] as const;

/** Valid classification levels. */
const VALID_CLASSIFICATIONS = new Set([
  "PUBLIC",
  "INTERNAL",
  "CONFIDENTIAL",
  "RESTRICTED",
]);

/** Prompt injection patterns (subset of Triggerfish scanner). */
const CRITICAL_PATTERNS = [
  /ignore\s+(all\s+)?previous\s+instructions/i,
  /system\s+prompt\s+override/i,
  /bypass\s+(security|policy|classification|restrictions)/i,
  /you\s+are\s+now\s+(a|an)\s/i,
  /reveal\s+(all\s+)?(your\s+)?(secrets|credentials|keys|passwords)/i,
  /atob\s*\(/i,
  /[\u200B-\u200D\uFEFF\u2060]/,
  /base64\s+-d|echo\s+\S+\s*\|\s*(?:bash|sh)/i,
];

interface ValidationResult {
  readonly valid: boolean;
  readonly errors: readonly string[];
  readonly warnings: readonly string[];
}

/** Compute SHA-256 hex digest of content. */
async function computeChecksum(content: string): Promise<string> {
  const data = new TextEncoder().encode(content);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Extract YAML frontmatter from SKILL.md content. */
function extractFrontmatter(
  content: string,
): Record<string, unknown> | null {
  const match = content.match(/^---\n([\s\S]*?)(?:\n---|\n\.\.\.)/);
  if (!match) return null;
  try {
    return parseYaml(match[1]) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/** Validate a single skill directory. */
async function validateSkill(skillDir: string): Promise<ValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  const skillMdPath = join(skillDir, "SKILL.md");
  let content: string;
  try {
    content = await Deno.readTextFile(skillMdPath);
  } catch {
    return { valid: false, errors: [`SKILL.md not found in ${skillDir}`], warnings: [] };
  }

  const raw = extractFrontmatter(content);
  if (!raw) {
    return { valid: false, errors: ["SKILL.md missing YAML frontmatter"], warnings: [] };
  }

  // Check required fields
  for (const field of REQUIRED_FIELDS) {
    if (!raw[field]) {
      errors.push(`Missing required field: ${field}`);
    }
  }

  // Validate classification_ceiling
  if (raw.classification_ceiling && !VALID_CLASSIFICATIONS.has(String(raw.classification_ceiling))) {
    errors.push(`Invalid classification_ceiling: ${raw.classification_ceiling}`);
  }

  // Validate tags is an array
  if (raw.tags && !Array.isArray(raw.tags)) {
    errors.push("Field 'tags' must be an array");
  }

  // Security scan
  for (const pattern of CRITICAL_PATTERNS) {
    if (pattern.test(content)) {
      errors.push(`Security scan failed: matched critical pattern`);
      break;
    }
  }

  // Compute and write metadata if valid
  if (errors.length === 0) {
    const checksum = await computeChecksum(content);
    const metadata = {
      name: raw.name,
      version: raw.version,
      description: raw.description,
      author: raw.author,
      tags: raw.tags,
      category: raw.category,
      classificationCeiling: raw.classification_ceiling,
      checksum,
      publishedAt: new Date().toISOString(),
      requiresTools: raw.requires_tools ?? null,
      networkDomains: raw.network_domains ?? null,
    };
    await Deno.writeTextFile(
      join(skillDir, "metadata.json"),
      JSON.stringify(metadata, null, 2),
    );
  }

  return { valid: errors.length === 0, errors, warnings };
}

// ─── Main ────────────────────────────────────────────────────────────────────

if (import.meta.main) {
  const skillDir = Deno.args[0];
  if (!skillDir) {
    console.error("Usage: validate-skill.ts <skill-directory>");
    Deno.exit(1);
  }

  const result = await validateSkill(skillDir);

  if (result.warnings.length > 0) {
    for (const w of result.warnings) {
      console.warn(`⚠ ${w}`);
    }
  }

  if (!result.valid) {
    for (const e of result.errors) {
      console.error(`✗ ${e}`);
    }
    Deno.exit(1);
  }

  console.log("✓ Skill validation passed");
}
