/**
 * Runtime enforcement for skill security declarations.
 *
 * Pure functions for enforcing the three runtime security constraints declared
 * in SKILL.md frontmatter:
 *   - Tool restriction via `requires_tools`
 *   - Network domain restriction via `network_domains`
 *   - Classification ceiling via `classification_ceiling`
 *
 * All functions are side-effect-free and deterministic — same input always
 * produces the same result. No LLM calls, no I/O.
 *
 * @module
 */

import type { Skill } from "./loader.ts";
import type { ToolDefinition } from "../../core/types/tool.ts";
import { canFlowTo } from "../../core/types/classification.ts";
import type { ClassificationLevel } from "../../core/types/classification.ts";

/**
 * Filter tool definitions to only those declared in the active skill's
 * `requires_tools` list. Always preserves `read_skill` to allow skill switching.
 *
 * Returns the original list unchanged if:
 * - `activeSkill` is null (no skill active)
 * - `requiresTools` is empty (empty list means no restriction)
 */
export function filterToolsForActiveSkill(
  tools: readonly ToolDefinition[],
  activeSkill: Skill | null,
): readonly ToolDefinition[] {
  if (!activeSkill || activeSkill.requiresTools.length === 0) return tools;
  const allowed = new Set(activeSkill.requiresTools);
  return tools.filter((t) => t.name === "read_skill" || allowed.has(t.name));
}

/**
 * Check whether a URL's hostname is allowed by the active skill's
 * `network_domains` declaration.
 *
 * Returns null if the URL is allowed (no restriction, or domain matches).
 * Returns an error string if the domain is blocked.
 *
 * Domain matching: exact hostname match or suffix match
 * (e.g. "api.example.com" matches declared domain "example.com").
 */
export function checkSkillNetworkDomain(
  url: string,
  activeSkill: Skill | null,
): string | null {
  if (!activeSkill || activeSkill.networkDomains.length === 0) return null;
  let hostname: string;
  try {
    hostname = new URL(url).hostname;
  } catch {
    return `Domain check failed: invalid URL "${url}"`;
  }
  const allowed = activeSkill.networkDomains.some(
    (d) => hostname === d || hostname.endsWith(`.${d}`),
  );
  if (!allowed) {
    return (
      `Domain "${hostname}" is not in this skill's declared network_domains. ` +
      `Skill "${activeSkill.name}" may only access: ${
        activeSkill.networkDomains.join(", ")
      }`
    );
  }
  return null;
}

/**
 * Check whether a session's current taint allows activation of a skill
 * with the given classification ceiling.
 *
 * A CONFIDENTIAL-tainted session cannot activate a PUBLIC-ceiling skill —
 * the skill's instructions could be a write-down vector.
 *
 * Rule: sessionTaint must canFlowTo skill.classificationCeiling.
 *
 * Returns null if activation is permitted, or an error string if blocked.
 */
export function checkSkillClassificationCeiling(
  sessionTaint: ClassificationLevel,
  skill: Skill,
): string | null {
  if (!canFlowTo(sessionTaint, skill.classificationCeiling)) {
    return (
      `Skill "${skill.name}" has classification ceiling ` +
      `${skill.classificationCeiling} but session taint is ${sessionTaint}. ` +
      `Skill cannot be activated in this session.`
    );
  }
  return null;
}
