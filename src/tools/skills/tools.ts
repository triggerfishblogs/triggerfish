/**
 * Skill tools — LLM-callable operations for reading skills.
 *
 * Provides the `read_skill` tool which reads SKILL.md content from
 * bundled or user-provided skills WITHOUT escalating session taint.
 *
 * Regular `read_file` triggers path-based classification and may escalate
 * session taint. `read_skill` bypasses this by accessing skills through
 * the skill loader abstraction, which is classification-neutral.
 *
 * Security checks applied at activation time (when a skill is found):
 *   1. Classification ceiling — session taint must canFlowTo skill ceiling
 *   2. Integrity check — SHA-256 hash verified against install-time record
 *   3. Scanner check — content scanned for injection/obfuscation patterns
 *
 * @module
 */

import { join } from "@std/path";
import type { ToolDefinition } from "../../core/types/tool.ts";
import type { ClassificationLevel } from "../../core/types/classification.ts";
import type { Skill, SkillLoader } from "./loader.ts";
import type { SkillContextTracker } from "./context.ts";
import type { SkillScanner } from "./scanner.ts";
import { checkSkillClassificationCeiling } from "./enforcer.ts";
import { computeSkillHash, verifySkillIntegrity } from "./integrity.ts";

/** Skill type argument accepted by read_skill. */
export type SkillType = "BUNDLED" | "USER_PROVIDED";

/** Context required by the skill tool executor. */
export interface SkillToolContext {
  /** Skill loader used to discover available skills. */
  readonly skillLoader: SkillLoader;
  /**
   * Tracker updated when a skill is activated.
   * When provided, sets the active skill after all security checks pass.
   */
  readonly skillContextTracker?: SkillContextTracker;
  /**
   * Getter for the current session taint level.
   * When provided, classification ceiling enforcement is applied.
   */
  readonly getSessionTaint?: () => ClassificationLevel;
  /**
   * Scanner for validating skill content at activation time.
   * When provided, content is scanned before the skill is activated.
   */
  readonly skillScanner?: SkillScanner;
}

function buildReadSkillDef(): ToolDefinition {
  return {
    name: "read_skill",
    description:
      "Read the full content of a skill (SKILL.md) by type and name. " +
      "Use this to learn what a skill does, how to activate it, and what " +
      "tools it requires. Reading a skill never escalates the session " +
      "security level — use this instead of read_file when you need to " +
      "inspect skill instructions. " +
      "type must be BUNDLED (skills shipped with Triggerfish) or " +
      "USER_PROVIDED (skills installed or authored by the user).",
    parameters: {
      type: {
        type: "string",
        description: "Skill source type: BUNDLED or USER_PROVIDED",
        required: true,
        enum: ["BUNDLED", "USER_PROVIDED"],
      },
      skill_name: {
        type: "string",
        description:
          "Name of the skill to read (e.g. 'weather', 'deep-research')",
        required: true,
      },
    },
  };
}

/** Tool definitions for skill reading operations. */
export function getSkillToolDefinitions(): readonly ToolDefinition[] {
  return [buildReadSkillDef()];
}

/** Validate classification ceiling for skill activation. Returns error string or null. */
function validateClassificationCeiling(
  ctx: SkillToolContext,
  skill: Skill,
): string | null {
  if (!ctx.getSessionTaint) return null;
  return checkSkillClassificationCeiling(ctx.getSessionTaint(), skill);
}

/** Validate skill content integrity against stored hash. Returns error string or null. */
async function validateSkillIntegrity(
  skillPath: string,
  content: string,
  skillName: string,
): Promise<string | null> {
  const currentHash = await computeSkillHash(content);
  const integrityResult = await verifySkillIntegrity(skillPath, currentHash);
  if (integrityResult === false) {
    return `Skill "${skillName}" content has been tampered with. Reinstall from The Reef.`;
  }
  return null;
}

/** Validate skill content using the scanner. Returns error string or null. */
async function validateSkillContent(
  ctx: SkillToolContext,
  content: string,
  skillName: string,
): Promise<string | null> {
  if (!ctx.skillScanner) return null;
  const scanResult = await ctx.skillScanner.scan(content);
  if (!scanResult.ok) {
    return `Skill "${skillName}" failed security scan: ${
      scanResult.warnings.join("; ")
    }`;
  }
  return null;
}

/**
 * Create a tool executor for skill reading operations.
 *
 * Returns null for unknown tool names (allowing chaining with other executors).
 *
 * Reading a skill does NOT escalate session taint. The executor deliberately
 * takes no sessionTaint parameter — taint decisions belong in the orchestrator
 * layer, not in this tool. Skills are capability metadata, not classified data.
 *
 * @param ctx - Context containing the skill loader and optional security hooks
 */
export function createSkillToolExecutor(
  ctx: SkillToolContext,
): (name: string, input: Record<string, unknown>) => Promise<string | null> {
  return async (
    name: string,
    input: Record<string, unknown>,
  ): Promise<string | null> => {
    if (name !== "read_skill") return null;

    const type = input.type;
    const skillName = input.skill_name;

    if (
      typeof type !== "string" ||
      (type !== "BUNDLED" && type !== "USER_PROVIDED")
    ) {
      return "Error: read_skill requires 'type' to be BUNDLED or USER_PROVIDED.";
    }

    if (typeof skillName !== "string" || skillName.trim().length === 0) {
      return "Error: read_skill requires a non-empty 'skill_name' argument.";
    }

    const trimmedName = skillName.trim();
    const skills = await ctx.skillLoader.discover();

    const matchesType = type === "BUNDLED"
      ? (s: { source: string }) => s.source === "bundled"
      : (s: { source: string }) =>
        s.source === "managed" || s.source === "workspace";

    const skill = skills.find(
      (s) => s.name === trimmedName && matchesType(s),
    );

    if (!skill) {
      const available = skills
        .filter(matchesType)
        .map((s) => s.name)
        .sort()
        .join(", ");
      return JSON.stringify({
        found: false,
        skill_name: trimmedName,
        type,
        available: available || "(none)",
      });
    }

    // ── Security check 1: Classification ceiling ──────────────────────────
    const ceilingError = validateClassificationCeiling(ctx, skill);
    if (ceilingError) return `Error: ${ceilingError}`;

    // Read the SKILL.md content from disk
    const skillMdPath = join(skill.path, "SKILL.md");
    let content: string;
    try {
      content = await Deno.readTextFile(skillMdPath);
    } catch (err) {
      return `Error: Failed to read skill "${trimmedName}": ${
        err instanceof Error ? err.message : String(err)
      }`;
    }

    // ── Security check 2: Content integrity verification ──────────────────
    const integrityError = await validateSkillIntegrity(
      skill.path,
      content,
      trimmedName,
    );
    if (integrityError) return `Error: ${integrityError}`;

    // ── Security check 3: Content security scan ───────────────────────────
    const scanError = await validateSkillContent(ctx, content, trimmedName);
    if (scanError) return `Error: ${scanError}`;

    // ── Activate skill in context tracker ─────────────────────────────────
    ctx.skillContextTracker?.setActive(skill);

    return JSON.stringify({
      found: true,
      skill_name: skill.name,
      type,
      source: skill.source,
      classification_ceiling: skill.classificationCeiling,
      requires_tools: skill.requiresTools,
      network_domains: skill.networkDomains,
      content,
    });
  };
}
