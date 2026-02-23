/**
 * Skill context tracker — tracks the currently active skill per session.
 *
 * The tracker is created once per session and shared between the skill tool
 * executor (which sets the active skill on read_skill) and the orchestrator
 * (which reads it to filter available tools and restrict network access).
 *
 * @module
 */

import type { Skill } from "./loader.ts";

/** Tracks the currently active skill for a session. */
export interface SkillContextTracker {
  /** Set the currently active skill. Pass null to deactivate. */
  setActive(skill: Skill | null): void;
  /** Get the currently active skill, or null if none is active. */
  getActive(): Skill | null;
}

/**
 * Create a skill context tracker for per-session skill activation tracking.
 *
 * The tracker is intentionally mutable (set by the skill tool executor,
 * read by the orchestrator loop) and per-session (not shared across sessions).
 */
export function createSkillContextTracker(): SkillContextTracker {
  let activeSkill: Skill | null = null;
  return {
    setActive(skill: Skill | null): void {
      activeSkill = skill;
    },
    getActive(): Skill | null {
      return activeSkill;
    },
  };
}
