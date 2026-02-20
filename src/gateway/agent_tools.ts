/**
 * Tool definitions, profiles, and executor for the agent.
 *
 * Tool definitions are organized into composable **groups**. Groups are
 * assembled into **profiles** (cli, tidepool, triggerSession, cronJob,
 * subagent) so each context gets only the tools it actually needs —
 * saving tokens and avoiding dead-tool confusion.
 *
 * @module
 */

import { createExecTools } from "../exec/tools.ts";
import { createTodoToolExecutor, getTodoToolDefinitions, TODO_SYSTEM_PROMPT } from "../tools/mod.ts";
import type { TodoManager } from "../tools/mod.ts";
import { getMemoryToolDefinitions, MEMORY_SYSTEM_PROMPT } from "../tools/memory/mod.ts";
import { getSecretToolDefinitions, SECRET_TOOLS_SYSTEM_PROMPT } from "../tools/secrets.ts";
import {
  createWebToolExecutor,
  getWebToolDefinitions,
  WEB_TOOLS_SYSTEM_PROMPT,
} from "../tools/web/mod.ts";
import type { SearchProvider, WebFetcher } from "../tools/web/mod.ts";
import { getPlanToolDefinitions, PLAN_SYSTEM_PROMPT } from "../agent/plan_tools.ts";
import { getBrowserToolDefinitions } from "../tools/browser/mod.ts";
import { getTidepoolToolDefinitions, TIDEPOOL_SYSTEM_PROMPT } from "../tools/tidepool/mod.ts";
import { getSessionToolDefinitions, SESSION_TOOLS_SYSTEM_PROMPT } from "./tools.ts";
import { getImageToolDefinitions, IMAGE_TOOLS_SYSTEM_PROMPT } from "../tools/image/mod.ts";
import { getExploreToolDefinitions, EXPLORE_SYSTEM_PROMPT } from "../tools/explore/mod.ts";
import { getGoogleToolDefinitions } from "../integrations/google/mod.ts";
import { getGitHubToolDefinitions } from "../integrations/github/mod.ts";
import { getObsidianToolDefinitions } from "../tools/obsidian/mod.ts";
import {
  getLlmTaskToolDefinitions,
  getSummarizeToolDefinitions,
  getHealthcheckToolDefinitions,
  LLM_TASK_SYSTEM_PROMPT,
  SUMMARIZE_SYSTEM_PROMPT,
} from "../tools/mod.ts";
import { getTriggerToolDefinitions, TRIGGER_TOOLS_SYSTEM_PROMPT } from "./trigger_tools.ts";
import { getClaudeToolDefinitions, CLAUDE_SESSION_SYSTEM_PROMPT } from "../exec/claude.ts";
import { getSkillToolDefinitions } from "../tools/skills/mod.ts";
import type { ToolDefinition, ToolExecutor } from "../agent/orchestrator.ts";
import type { LlmProviderRegistry } from "../agent/llm.ts";
import type { CronManager } from "../scheduler/cron.ts";
import type { ClassificationLevel } from "../core/types/classification.ts";

// ─── Inline tool definition groups ─────────────────────────────────────────

/** Filesystem tools: read_file, write_file, list_directory, run_command, search_files, edit_file. */
function getExecInlineDefinitions(): readonly ToolDefinition[] {
  return [
    {
      name: "read_file",
      description: "Read the contents of a file at an absolute path.",
      parameters: {
        path: {
          type: "string",
          description: "Absolute file path to read",
          required: true,
        },
      },
    },
    {
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
    },
    {
      name: "list_directory",
      description: "List files and directories at a given absolute path.",
      parameters: {
        path: {
          type: "string",
          description: "Absolute directory path to list",
          required: true,
        },
      },
    },
    {
      name: "run_command",
      description: "Run a shell command in the agent workspace directory.",
      parameters: {
        command: {
          type: "string",
          description: "Shell command to execute",
          required: true,
        },
      },
    },
    {
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
    },
    {
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
    },
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

/** Cron scheduling tools: cron_create, cron_list, cron_delete, cron_history. */
function getCronInlineDefinitions(): readonly ToolDefinition[] {
  return [
    {
      name: "cron_create",
      description:
        "Create a scheduled cron job. The task runs on the given cron schedule.",
      parameters: {
        expression: {
          type: "string",
          description:
            "5-field cron expression (e.g. '0 9 * * *' for 9am daily)",
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
    },
    {
      name: "cron_list",
      description:
        "List all registered cron jobs with their schedules and status.",
      parameters: {},
    },
    {
      name: "cron_delete",
      description: "Delete a cron job by its ID.",
      parameters: {
        job_id: {
          type: "string",
          description: "The UUID of the cron job to delete",
          required: true,
        },
      },
    },
    {
      name: "cron_history",
      description: "Show recent execution history for a cron job.",
      parameters: {
        job_id: {
          type: "string",
          description: "The UUID of the cron job",
          required: true,
        },
      },
    },
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
    "exec", "todo", "memory", "secrets", "web", "plan", "browser",
    "tidepool", "sessions", "image", "explore", "google", "github",
    "obsidian", "llmTask", "summarize", "healthcheck", "trigger",
    "claude", "skills", "agents", "cron",
  ],
  /** CLI chat — everything except tidepool canvas tools. */
  cli: [
    "exec", "todo", "memory", "secrets", "web", "plan", "browser",
    "sessions", "image", "explore", "google", "github",
    "obsidian", "llmTask", "summarize", "healthcheck", "trigger",
    "claude", "skills", "agents", "cron",
  ],
  /** Trigger sessions — tools with wired executors, no interactive tools. */
  triggerSession: [
    "exec", "todo", "memory", "web",
    "google", "github", "llmTask", "summarize",
    "healthcheck", "trigger", "skills", "cron",
  ],
  /** Cron jobs — same scope as trigger minus trigger-specific tools. */
  cronJob: [
    "exec", "todo", "memory", "web",
    "google", "github", "llmTask", "summarize",
    "healthcheck", "skills", "cron",
  ],
  /** Subagents — lightweight, focused. */
  subagent: [
    "exec", "todo", "memory", "web",
    "google", "github", "llmTask", "summarize",
    "healthcheck", "skills",
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
export function getToolsForProfile(profile: ToolProfileName | ToolProfile): readonly ToolDefinition[] {
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
export const TOOL_GROUP_PROMPTS: Partial<Readonly<Record<ToolGroupName, string>>> = {
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
export function getPromptsForProfile(profile: ToolProfileName | ToolProfile): readonly string[] {
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
 * @deprecated Use `getToolsForProfile("cli")` or another profile instead.
 * Kept for backward compatibility — returns the "tidepool" profile (all tools).
 */
export function getToolDefinitions(): readonly ToolDefinition[] {
  return getToolsForProfile("tidepool");
}

/** Options for creating a tool executor. */
export interface ToolExecutorOptions {
  readonly execTools: ReturnType<typeof createExecTools>;
  readonly cronManager?: CronManager;
  readonly todoManager?: TodoManager;
  readonly searchProvider?: SearchProvider;
  readonly webFetcher?: WebFetcher;
  readonly memoryExecutor?: (
    name: string,
    input: Record<string, unknown>,
  ) => Promise<string | null>;
  readonly planExecutor?: (
    name: string,
    input: Record<string, unknown>,
  ) => Promise<string | null>;
  readonly browserExecutor?: (
    name: string,
    input: Record<string, unknown>,
  ) => Promise<string | null>;
  readonly tidepoolExecutor?: (
    name: string,
    input: Record<string, unknown>,
  ) => Promise<string | null>;
  readonly providerRegistry?: LlmProviderRegistry;
  readonly sessionExecutor?: (
    name: string,
    input: Record<string, unknown>,
  ) => Promise<string | null>;
  readonly imageExecutor?: (
    name: string,
    input: Record<string, unknown>,
  ) => Promise<string | null>;
  readonly exploreExecutor?: (
    name: string,
    input: Record<string, unknown>,
  ) => Promise<string | null>;
  readonly googleExecutor?: (
    name: string,
    input: Record<string, unknown>,
  ) => Promise<string | null>;
  readonly githubExecutor?: (
    name: string,
    input: Record<string, unknown>,
  ) => Promise<string | null>;
  readonly obsidianExecutor?: (
    name: string,
    input: Record<string, unknown>,
  ) => Promise<string | null>;
  readonly llmTaskExecutor?: (
    name: string,
    input: Record<string, unknown>,
  ) => Promise<string | null>;
  readonly summarizeExecutor?: (
    name: string,
    input: Record<string, unknown>,
  ) => Promise<string | null>;
  readonly healthcheckExecutor?: (
    name: string,
    input: Record<string, unknown>,
  ) => Promise<string | null>;
  readonly mcpExecutor?: (
    name: string,
    input: Record<string, unknown>,
  ) => Promise<string | null>;
  readonly claudeExecutor?: (
    name: string,
    input: Record<string, unknown>,
  ) => Promise<string | null>;
  readonly subagentFactory?: (task: string, tools?: string) => Promise<string>;
  readonly secretExecutor?: (
    name: string,
    input: Record<string, unknown>,
  ) => Promise<string | null>;
  readonly triggerExecutor?: (
    name: string,
    input: Record<string, unknown>,
  ) => Promise<string | null>;
  /**
   * Executor for `get_tool_classification` — available in trigger sessions
   * so the agent can look up tool classifications and order its work from
   * lowest to highest classification before calling any integration tools.
   */
  readonly triggerClassificationExecutor?: (
    name: string,
    input: Record<string, unknown>,
  ) => Promise<string | null>;
  readonly skillExecutor?: (
    name: string,
    input: Record<string, unknown>,
  ) => Promise<string | null>;
}

/**
 * Create a tool executor backed by ExecTools, direct filesystem access,
 * and optional subsystem executors for scheduling, planning, browser, etc.
 *
 * Tools that operate on absolute paths (read_file, list_directory, search_files)
 * use Deno APIs directly. Tools that operate on the workspace (write_file,
 * run_command) use ExecTools for sandboxing. Cron tools delegate to CronManager.
 */
export function createToolExecutor(opts: ToolExecutorOptions): ToolExecutor {
  const { execTools, cronManager, searchProvider, webFetcher } = opts;
  const todoExecutor = opts.todoManager
    ? createTodoToolExecutor(opts.todoManager)
    : null;
  const webExecutor = createWebToolExecutor(searchProvider, webFetcher);

  // Inner dispatch — routes tool calls to the appropriate handler.
  const dispatch = async (
    name: string,
    input: Record<string, unknown>,
  ): Promise<string> => {
    // Try todo tools first (returns null if not a todo tool)
    if (todoExecutor) {
      const todoResult = await todoExecutor(name, input);
      if (todoResult !== null) return todoResult;
    }

    // Try memory tools (returns null if not a memory tool)
    if (opts.memoryExecutor) {
      const memoryResult = await opts.memoryExecutor(name, input);
      if (memoryResult !== null) return memoryResult;
    }

    // Try plan tools (returns null if not a plan tool)
    if (opts.planExecutor) {
      const planResult = await opts.planExecutor(name, input);
      if (planResult !== null) return planResult;
    }

    // Try browser tools (returns null if not a browser tool)
    if (opts.browserExecutor) {
      const browserResult = await opts.browserExecutor(name, input);
      if (browserResult !== null) return browserResult;
    }

    // Try tidepool tools (returns null if not a tidepool tool)
    if (opts.tidepoolExecutor) {
      const tidepoolResult = await opts.tidepoolExecutor(name, input);
      if (tidepoolResult !== null) return tidepoolResult;
    }

    // Try session tools (returns null if not a session tool)
    if (opts.sessionExecutor) {
      const sessionResult = await opts.sessionExecutor(name, input);
      if (sessionResult !== null) return sessionResult;
    }

    // Try image tools (returns null if not an image tool)
    if (opts.imageExecutor) {
      const imageResult = await opts.imageExecutor(name, input);
      if (imageResult !== null) return imageResult;
    }

    // Try explore tools (returns null if not an explore tool)
    if (opts.exploreExecutor) {
      const exploreResult = await opts.exploreExecutor(name, input);
      if (exploreResult !== null) return exploreResult;
    }

    // Try Google Workspace tools (returns null if not a Google tool)
    if (opts.googleExecutor) {
      const googleResult = await opts.googleExecutor(name, input);
      if (googleResult !== null) return googleResult;
    }

    // Try GitHub tools (returns null if not a github tool)
    if (opts.githubExecutor) {
      const githubResult = await opts.githubExecutor(name, input);
      if (githubResult !== null) return githubResult;
    }

    // Try obsidian tools (returns null if not an obsidian tool)
    if (opts.obsidianExecutor) {
      const obsidianResult = await opts.obsidianExecutor(name, input);
      if (obsidianResult !== null) return obsidianResult;
    }

    // Try llm_task tool (returns null if not llm_task)
    if (opts.llmTaskExecutor) {
      const llmTaskResult = await opts.llmTaskExecutor(name, input);
      if (llmTaskResult !== null) return llmTaskResult;
    }

    // Try summarize tool (returns null if not summarize)
    if (opts.summarizeExecutor) {
      const summarizeResult = await opts.summarizeExecutor(name, input);
      if (summarizeResult !== null) return summarizeResult;
    }

    // Try healthcheck tool (returns null if not healthcheck)
    if (opts.healthcheckExecutor) {
      const healthcheckResult = await opts.healthcheckExecutor(name, input);
      if (healthcheckResult !== null) return healthcheckResult;
    }

    // Try Claude session tools (returns null if not a claude tool)
    if (opts.claudeExecutor) {
      const claudeResult = await opts.claudeExecutor(name, input);
      if (claudeResult !== null) return claudeResult;
    }

    // Try MCP server tools (returns null if not an MCP tool)
    if (opts.mcpExecutor) {
      const mcpResult = await opts.mcpExecutor(name, input);
      if (mcpResult !== null) return mcpResult;
    }

    // Try secret tools (returns null if not a secret tool)
    if (opts.secretExecutor) {
      const secretResult = await opts.secretExecutor(name, input);
      if (secretResult !== null) return secretResult;
    }

    // Try trigger context tools (returns null if not a trigger tool)
    if (opts.triggerExecutor) {
      const triggerResult = await opts.triggerExecutor(name, input);
      if (triggerResult !== null) return triggerResult;
    }

    // Try trigger classification tool (get_tool_classification — for trigger sessions)
    if (opts.triggerClassificationExecutor) {
      const triggerClassResult = await opts.triggerClassificationExecutor(name, input);
      if (triggerClassResult !== null) return triggerClassResult;
    }

    // Try skill tools (returns null if not a skill tool)
    if (opts.skillExecutor) {
      const skillResult = await opts.skillExecutor(name, input);
      if (skillResult !== null) return skillResult;
    }

    // Try web tools (returns null if not a web tool)
    const webResult = await webExecutor(name, input);
    if (webResult !== null) return webResult;

    switch (name) {
      case "read_file": {
        const path = input.path;
        if (typeof path !== "string" || path.length === 0) {
          return "Error: read_file requires a 'path' argument (string).";
        }
        try {
          const content = await Deno.readTextFile(path);
          return content;
        } catch (err) {
          return `Error reading file: ${
            err instanceof Error ? err.message : String(err)
          }`;
        }
      }

      case "write_file": {
        const path = input.path;
        const content = input.content;
        if (typeof path !== "string" || path.length === 0) {
          return "Error: write_file requires a 'path' argument (string).";
        }
        if (typeof content !== "string") {
          return "Error: write_file requires a 'content' argument (string).";
        }
        const result = await execTools.write(path, content);
        return result.ok
          ? `Wrote ${result.value.bytesWritten} bytes to ${result.value.path}`
          : `Error: ${result.error}`;
      }

      case "list_directory": {
        const path = input.path;
        if (typeof path !== "string" || path.length === 0) {
          return "Error: list_directory requires a 'path' argument (string).";
        }
        try {
          const entries: string[] = [];
          for await (const entry of Deno.readDir(path)) {
            const suffix = entry.isDirectory ? "/" : "";
            entries.push(`${entry.name}${suffix}`);
          }
          return entries.length > 0 ? entries.join("\n") : "(empty directory)";
        } catch (err) {
          return `Error listing directory: ${
            err instanceof Error ? err.message : String(err)
          }`;
        }
      }

      case "run_command": {
        const command = input.command ?? input.cmd;
        if (typeof command !== "string" || command.length === 0) {
          return "Error: run_command requires a 'command' argument (string).";
        }
        const result = await execTools.run(command);
        if (!result.ok) return `Error: ${result.error}`;
        const out = result.value;
        const parts: string[] = [];
        if (out.stdout) parts.push(out.stdout);
        if (out.stderr) parts.push(`[stderr] ${out.stderr}`);
        parts.push(
          `[exit code: ${out.exitCode}, ${Math.round(out.duration)}ms]`,
        );
        return parts.join("\n");
      }

      case "search_files": {
        const searchPath = input.path;
        const pattern = input.pattern;
        if (typeof searchPath !== "string" || searchPath.length === 0) {
          return "Error: search_files requires a 'path' argument (string).";
        }
        if (typeof pattern !== "string" || pattern.length === 0) {
          return "Error: search_files requires a 'pattern' argument (string).";
        }
        const contentSearch = input.content_search === true;
        try {
          if (contentSearch) {
            // Use grep-style search
            const proc = new Deno.Command("grep", {
              args: ["-rl", pattern, searchPath],
              stdout: "piped",
              stderr: "piped",
            });
            const output = await proc.output();
            const stdout = new TextDecoder().decode(output.stdout).trim();
            return stdout.length > 0 ? stdout : "No matches found.";
          } else {
            // Use find with glob
            const proc = new Deno.Command("find", {
              args: [searchPath, "-name", pattern, "-type", "f"],
              stdout: "piped",
              stderr: "piped",
            });
            const output = await proc.output();
            const stdout = new TextDecoder().decode(output.stdout).trim();
            return stdout.length > 0
              ? stdout
              : "No files found matching pattern.";
          }
        } catch (err) {
          return `Error searching: ${
            err instanceof Error ? err.message : String(err)
          }`;
        }
      }

      case "edit_file": {
        const path = input.path;
        const oldText = input.old_text;
        const newText = input.new_text;
        if (typeof path !== "string" || path.length === 0) {
          return "Error: edit_file requires a 'path' argument (string).";
        }
        if (typeof oldText !== "string" || oldText.length === 0) {
          return "Error: edit_file requires a non-empty 'old_text' argument (string).";
        }
        if (typeof newText !== "string") {
          return "Error: edit_file requires a 'new_text' argument (string).";
        }
        try {
          const content = await Deno.readTextFile(path);
          const count = content.split(oldText).length - 1;
          if (count === 0) {
            return "Error: old_text not found in file.";
          }
          if (count > 1) {
            return `Error: old_text appears ${count} times (must be exactly 1). Provide a larger unique snippet.`;
          }
          const updated = content.replace(oldText, newText);
          await Deno.writeTextFile(path, updated);
          return `Edited ${path} (${updated.length} bytes written)`;
        } catch (err) {
          return `Error editing file: ${
            err instanceof Error ? err.message : String(err)
          }`;
        }
      }

      case "subagent": {
        if (!opts.subagentFactory) {
          return "Sub-agent spawning is not available in this context.";
        }
        const task = input.task;
        if (typeof task !== "string" || task.length === 0) {
          return "Error: subagent requires a non-empty 'task' argument (string).";
        }
        const toolsArg = typeof input.tools === "string"
          ? input.tools
          : undefined;
        try {
          return await opts.subagentFactory(task, toolsArg);
        } catch (err) {
          return `Error spawning sub-agent: ${
            err instanceof Error ? err.message : String(err)
          }`;
        }
      }

      case "agents_list": {
        if (!opts.providerRegistry) {
          return "No provider registry available.";
        }
        const defaultProvider = opts.providerRegistry.getDefault();
        return JSON.stringify({
          default: defaultProvider?.name ?? "none",
          note:
            "Use 'llm_task' with 'model' parameter to target a specific provider.",
        });
      }

      case "cron_create": {
        if (!cronManager) {
          return "Cron management is not available in this context.";
        }
        const expression = input.expression as string;
        const task = input.task as string;
        const classification = (input.classification as string) ?? "INTERNAL";
        const result = cronManager.create({
          expression,
          task,
          classificationCeiling: classification as ClassificationLevel,
        });
        if (!result.ok) return `Error creating cron job: ${result.error}`;
        const job = result.value;
        return `Created cron job:\n  ID: ${job.id}\n  Schedule: ${job.expression}\n  Task: ${job.task}\n  Classification: ${job.classificationCeiling}\n  Created: ${job.createdAt.toISOString()}`;
      }

      case "cron_list": {
        if (!cronManager) {
          return "Cron management is not available in this context.";
        }
        const jobs = cronManager.list();
        if (jobs.length === 0) return "No cron jobs registered.";
        return jobs.map((j) =>
          `${j.id}\n  Schedule: ${j.expression}\n  Task: ${j.task}\n  Enabled: ${j.enabled}\n  Classification: ${j.classificationCeiling}\n  Created: ${j.createdAt.toISOString()}`
        ).join("\n\n");
      }

      case "cron_delete": {
        if (!cronManager) {
          return "Cron management is not available in this context.";
        }
        const jobId = input.job_id as string;
        const result = cronManager.delete(jobId);
        return result.ok
          ? `Deleted cron job ${jobId}`
          : `Error: ${result.error}`;
      }

      case "cron_history": {
        if (!cronManager) {
          return "Cron management is not available in this context.";
        }
        const jobId = input.job_id as string;
        const hist = cronManager.history(jobId);
        if (hist.length === 0) return "No execution history for this job.";
        return hist.slice(-10).map((e) =>
          `${e.executedAt.toISOString()} — ${e.success ? "SUCCESS" : "FAILED"}${
            e.error ? ` (${e.error})` : ""
          } [${Math.round(e.durationMs)}ms]`
        ).join("\n");
      }

      default:
        return `Unknown tool: ${name}`;
    }
  };

  return dispatch;
}
