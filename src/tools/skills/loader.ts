/**
 * Skill discovery and loading.
 *
 * Discovers skills from multiple directories (bundled, managed, workspace),
 * parses SKILL.md frontmatter, and applies priority rules for conflict resolution.
 *
 * @module
 */

import { join } from "@std/path";
import { resolveWithinJail } from "../../core/security/path_jail.ts";
import { sanitizePathForPrompt } from "../../core/security/path_sanitization.ts";
import { parse as parseYaml } from "@std/yaml";
import type { ClassificationLevel } from "../../core/types/classification.ts";
import { parseClassification } from "../../core/types/classification.ts";

/** Source type indicating where a skill was discovered. */
export type SkillSource = "bundled" | "managed" | "workspace";

/** Parsed skill definition from SKILL.md frontmatter. */
export interface Skill {
  /** Skill name from frontmatter. */
  readonly name: string;
  /** Skill description. */
  readonly description: string;
  /** Maximum classification level this skill can access. */
  readonly classificationCeiling: ClassificationLevel;
  /** Tools required by this skill. */
  readonly requiresTools: readonly string[];
  /** Network domains this skill needs access to. */
  readonly networkDomains: readonly string[];
  /** Filesystem path to the skill directory. */
  readonly path: string;
  /** Source type (bundled, managed, workspace). */
  readonly source: SkillSource;
}

/** Options for creating a skill loader. */
export interface SkillLoaderOptions {
  /** Directories to scan for skills. */
  readonly directories: readonly string[];
  /** Priority order for conflict resolution (first = highest priority). */
  readonly priority?: readonly SkillSource[];
  /** Map of directory path to source type. */
  readonly dirTypes?: Readonly<Record<string, SkillSource>>;
}

/** Skill loader interface for discovering and loading skills. */
export interface SkillLoader {
  /** Discover all skills from configured directories. */
  discover(): Promise<readonly Skill[]>;
}

/** Raw frontmatter shape parsed from SKILL.md. */
interface SkillFrontmatter {
  readonly name?: string;
  readonly description?: string;
  readonly classification_ceiling?: string;
  readonly requires_tools?: readonly string[];
  readonly network_domains?: readonly string[];
}

/**
 * Parse SKILL.md content into frontmatter and body.
 *
 * Expects YAML frontmatter delimited by `---` at the top of the file.
 */
function parseFrontmatter(content: string): SkillFrontmatter | null {
  const match = content.match(/^---\n([\s\S]*?)(?:\n---|\n\.\.\.)/);
  if (!match) return null;
  try {
    return parseYaml(match[1]) as SkillFrontmatter;
  } catch {
    return null;
  }
}

/** Determine source type for a directory from the type map. */
function resolveSkillSourceType(
  dir: string,
  dirTypes: Readonly<Record<string, SkillSource>>,
): SkillSource {
  return dirTypes[dir] ?? "bundled";
}

/** Compute priority index (lower = higher priority). */
function computeSkillPriority(
  source: SkillSource,
  priority: readonly SkillSource[],
): number {
  const idx = priority.indexOf(source);
  return idx >= 0 ? idx : priority.length;
}

/** Build a Skill from parsed frontmatter. Returns null if frontmatter is invalid. */
function buildSkillFromFrontmatter(
  frontmatter: SkillFrontmatter | null,
  skillDir: string,
  source: SkillSource,
): Skill | null {
  if (!frontmatter || !frontmatter.name) return null;

  const classResult = parseClassification(
    frontmatter.classification_ceiling ?? "PUBLIC",
  );
  const ceiling: ClassificationLevel = classResult.ok
    ? classResult.value
    : "PUBLIC";

  return {
    name: frontmatter.name,
    description: frontmatter.description ?? "",
    classificationCeiling: ceiling,
    requiresTools: frontmatter.requires_tools ?? [],
    networkDomains: frontmatter.network_domains ?? [],
    path: skillDir,
    source,
  };
}

/** Scan a single directory for skills and merge into the map by priority. */
async function scanSkillDirectory(
  dir: string,
  source: SkillSource,
  priority: readonly SkillSource[],
  skillsByName: Map<string, Skill>,
): Promise<void> {
  try {
    for await (const entry of Deno.readDir(dir)) {
      if (!entry.isDirectory || entry.isSymlink) continue;
      const sanitizedName = sanitizePathForPrompt(entry.name);
      if (sanitizedName.length === 0) continue;
      const jailResult = resolveWithinJail(dir, sanitizedName);
      if (!jailResult.ok) continue;
      const skillDir = jailResult.value;
      let content: string;
      try {
        content = await Deno.readTextFile(join(skillDir, "SKILL.md"));
      } catch {
        continue;
      }
      const skill = buildSkillFromFrontmatter(
        parseFrontmatter(content),
        skillDir,
        source,
      );
      if (!skill) continue;
      const existing = skillsByName.get(skill.name);
      const shouldReplace = !existing ||
        computeSkillPriority(source, priority) <
          computeSkillPriority(existing.source, priority);
      if (shouldReplace) skillsByName.set(skill.name, skill);
    }
  } catch {
    // Directory doesn't exist or isn't readable — skip
  }
}

/**
 * Create a skill loader that discovers skills from configured directories.
 *
 * Skills are directories containing a SKILL.md file with YAML frontmatter.
 * When multiple directories contain a skill with the same name, the priority
 * order determines which one wins (default: workspace > managed > bundled).
 */
export function createSkillLoader(options: SkillLoaderOptions): SkillLoader {
  const priority = options.priority ?? ["workspace", "managed", "bundled"];
  const dirTypes = options.dirTypes ?? {};

  return {
    async discover(): Promise<readonly Skill[]> {
      const skillsByName = new Map<string, Skill>();
      for (const dir of options.directories) {
        const source = resolveSkillSourceType(dir, dirTypes);
        await scanSkillDirectory(dir, source, priority, skillsByName);
      }
      return [...skillsByName.values()];
    },
  };
}
