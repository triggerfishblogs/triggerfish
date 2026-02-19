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

  const typeLabel = (source: string): string =>
    source === "bundled" ? "BUNDLED" : "USER_PROVIDED";

  const rows = skills.map((s) =>
    `| ${s.name} | ${s.description} | ${typeLabel(s.source)} |`
  ).join("\n");

  return `## Available Skills

You have the following skills available. To use a skill, call read_skill with the skill name and type for detailed instructions.

| Skill | Description | Type |
|-------|-------------|------|
${rows}

When a task matches a skill, use read_skill to load it for detailed guidance before proceeding.`;
}

/** Build a system prompt section about TRIGGER.md awareness. */
export function buildTriggersSystemPrompt(baseDir: string): string {
  return `## Triggers (Proactive Monitoring)

Your TRIGGER.md file is at ${
    join(baseDir, "TRIGGER.md")
  }. It defines what you proactively monitor and act on during periodic trigger wakeups. Use read_file to see current triggers, and edit_file/write_file to modify them. For full documentation on the TRIGGER.md format, use read_skill to load the "triggers" skill.`;
}
