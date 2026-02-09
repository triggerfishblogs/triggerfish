/**
 * Skill discovery and loading.
 *
 * Discovers skills from multiple directories (bundled, managed, workspace),
 * parses SKILL.md frontmatter, and applies priority rules for conflict resolution.
 *
 * @module
 */

import { parse as parseYaml } from "@std/yaml";
import type { ClassificationLevel } from "../core/types/classification.ts";
import { parseClassification } from "../core/types/classification.ts";

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

/**
 * Create a skill loader that discovers skills from configured directories.
 *
 * Skills are directories containing a SKILL.md file with YAML frontmatter.
 * When multiple directories contain a skill with the same name, the priority
 * order determines which one wins (default: workspace > managed > bundled).
 */
export function createSkillLoader(options: SkillLoaderOptions): SkillLoader {
  const priority: readonly SkillSource[] = options.priority ?? [
    "workspace",
    "managed",
    "bundled",
  ];
  const dirTypes: Readonly<Record<string, SkillSource>> = options.dirTypes ?? {};

  /** Determine source type for a directory. */
  function getSourceType(dir: string): SkillSource {
    if (dirTypes[dir]) return dirTypes[dir];
    return "bundled";
  }

  /** Get priority index (lower = higher priority). */
  function getPriority(source: SkillSource): number {
    const idx = priority.indexOf(source);
    return idx >= 0 ? idx : priority.length;
  }

  return {
    async discover(): Promise<readonly Skill[]> {
      const skillsByName = new Map<string, Skill>();

      for (const dir of options.directories) {
        const source = getSourceType(dir);
        let entries: AsyncIterable<Deno.DirEntry>;
        try {
          entries = Deno.readDir(dir);
        } catch {
          continue;
        }

        for await (const entry of entries) {
          if (!entry.isDirectory) continue;

          const skillDir = `${dir}/${entry.name}`;
          const skillMdPath = `${skillDir}/SKILL.md`;

          let content: string;
          try {
            content = await Deno.readTextFile(skillMdPath);
          } catch {
            continue;
          }

          const frontmatter = parseFrontmatter(content);
          if (!frontmatter || !frontmatter.name) continue;

          const classResult = parseClassification(
            frontmatter.classification_ceiling ?? "PUBLIC",
          );
          const ceiling: ClassificationLevel = classResult.ok
            ? classResult.value
            : "PUBLIC";

          const skill: Skill = {
            name: frontmatter.name,
            description: frontmatter.description ?? "",
            classificationCeiling: ceiling,
            requiresTools: frontmatter.requires_tools ?? [],
            networkDomains: frontmatter.network_domains ?? [],
            path: skillDir,
            source,
          };

          const existing = skillsByName.get(skill.name);
          if (
            !existing ||
            getPriority(source) < getPriority(existing.source)
          ) {
            skillsByName.set(skill.name, skill);
          }
        }
      }

      return [...skillsByName.values()];
    },
  };
}
