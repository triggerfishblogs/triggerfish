#!/usr/bin/env -S deno run --allow-read --allow-write
/**
 * Reef Registry: PR Validation Script
 *
 * Validates skill and plugin submissions in pull requests. For skills, parses
 * SKILL.md frontmatter, checks required fields, and runs the security scanner.
 * For plugins, validates metadata.json and mod.ts presence.
 *
 * Usage:
 *   deno run --allow-read --allow-write scripts/validate-skill.ts <dir>
 *
 * The script auto-detects whether the directory is a skill (contains SKILL.md)
 * or a plugin (contains mod.ts + metadata.json).
 *
 * Exit codes:
 *   0 — Validation passed
 *   1 — Validation failed (details printed to stderr)
 */

import { parse as parseYaml } from "@std/yaml";
import { join } from "@std/path";

/** Required frontmatter fields for a valid skill submission. */
const SKILL_REQUIRED_FIELDS = [
  "name",
  "version",
  "description",
  "author",
  "tags",
  "category",
  "classification_ceiling",
] as const;

/** Required metadata fields for a valid plugin submission. */
const PLUGIN_REQUIRED_FIELDS = [
  "name",
  "version",
  "description",
  "author",
  "classification",
  "trust",
] as const;

/** Valid classification levels. */
const VALID_CLASSIFICATIONS = new Set([
  "PUBLIC",
  "INTERNAL",
  "CONFIDENTIAL",
  "RESTRICTED",
]);

/** Valid plugin trust levels. */
const VALID_TRUST_LEVELS = new Set([
  "sandboxed",
  "semi-trusted",
  "trusted",
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
  readonly kind: "skill" | "plugin";
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

/** Check if a file exists. */
async function fileExists(path: string): Promise<boolean> {
  try {
    const stat = await Deno.stat(path);
    return stat.isFile;
  } catch {
    return false;
  }
}

/** Run security scan patterns against content. */
function scanForInjection(content: string): string[] {
  const findings: string[] = [];
  for (const pattern of CRITICAL_PATTERNS) {
    if (pattern.test(content)) {
      findings.push("Security scan failed: matched critical pattern");
      break;
    }
  }
  return findings;
}

/** Validate a skill submission directory. */
async function validateSkill(
  skillDir: string,
): Promise<ValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  const skillMdPath = join(skillDir, "SKILL.md");
  let content: string;
  try {
    content = await Deno.readTextFile(skillMdPath);
  } catch {
    return {
      valid: false,
      errors: [`SKILL.md not found in ${skillDir}`],
      warnings: [],
      kind: "skill",
    };
  }

  const raw = extractFrontmatter(content);
  if (!raw) {
    return {
      valid: false,
      errors: ["SKILL.md missing YAML frontmatter"],
      warnings: [],
      kind: "skill",
    };
  }

  // Check required fields
  for (const field of SKILL_REQUIRED_FIELDS) {
    if (!raw[field]) {
      errors.push(`Missing required field: ${field}`);
    }
  }

  // Validate classification_ceiling
  if (
    raw.classification_ceiling &&
    !VALID_CLASSIFICATIONS.has(String(raw.classification_ceiling))
  ) {
    errors.push(
      `Invalid classification_ceiling: ${raw.classification_ceiling}`,
    );
  }

  // Validate tags is an array
  if (raw.tags && !Array.isArray(raw.tags)) {
    errors.push("Field 'tags' must be an array");
  }

  // Security scan
  errors.push(...scanForInjection(content));

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

  return { valid: errors.length === 0, errors, warnings, kind: "skill" };
}

/** Validate a plugin submission directory. */
async function validatePlugin(
  pluginDir: string,
): Promise<ValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check mod.ts exists
  const modPath = join(pluginDir, "mod.ts");
  let modContent: string;
  try {
    modContent = await Deno.readTextFile(modPath);
  } catch {
    return {
      valid: false,
      errors: [`mod.ts not found in ${pluginDir}`],
      warnings: [],
      kind: "plugin",
    };
  }

  // Check metadata.json exists
  const metadataPath = join(pluginDir, "metadata.json");
  let metadataContent: string;
  try {
    metadataContent = await Deno.readTextFile(metadataPath);
  } catch {
    return {
      valid: false,
      errors: [`metadata.json not found in ${pluginDir}`],
      warnings: [],
      kind: "plugin",
    };
  }

  let raw: Record<string, unknown>;
  try {
    raw = JSON.parse(metadataContent);
  } catch {
    return {
      valid: false,
      errors: ["metadata.json is not valid JSON"],
      warnings: [],
      kind: "plugin",
    };
  }

  // Check required fields
  for (const field of PLUGIN_REQUIRED_FIELDS) {
    if (!raw[field]) {
      errors.push(`Missing required metadata field: ${field}`);
    }
  }

  // Validate classification
  if (
    raw.classification &&
    !VALID_CLASSIFICATIONS.has(String(raw.classification))
  ) {
    errors.push(`Invalid classification: ${raw.classification}`);
  }

  // Validate trust level
  if (raw.trust && !VALID_TRUST_LEVELS.has(String(raw.trust))) {
    errors.push(`Invalid trust level: ${raw.trust}`);
  }

  // Security scan on mod.ts
  errors.push(...scanForInjection(modContent));

  // Compute and update checksum
  if (errors.length === 0) {
    const checksum = await computeChecksum(modContent);
    const updatedMetadata = { ...raw, checksum };
    await Deno.writeTextFile(
      metadataPath,
      JSON.stringify(updatedMetadata, null, 2),
    );
  }

  return { valid: errors.length === 0, errors, warnings, kind: "plugin" };
}

/** Auto-detect submission type and validate. */
async function validateSubmission(
  dir: string,
): Promise<ValidationResult> {
  const hasSkillMd = await fileExists(join(dir, "SKILL.md"));
  const hasModTs = await fileExists(join(dir, "mod.ts"));

  if (hasSkillMd) return validateSkill(dir);
  if (hasModTs) return validatePlugin(dir);

  return {
    valid: false,
    errors: [
      `Directory ${dir} contains neither SKILL.md (skill) nor mod.ts (plugin)`,
    ],
    warnings: [],
    kind: "skill",
  };
}

// ─── Main ────────────────────────────────────────────────────────────────────

if (import.meta.main) {
  const dir = Deno.args[0];
  if (!dir) {
    console.error("Usage: validate-skill.ts <directory>");
    Deno.exit(1);
  }

  const result = await validateSubmission(dir);

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

  console.log(`✓ ${result.kind} validation passed`);
}
