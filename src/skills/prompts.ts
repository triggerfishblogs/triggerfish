/**
 * System prompt builders for skills and triggers.
 *
 * Generates the system prompt sections injected into the agent context
 * for discovered skills and TRIGGER.md awareness.
 * @module
 */

import { join } from "@std/path";
import type { Skill } from "./loader.ts";

/** Build a system prompt section listing discovered skills. */
export function buildSkillsSystemPrompt(skills: readonly Skill[]): string {
  if (skills.length === 0) return "";

  const rows = skills.map((s) =>
    `| ${s.name} | ${s.description} | ${join(s.path, "SKILL.md")} |`
  ).join("\n");

  return `## Available Skills

You have the following skills available. To use a skill, read its SKILL.md file with read_file for detailed instructions. Do NOT search for skill files — the paths below are exact.

| Skill | Description | Path |
|-------|-------------|------|
${rows}

When a task matches a skill, use read_file to load the skill's SKILL.md for detailed guidance before proceeding.`;
}

/** Build a system prompt section about TRIGGER.md awareness. */
export function buildTriggersSystemPrompt(baseDir: string): string {
  return `## Triggers (Proactive Monitoring)

Your TRIGGER.md file is at ${
    join(baseDir, "TRIGGER.md")
  }. It defines what you proactively monitor and act on during periodic trigger wakeups. Use read_file to see current triggers, and edit_file/write_file to modify them. For full documentation on the TRIGGER.md format, read the "triggers" skill.`;
}
