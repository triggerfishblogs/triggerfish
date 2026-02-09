/**
 * Agent self-authoring for skills.
 *
 * Enables agents to create new skills in their workspace directory,
 * with an approval workflow requiring owner confirmation before activation.
 *
 * @module
 */

import type { ClassificationLevel, Result } from "../core/types/classification.ts";
import { CLASSIFICATION_ORDER } from "../core/types/classification.ts";

/** Skill authoring status. */
export type SkillApprovalStatus = "PENDING_APPROVAL" | "APPROVED" | "REJECTED";

/** Authored skill metadata. */
export interface AuthoredSkill {
  /** Skill name. */
  readonly name: string;
  /** Skill description. */
  readonly description: string;
  /** Classification ceiling for the skill. */
  readonly classificationCeiling: ClassificationLevel;
  /** Required tools. */
  readonly requiresTools: readonly string[];
  /** Network domains. */
  readonly networkDomains: readonly string[];
  /** Approval status. */
  readonly status: SkillApprovalStatus;
  /** Path where the skill was created. */
  readonly path: string;
}

/** Options for creating a skill author. */
export interface SkillAuthorOptions {
  /** Workspace skills directory. */
  readonly skillsDir: string;
  /** Maximum classification ceiling the user allows. */
  readonly userCeiling: ClassificationLevel;
}

/** Skill author interface. */
export interface SkillAuthor {
  /** Create a new skill in the workspace. Returns PENDING_APPROVAL. */
  create(options: {
    readonly name: string;
    readonly description: string;
    readonly classificationCeiling: ClassificationLevel;
    readonly requiresTools?: readonly string[];
    readonly networkDomains?: readonly string[];
    readonly content: string;
  }): Promise<Result<AuthoredSkill, string>>;
}

/**
 * Create a skill author for agent self-authoring.
 *
 * Authored skills are placed in the workspace skills directory
 * and start in PENDING_APPROVAL status. The classification ceiling
 * cannot exceed the user's configured ceiling.
 */
export function createSkillAuthor(options: SkillAuthorOptions): SkillAuthor {
  return {
    async create(createOptions): Promise<Result<AuthoredSkill, string>> {
      const { name, description, classificationCeiling, content } = createOptions;
      const requiresTools = createOptions.requiresTools ?? [];
      const networkDomains = createOptions.networkDomains ?? [];

      // Validate classification ceiling does not exceed user's ceiling
      if (
        CLASSIFICATION_ORDER[classificationCeiling] >
        CLASSIFICATION_ORDER[options.userCeiling]
      ) {
        return {
          ok: false,
          error: `Classification ceiling ${classificationCeiling} exceeds user ceiling ${options.userCeiling}`,
        };
      }

      const skillDir = `${options.skillsDir}/${name}`;

      try {
        await Deno.mkdir(skillDir, { recursive: true });
      } catch {
        return { ok: false, error: `Failed to create skill directory: ${skillDir}` };
      }

      const frontmatter = [
        "---",
        `name: ${name}`,
        `description: ${description}`,
        `classification_ceiling: ${classificationCeiling}`,
        `requires_tools: [${requiresTools.join(", ")}]`,
        `network_domains: [${networkDomains.join(", ")}]`,
        `status: PENDING_APPROVAL`,
        "---",
      ].join("\n");

      const skillMd = `${frontmatter}\n${content}`;

      try {
        await Deno.writeTextFile(`${skillDir}/SKILL.md`, skillMd);
      } catch {
        return { ok: false, error: `Failed to write SKILL.md` };
      }

      return {
        ok: true,
        value: {
          name,
          description,
          classificationCeiling,
          requiresTools,
          networkDomains,
          status: "PENDING_APPROVAL",
          path: skillDir,
        },
      };
    },
  };
}
