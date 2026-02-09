/**
 * Skills platform module.
 *
 * Provides skill discovery, security scanning, marketplace integration,
 * and agent self-authoring capabilities.
 *
 * @module
 */

export { createSkillLoader } from "./loader.ts";
export type { Skill, SkillLoader, SkillLoaderOptions, SkillSource } from "./loader.ts";

export { createSkillScanner } from "./scanner.ts";
export type { ScanResult, SkillScanner } from "./scanner.ts";

export { createReefRegistry } from "./registry.ts";
export type {
  ReefRegistry,
  ReefRegistryOptions,
  ReefSearchOptions,
  ReefSkillListing,
} from "./registry.ts";

export { createSkillAuthor } from "./author.ts";
export type {
  AuthoredSkill,
  SkillApprovalStatus,
  SkillAuthor,
  SkillAuthorOptions,
} from "./author.ts";
