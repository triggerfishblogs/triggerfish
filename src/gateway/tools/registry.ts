/**
 * Tool definitions, groups, profiles, and system prompt mappings.
 *
 * Tool definitions are organized into composable **groups**. Groups are
 * assembled into **profiles** (cli, tidepool, triggerSession, cronJob,
 * subagent) so each context gets only the tools it actually needs —
 * saving tokens and avoiding dead-tool confusion.
 *
 * @module
 */

import { getTodoToolDefinitions, TODO_SYSTEM_PROMPT } from "../../tools/mod.ts";
import {
  getMemoryToolDefinitions,
  MEMORY_SYSTEM_PROMPT,
} from "../../tools/memory/mod.ts";
import {
  getSecretToolDefinitions,
  SECRET_TOOLS_SYSTEM_PROMPT,
} from "../../tools/secrets.ts";
import {
  getWebToolDefinitions,
  WEB_TOOLS_SYSTEM_PROMPT,
} from "../../tools/web/mod.ts";
import {
  getPlanToolDefinitions,
  PLAN_SYSTEM_PROMPT,
} from "../../agent/plan/tools.ts";
import { getBrowserToolDefinitions } from "../../tools/browser/mod.ts";
import {
  getTidepoolToolDefinitions,
  TIDEPOOL_SYSTEM_PROMPT,
} from "../../tools/tidepool/mod.ts";
import {
  getSessionToolDefinitions,
  SESSION_TOOLS_SYSTEM_PROMPT,
} from "./session_tools.ts";
import {
  getImageToolDefinitions,
  IMAGE_TOOLS_SYSTEM_PROMPT,
} from "../../tools/image/mod.ts";
import {
  EXPLORE_SYSTEM_PROMPT,
  getExploreToolDefinitions,
} from "../../tools/explore/mod.ts";
import { getGoogleToolDefinitions } from "../../integrations/google/mod.ts";
import { getGitHubToolDefinitions } from "../../integrations/github/mod.ts";
import { getObsidianToolDefinitions } from "../../tools/obsidian/mod.ts";
import {
  getHealthcheckToolDefinitions,
  getLlmTaskToolDefinitions,
  getSummarizeToolDefinitions,
  LLM_TASK_SYSTEM_PROMPT,
  SUMMARIZE_SYSTEM_PROMPT,
} from "../../tools/mod.ts";
import {
  getTriggerToolDefinitions,
  TRIGGER_TOOLS_SYSTEM_PROMPT,
} from "./trigger_tools.ts";
import {
  CLAUDE_SESSION_SYSTEM_PROMPT,
  getClaudeToolDefinitions,
} from "../../exec/claude.ts";
import { getSkillToolDefinitions } from "../../tools/skills/mod.ts";
import type { ToolDefinition } from "../../core/types/tool.ts";

// ─── Inline tool definition groups ─────────────────────────────────────────

function buildReadFileDef(): ToolDefinition {
  return {
    name: "read_file",
    description: "Read the contents of a file at an absolute path.",
    parameters: {
      path: {
        type: "string",
        description: "Absolute file path to read",
        required: true,
      },
    },
  };
}

function buildWriteFileDef(): ToolDefinition {
  return {
    name: "write_file",
    description: "Write content to a file at a workspace-relative path.",
    parameters: {
      path: {
        type: "string",
        description: "Relative path in the workspace",
        required: true,
      },
      content: {
        type: "string",
        description: "File content to write",
        required: true,
      },
    },
  };
}

function buildListDirectoryDef(): ToolDefinition {
  return {
    name: "list_directory",
    description: "List files and directories at a given absolute path.",
    parameters: {
      path: {
        type: "string",
        description: "Absolute directory path to list",
        required: true,
      },
    },
  };
}

function buildRunCommandDef(): ToolDefinition {
  return {
    name: "run_command",
    description: "Run a shell command in the agent workspace directory.",
    parameters: {
      command: {
        type: "string",
        description: "Shell command to execute",
        required: true,
      },
    },
  };
}

function buildSearchFilesDef(): ToolDefinition {
  return {
    name: "search_files",
    description:
      "Search for files matching a glob pattern, or search file contents with grep.",
    parameters: {
      path: {
        type: "string",
        description: "Directory to search in",
        required: true,
      },
      pattern: {
        type: "string",
        description:
          "Glob pattern for file names, or text/regex to search within files",
        required: true,
      },
      content_search: {
        type: "boolean",
        description: "If true, search file contents instead of file names",
        required: false,
      },
    },
  };
}

function buildEditFileDef(): ToolDefinition {
  return {
    name: "edit_file",
    description:
      "Replace a unique string in a file. old_text must appear exactly once in the file.",
    parameters: {
      path: {
        type: "string",
        description: "Absolute file path to edit",
        required: true,
      },
      old_text: {
        type: "string",
        description: "Exact text to find (must be unique in file)",
        required: true,
      },
      new_text: {
        type: "string",
        description: "Replacement text",
        required: true,
      },
    },
  };
}

/** Filesystem tools: read_file, write_file, list_directory, run_command, search_files, edit_file. */
function getExecInlineDefinitions(): readonly ToolDefinition[] {
  return [
    buildReadFileDef(),
    buildWriteFileDef(),
    buildListDirectoryDef(),
    buildRunCommandDef(),
    buildSearchFilesDef(),
    buildEditFileDef(),
  ];
}

/** Agent meta-tools: subagent, agents_list. */
function getAgentInlineDefinitions(): readonly ToolDefinition[] {
  return [
    {
      name: "subagent",
      description:
        "Spawn a sub-agent for an autonomous multi-step task. Returns the result when complete.",
      parameters: {
        task: {
          type: "string",
          description: "What the sub-agent should accomplish",
          required: true,
        },
        tools: {
          type: "string",
          description:
            "Comma-separated tool whitelist (default: read-only tools)",
          required: false,
        },
      },
    },
    {
      name: "agents_list",
      description: "List configured LLM providers/agents.",
      parameters: {},
    },
  ];
}

function buildCronCreateDef(): ToolDefinition {
  return {
    name: "cron_create",
    description:
      "Create a scheduled cron job. The task runs on the given cron schedule.",
    parameters: {
      expression: {
        type: "string",
        description: "5-field cron expression (e.g. '0 9 * * *' for 9am daily)",
        required: true,
      },
      task: {
        type: "string",
        description: "The task/prompt to execute on each trigger",
        required: true,
      },
      classification: {
        type: "string",
        description:
          "Classification ceiling: PUBLIC, INTERNAL, CONFIDENTIAL, or RESTRICTED",
        required: false,
      },
    },
  };
}

function buildCronListDef(): ToolDefinition {
  return {
    name: "cron_list",
    description:
      "List all registered cron jobs with their schedules and status.",
    parameters: {},
  };
}

function buildCronDeleteDef(): ToolDefinition {
  return {
    name: "cron_delete",
    description: "Delete a cron job by its ID.",
    parameters: {
      job_id: {
        type: "string",
        description: "The UUID of the cron job to delete",
        required: true,
      },
    },
  };
}

function buildCronHistoryDef(): ToolDefinition {
  return {
    name: "cron_history",
    description: "Show recent execution history for a cron job.",
    parameters: {
      job_id: {
        type: "string",
        description: "The UUID of the cron job",
        required: true,
      },
    },
  };
}

/** Cron scheduling tools: cron_create, cron_list, cron_delete, cron_history. */
function getCronInlineDefinitions(): readonly ToolDefinition[] {
  return [
    buildCronCreateDef(),
    buildCronListDef(),
    buildCronDeleteDef(),
    buildCronHistoryDef(),
  ];
}

// ─── Tool groups ────────────────────────────────────────────────────────────

/** Composable tool groups — each returns a focused set of ToolDefinitions. */
export const TOOL_GROUPS = {
  exec: getExecInlineDefinitions,
  todo: getTodoToolDefinitions,
  memory: getMemoryToolDefinitions,
  secrets: getSecretToolDefinitions,
  web: getWebToolDefinitions,
  plan: getPlanToolDefinitions,
  browser: getBrowserToolDefinitions,
  tidepool: getTidepoolToolDefinitions,
  sessions: getSessionToolDefinitions,
  image: getImageToolDefinitions,
  explore: getExploreToolDefinitions,
  google: getGoogleToolDefinitions,
  github: getGitHubToolDefinitions,
  obsidian: getObsidianToolDefinitions,
  llmTask: getLlmTaskToolDefinitions,
  summarize: getSummarizeToolDefinitions,
  healthcheck: getHealthcheckToolDefinitions,
  trigger: getTriggerToolDefinitions,
  claude: getClaudeToolDefinitions,
  skills: getSkillToolDefinitions,
  agents: getAgentInlineDefinitions,
  cron: getCronInlineDefinitions,
} as const;

/** Name of a tool group in TOOL_GROUPS. */
export type ToolGroupName = keyof typeof TOOL_GROUPS;

// ─── Tool profiles ──────────────────────────────────────────────────────────

/** A tool profile is an ordered list of group names. */
export type ToolProfile = readonly ToolGroupName[];

/** Pre-built profiles for common contexts. */
export const TOOL_PROFILES: Readonly<Record<string, ToolProfile>> = {
  /** Tidepool web UI — full tool access including canvas. */
  tidepool: [
    "exec",
    "todo",
    "memory",
    "secrets",
    "web",
    "plan",
    "browser",
    "tidepool",
    "sessions",
    "image",
    "explore",
    "google",
    "github",
    "obsidian",
    "llmTask",
    "summarize",
    "healthcheck",
    "trigger",
    "claude",
    "skills",
    "agents",
    "cron",
  ],
  /** CLI chat — everything except tidepool canvas tools. */
  cli: [
    "exec",
    "todo",
    "memory",
    "secrets",
    "web",
    "plan",
    "browser",
    "sessions",
    "image",
    "explore",
    "google",
    "github",
    "obsidian",
    "llmTask",
    "summarize",
    "healthcheck",
    "trigger",
    "claude",
    "skills",
    "agents",
    "cron",
  ],
  /** Trigger sessions — tools with wired executors, no interactive tools. */
  triggerSession: [
    "exec",
    "todo",
    "memory",
    "web",
    "google",
    "github",
    "llmTask",
    "summarize",
    "healthcheck",
    "trigger",
    "skills",
    "cron",
  ],
  /** Cron jobs — same scope as trigger minus trigger-specific tools. */
  cronJob: [
    "exec",
    "todo",
    "memory",
    "web",
    "google",
    "github",
    "llmTask",
    "summarize",
    "healthcheck",
    "skills",
    "cron",
  ],
  /** Subagents — lightweight, focused. */
  subagent: [
    "exec",
    "todo",
    "memory",
    "web",
    "google",
    "github",
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
 * github, obsidian, agents, cron, healthcheck, skills) are omitted — the
 * tool descriptions in the JSON schema are sufficient.
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
