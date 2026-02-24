/**
 * Skill-related types shared across modules.
 *
 * Provides interfaces for skill listings, registry operations, and loader
 * options that CLI commands and other modules need without importing from
 * tools/ or gateway/ directly.
 *
 * @module
 */

import type { ClassificationLevel, Result } from "./classification.ts";

/** Skill listing from The Reef registry. */
export interface ReefSkillListing {
  /** Skill name. */
  readonly name: string;
  /** Skill description. */
  readonly description: string;
  /** Skill version (semver). */
  readonly version: string;
  /** Author identifier. */
  readonly author: string;
  /** Tags for categorization. */
  readonly tags: readonly string[];
  /** Category. */
  readonly category: string;
  /** Download count (always 0 for static registry). */
  readonly downloads: number;
  /** Maximum classification level this skill can access. */
  readonly classificationCeiling: ClassificationLevel;
  /** SHA-256 hex digest of SKILL.md content. */
  readonly checksum: string;
  /** ISO 8601 publish timestamp. */
  readonly publishedAt: string;
}

/** Options for searching The Reef. */
export interface ReefSearchOptions {
  /** Search query (matches name, tag, category, or description). */
  readonly query: string;
  /** Maximum results to return (default: 20). */
  readonly limit?: number;
}

/** The Reef registry client interface. */
export interface ReefRegistry {
  /** Search skills by name, tag, category, or description. */
  search(
    options: ReefSearchOptions,
  ): Promise<Result<readonly ReefSkillListing[], string>>;
  /** Download and install a skill to the managed directory. */
  install(name: string, targetDir: string): Promise<Result<string, string>>;
  /** Check for available updates against the catalog. */
  checkUpdates(
    installedSkills: readonly {
      readonly name: string;
      readonly version?: string;
    }[],
  ): Promise<Result<readonly string[], string>>;
  /** Validate a skill locally and generate publish directory structure. */
  publish(skillPath: string): Promise<Result<string, string>>;
}

/** Source type indicating where a skill was discovered. */
export type SkillSource = "bundled" | "managed" | "workspace";

/** Discovered skill summary returned by SkillLoader. */
export interface DiscoveredSkill {
  /** Skill name from frontmatter. */
  readonly name: string;
  /** Skill version (semver). */
  readonly version: string;
  /** Skill description. */
  readonly description: string;
  /** Maximum classification level this skill can access. */
  readonly classificationCeiling: ClassificationLevel;
  /** Source type (bundled, managed, workspace). */
  readonly source: SkillSource;
}

/** Skill loader interface for discovering installed skills. */
export interface SkillLoader {
  /** Discover all skills from configured directories. */
  discover(): Promise<readonly DiscoveredSkill[]>;
}
