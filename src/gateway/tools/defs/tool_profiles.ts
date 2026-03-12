/**
 * Tool profiles, system prompt mappings, and resolution functions.
 *
 * A profile is an ordered list of tool group names, assembled for
 * a specific runtime context (CLI, tidepool, trigger, cron, subagent).
 *
 * @module
 */

import { TODO_SYSTEM_PROMPT } from "../../../tools/mod.ts";
import { MEMORY_SYSTEM_PROMPT } from "../../../tools/memory/mod.ts";
import { SECRET_TOOLS_SYSTEM_PROMPT } from "../../../tools/secrets.ts";
import { WEB_TOOLS_SYSTEM_PROMPT } from "../../../tools/web/mod.ts";
import { PLAN_SYSTEM_PROMPT } from "../../../agent/plan/tools.ts";
import { TIDEPOOL_SYSTEM_PROMPT } from "../../../tools/tidepool/mod.ts";
import { SESSION_TOOLS_SYSTEM_PROMPT } from "../session/session_tools.ts";
import { IMAGE_TOOLS_SYSTEM_PROMPT } from "../../../tools/image/mod.ts";
import { EXPLORE_SYSTEM_PROMPT } from "../../../tools/explore/mod.ts";
import {
  LLM_TASK_SYSTEM_PROMPT,
  RELEASE_NOTES_SYSTEM_PROMPT,
  SUMMARIZE_SYSTEM_PROMPT,
} from "../../../tools/mod.ts";
import { TRIGGER_TOOLS_SYSTEM_PROMPT } from "../trigger/trigger_tools.ts";
import { TRIGGER_MANAGE_SYSTEM_PROMPT } from "../trigger/trigger_manage_defs.ts";
import { CLAUDE_SESSION_SYSTEM_PROMPT } from "../../../exec/claude.ts";
import { LOG_READER_SYSTEM_PROMPT } from "../../../tools/log_reader_tool.ts";
import { GITHUB_TOOLS_SYSTEM_PROMPT } from "../../../integrations/github/mod.ts";
import { OBSIDIAN_SYSTEM_PROMPT } from "../../../tools/obsidian/mod.ts";
import { HEALTHCHECK_SYSTEM_PROMPT } from "../../../tools/healthcheck.ts";
import { SIMULATE_SYSTEM_PROMPT } from "../../../tools/simulate/mod.ts";
import { TEAM_SYSTEM_PROMPT } from "../../../agent/team/mod.ts";
import { WORKFLOW_SYSTEM_PROMPT } from "../../../workflow/mod.ts";
import { SSH_SYSTEM_PROMPT } from "../../../tools/ssh/mod.ts";
import { TOOL_GROUPS, type ToolGroupName } from "./tool_groups.ts";
import type { ToolDefinition } from "../../../core/types/tool.ts";

// ─── Tool profiles ──────────────────────────────────────────────────────────

/** A tool profile is an ordered list of group names. */
export type ToolProfile = readonly ToolGroupName[];

/** Pre-built profiles for common contexts. */
export const TOOL_PROFILES: Readonly<Record<string, ToolProfile>> = {
  /** Tidepool web UI — full tool access including canvas. */
  tidepool: [
    "exec_file",
    "exec_command",
    "todo",
    "memory",
    "secrets",
    "web",
    "plan",
    "browser",
    "tidepool",
    "sessions",
    "signal",
    "image",
    "explore",
    "google",
    "github",
    "caldav",
    "notion",
    "obsidian",
    "llmTask",
    "summarize",
    "healthcheck",
    "trigger",
    "triggerManage",
    "claude",
    "skills",
    "releaseNotes",
    "logReader",
    "agents",
    "cron",
    "simulate",
    "team",
    "workflow",
    "ssh",
  ],
  /** CLI chat — everything except tidepool canvas tools. */
  cli: [
    "exec_file",
    "exec_command",
    "todo",
    "memory",
    "secrets",
    "web",
    "plan",
    "browser",
    "sessions",
    "signal",
    "image",
    "explore",
    "google",
    "github",
    "caldav",
    "notion",
    "obsidian",
    "llmTask",
    "summarize",
    "healthcheck",
    "trigger",
    "triggerManage",
    "claude",
    "skills",
    "releaseNotes",
    "logReader",
    "agents",
    "cron",
    "simulate",
    "team",
    "workflow",
    "ssh",
  ],
  /** Trigger sessions — sandboxed file tools only, no run_command. */
  triggerSession: [
    "exec_file",
    "todo",
    "memory",
    "web",
    "google",
    "github",
    "caldav",
    "notion",
    "llmTask",
    "summarize",
    "healthcheck",
    "trigger",
    "skills",
    "cron",
    "simulate",
    "workflow",
  ],
  /** Cron jobs — sandboxed file tools only, no run_command. */
  cronJob: [
    "exec_file",
    "todo",
    "memory",
    "web",
    "google",
    "github",
    "caldav",
    "notion",
    "llmTask",
    "summarize",
    "healthcheck",
    "skills",
    "cron",
    "simulate",
    "workflow",
  ],
  /** Subagents — sandboxed file tools only, no run_command. */
  subagent: [
    "exec_file",
    "todo",
    "memory",
    "web",
    "google",
    "github",
    "caldav",
    "notion",
    "llmTask",
    "summarize",
    "healthcheck",
    "skills",
  ],
};

/** Name of a pre-built tool profile. */
export type ToolProfileName = keyof typeof TOOL_PROFILES;

/**
 * Resolve a profile to its tool definitions.
 *
 * Accepts either a profile name (string key into TOOL_PROFILES) or
 * an ad-hoc list of group names for custom profiles.
 */
export function resolveToolsForProfile(
  profile: ToolProfileName | ToolProfile,
): readonly ToolDefinition[] {
  const groups: ToolProfile = typeof profile === "string"
    ? TOOL_PROFILES[profile] ?? []
    : profile;
  return groups.flatMap((g) => [...TOOL_GROUPS[g]()]);
}

// ─── System prompt sections per group ───────────────────────────────────────

/**
 * Map tool groups to their system prompt section (if any).
 *
 * Groups without a dedicated system prompt section (exec, browser, google,
 * agents, cron, caldav, skills) are omitted — the tool descriptions
 * in the JSON schema are sufficient.
 */
export const TOOL_GROUP_PROMPTS: Partial<
  Readonly<Record<ToolGroupName, string>>
> = {
  todo: TODO_SYSTEM_PROMPT,
  web: WEB_TOOLS_SYSTEM_PROMPT,
  memory: MEMORY_SYSTEM_PROMPT,
  plan: PLAN_SYSTEM_PROMPT,
  tidepool: TIDEPOOL_SYSTEM_PROMPT,
  sessions: SESSION_TOOLS_SYSTEM_PROMPT,
  image: IMAGE_TOOLS_SYSTEM_PROMPT,
  explore: EXPLORE_SYSTEM_PROMPT,
  llmTask: LLM_TASK_SYSTEM_PROMPT,
  summarize: SUMMARIZE_SYSTEM_PROMPT,
  claude: CLAUDE_SESSION_SYSTEM_PROMPT,
  secrets: SECRET_TOOLS_SYSTEM_PROMPT,
  trigger: TRIGGER_TOOLS_SYSTEM_PROMPT,
  triggerManage: TRIGGER_MANAGE_SYSTEM_PROMPT,
  releaseNotes: RELEASE_NOTES_SYSTEM_PROMPT,
  logReader: LOG_READER_SYSTEM_PROMPT,
  github: GITHUB_TOOLS_SYSTEM_PROMPT,
  obsidian: OBSIDIAN_SYSTEM_PROMPT,
  healthcheck: HEALTHCHECK_SYSTEM_PROMPT,
  simulate: SIMULATE_SYSTEM_PROMPT,
  team: TEAM_SYSTEM_PROMPT,
  workflow: WORKFLOW_SYSTEM_PROMPT,
  ssh: SSH_SYSTEM_PROMPT,
};

/**
 * Get system prompt sections for a profile.
 *
 * Returns only the prompts for groups included in the profile,
 * filtering out groups that have no dedicated prompt section.
 */
export function resolvePromptsForProfile(
  profile: ToolProfileName | ToolProfile,
): readonly string[] {
  const groups: ToolProfile = typeof profile === "string"
    ? TOOL_PROFILES[profile] ?? []
    : profile;
  return groups
    .map((g) => TOOL_GROUP_PROMPTS[g])
    .filter((p): p is string => p !== undefined && p.length > 0);
}

// ─── Service availability gating ─────────────────────────────────────────────

/** Which external services are configured and have credentials available. */
export interface ServiceAvailability {
  /** Google Workspace (keychain google:tokens). */
  readonly google: boolean;
  /** GitHub (keychain github-pat). */
  readonly github: boolean;
  /** CalDAV (config caldav.enabled). */
  readonly caldav: boolean;
  /** Notion (keychain notion-api-key). */
  readonly notion: boolean;
  /** Obsidian (config plugins.obsidian.enabled). */
  readonly obsidian: boolean;
  /** Signal channel (config channels.signal). */
  readonly signal: boolean;
  /** Telegram channel (config channels.telegram.botToken). */
  readonly telegram: boolean;
  /** Discord channel (config channels.discord). */
  readonly discord: boolean;
  /** WhatsApp channel (config channels.whatsapp). */
  readonly whatsapp: boolean;
}

/** Map from ServiceAvailability keys to the tool group names they gate. */
const SERVICE_TO_GROUP: Readonly<
  Partial<Record<keyof ServiceAvailability, ToolGroupName>>
> = {
  google: "google",
  github: "github",
  caldav: "caldav",
  notion: "notion",
  obsidian: "obsidian",
  signal: "signal",
};

/**
 * Remove tool groups for unconfigured services from a profile.
 *
 * Only groups listed in SERVICE_TO_GROUP are filtered — core groups
 * (sessions, memory, web, etc.) are never removed.
 */
export function filterProfileByAvailability(
  profile: ToolProfile,
  availability: ServiceAvailability,
): ToolProfile {
  const unavailableGroups = new Set<ToolGroupName>();
  for (
    const [service, group] of Object.entries(SERVICE_TO_GROUP) as [
      keyof ServiceAvailability,
      ToolGroupName,
    ][]
  ) {
    if (!availability[service]) {
      unavailableGroups.add(group);
    }
  }
  return profile.filter((g) => !unavailableGroups.has(g));
}

/** Human-readable setup instructions per service. */
const SERVICE_SETUP_HINTS: Readonly<
  Record<keyof ServiceAvailability, string>
> = {
  google: "Google Workspace — run `triggerfish connect google`",
  github: "GitHub — run `triggerfish connect github`",
  caldav: "CalDAV — set `caldav.enabled: true` in triggerfish.yaml",
  notion: "Notion — run `triggerfish connect notion`",
  obsidian:
    "Obsidian — set `plugins.obsidian.enabled: true` in triggerfish.yaml",
  signal: "Signal — configure `channels.signal` in triggerfish.yaml",
  telegram: "Telegram — configure `channels.telegram` in triggerfish.yaml",
  discord: "Discord — configure `channels.discord` in triggerfish.yaml",
  whatsapp: "WhatsApp — configure `channels.whatsapp` in triggerfish.yaml",
};

/**
 * Build a system prompt section listing unconfigured services.
 *
 * Returns an empty string if all services are configured.
 */
export function buildUnconfiguredServicesPrompt(
  availability: ServiceAvailability,
): string {
  const lines: string[] = [];
  for (
    const [service, hint] of Object.entries(SERVICE_SETUP_HINTS) as [
      keyof ServiceAvailability,
      string,
    ][]
  ) {
    if (!availability[service]) {
      lines.push(`  • ${hint}`);
    }
  }
  if (lines.length === 0) return "";
  return [
    "## Unconfigured Services",
    "",
    "The following integrations are available but not yet configured:",
    ...lines,
    "",
    "Tell the user about these when relevant to their request.",
  ].join("\n");
}

// ─── Backward-compatible getToolDefinitions ─────────────────────────────────

/**
 * Get all tool definitions (full set including tidepool).
 *
 * @deprecated Use `resolveToolsForProfile("cli")` or another profile instead.
 * Kept for backward compatibility — returns the "tidepool" profile (all tools).
 */
export function getToolDefinitions(): readonly ToolDefinition[] {
  return resolveToolsForProfile("tidepool");
}
