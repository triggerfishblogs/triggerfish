/**
 * The Reef registry client.
 *
 * Provides search, download, install, update, and publish operations
 * for the Triggerfish skill marketplace.
 *
 * @module
 */

import type { Result } from "../core/types/classification.ts";

/** Skill listing from The Reef registry. */
export interface ReefSkillListing {
  /** Skill name. */
  readonly name: string;
  /** Skill description. */
  readonly description: string;
  /** Skill version. */
  readonly version: string;
  /** Author identifier. */
  readonly author: string;
  /** Tags for categorization. */
  readonly tags: readonly string[];
  /** Category. */
  readonly category: string;
  /** Download count. */
  readonly downloads: number;
}

/** Options for searching The Reef. */
export interface ReefSearchOptions {
  /** Search query (name, tag, or category). */
  readonly query: string;
  /** Maximum results to return. */
  readonly limit?: number;
}

/** The Reef registry client interface. */
export interface ReefRegistry {
  /** Search skills by name, tag, or category. */
  search(options: ReefSearchOptions): Promise<Result<readonly ReefSkillListing[], string>>;
  /** Download and install a skill to the managed directory. */
  install(name: string, targetDir: string): Promise<Result<string, string>>;
  /** Check for available updates. */
  checkUpdates(installedSkills: readonly { readonly name: string; readonly version?: string }[]): Promise<Result<readonly string[], string>>;
  /** Publish a skill to The Reef. */
  publish(skillPath: string): Promise<Result<string, string>>;
}

/** Options for creating a Reef registry client. */
export interface ReefRegistryOptions {
  /** Base URL for The Reef API. */
  readonly baseUrl?: string;
}

/**
 * Create a Reef registry client.
 *
 * Connects to The Reef marketplace for skill discovery and management.
 * Falls back gracefully when the registry is unavailable.
 */
export function createReefRegistry(options?: ReefRegistryOptions): ReefRegistry {
  const _baseUrl = options?.baseUrl ?? "https://reef.triggerfish.dev/api/v1";

  return {
    async search(searchOptions: ReefSearchOptions): Promise<Result<readonly ReefSkillListing[], string>> {
      // Registry is not yet deployed; return empty results
      void searchOptions;
      return { ok: true, value: [] };
    },

    async install(name: string, targetDir: string): Promise<Result<string, string>> {
      void targetDir;
      return { ok: false, error: `Skill "${name}" not found in The Reef` };
    },

    async checkUpdates(
      installedSkills: readonly { readonly name: string; readonly version?: string }[],
    ): Promise<Result<readonly string[], string>> {
      void installedSkills;
      return { ok: true, value: [] };
    },

    async publish(skillPath: string): Promise<Result<string, string>> {
      void skillPath;
      return { ok: false, error: "The Reef publishing is not yet available" };
    },
  };
}
