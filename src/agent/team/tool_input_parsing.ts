/**
 * Team tool input parsing — member definitions and validation.
 *
 * Parses and validates LLM-provided input for team tool calls,
 * including individual member definitions and the members array.
 *
 * @module
 */

import type { ClassificationLevel } from "../../core/types/classification.ts";
import { parseClassification } from "../../core/types/classification.ts";
import type { TeamMemberDefinition } from "./types.ts";

/** Parse a member definition from LLM input. */
export function parseMemberInput(
  raw: Record<string, unknown>,
): TeamMemberDefinition | string {
  const role = raw.role;
  if (typeof role !== "string" || role.length === 0) {
    return "Member role must be a non-empty string";
  }

  const description = raw.description;
  if (typeof description !== "string" || description.length === 0) {
    return "Member description must be a non-empty string";
  }

  const isLead = raw.is_lead === true;
  const model = typeof raw.model === "string" ? raw.model : undefined;
  const initialTask = typeof raw.initial_task === "string"
    ? raw.initial_task
    : undefined;

  let classificationCeiling: ClassificationLevel | undefined;
  if (typeof raw.classification_ceiling === "string") {
    const parsed = parseClassification(raw.classification_ceiling);
    if (!parsed.ok) return parsed.error;
    classificationCeiling = parsed.value;
  }

  return {
    role,
    description,
    isLead,
    model,
    classificationCeiling,
    initialTask,
  };
}

/** Parse members array from LLM input. */
export function parseMembersInput(
  raw: unknown,
): readonly TeamMemberDefinition[] | string {
  if (!Array.isArray(raw) || raw.length === 0) {
    return "Members must be a non-empty array";
  }

  const members: TeamMemberDefinition[] = [];
  for (const item of raw) {
    if (typeof item !== "object" || item === null) {
      return "Each member must be an object";
    }
    const parsed = parseMemberInput(item as Record<string, unknown>);
    if (typeof parsed === "string") return parsed;
    members.push(parsed);
  }

  return members;
}

/** Min/max bounds for timeout values (seconds). */
const MIN_TIMEOUT_SECONDS = 60;
const MAX_TIMEOUT_SECONDS = 86_400;

/** Clamp a timeout value to safe bounds. */
export function clampTimeout(value: number): number {
  return Math.max(
    MIN_TIMEOUT_SECONDS,
    Math.min(MAX_TIMEOUT_SECONDS, Math.floor(value)),
  );
}
