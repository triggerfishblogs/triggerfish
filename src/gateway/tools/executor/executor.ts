/**
 * Tool executor dispatch — routes tool calls to the appropriate handler.
 *
 * Given a set of optional subsystem executors (memory, browser, plan, etc.),
 * builds a single ToolExecutor function that tries each in order, falling
 * back to built-in filesystem/cron/subagent handlers.
 *
 * @module
 */

import { createTodoToolExecutor } from "../../../tools/mod.ts";
import { createWebToolExecutor } from "../../../tools/web/mod.ts";
import type { ToolExecutor } from "../../../core/types/tool.ts";
import type { LlmProviderRegistry } from "../../../core/types/llm.ts";

export type {
  SubsystemExecutor,
  ToolExecutorOptions,
} from "./executor_types.ts";
import type {
  SubsystemExecutor,
  ToolExecutorOptions,
} from "./executor_types.ts";

import {
  executeEditFile,
  executeListDirectory,
  executeLogRead,
  executeReadFile,
  executeRunCommand,
  executeSearchFiles,
  executeWriteFile,
} from "./executor_filesystem.ts";

import { dispatchCronTool } from "./executor_cron.ts";
import {
  createCwdTracker,
  type CwdTracker,
  resolveAgainstCwd,
  updateCwdAfterCommand,
} from "./executor_cwd.ts";

// ─── Subsystem dispatch chain ────────────────────────────────────────────────

/** Build the first half of the subsystem executor chain. */
function buildCoreSubsystems(
  opts: ToolExecutorOptions,
  todoExecutor: SubsystemExecutor | null,
): (SubsystemExecutor | null | undefined)[] {
  return [
    todoExecutor,
    opts.memoryExecutor,
    opts.planExecutor,
    opts.browserExecutor,
    opts.tidepoolExecutor,
    opts.sessionExecutor,
    opts.imageExecutor,
    opts.exploreExecutor,
    opts.googleExecutor,
    opts.githubExecutor,
    opts.caldavExecutor,
    opts.notionExecutor,
    opts.obsidianExecutor,
  ];
}

/** Build the second half of the subsystem executor chain. */
function buildExtendedSubsystems(
  opts: ToolExecutorOptions,
  webExecutor: SubsystemExecutor,
): (SubsystemExecutor | null | undefined)[] {
  return [
    opts.llmTaskExecutor,
    opts.summarizeExecutor,
    opts.healthcheckExecutor,
    opts.claudeExecutor,
    opts.mcpExecutor,
    opts.secretExecutor,
    opts.triggerExecutor,
    opts.triggerManageExecutor,
    opts.skillExecutor,
    opts.releaseNotesExecutor,
    opts.simulateExecutor,
    opts.teamExecutor,
    opts.workflowExecutor,
    webExecutor,
  ];
}

/**
 * Try each optional subsystem executor in priority order.
 * Returns the first non-null result, or null if none matched.
 */
async function dispatchToSubsystems(
  chain: (SubsystemExecutor | null | undefined)[],
  name: string,
  input: Record<string, unknown>,
): Promise<string | null> {
  for (const executor of chain) {
    if (!executor) continue;
    const result = await executor(name, input);
    if (result !== null) return result;
  }
  return null;
}

// ─── Agent tool handlers ─────────────────────────────────────────────────────

/** Handle subagent tool call. */
async function executeSubagent(
  input: Record<string, unknown>,
  factory: (task: string, tools?: string) => Promise<string>,
): Promise<string> {
  const task = input.task;
  if (typeof task !== "string" || task.length === 0) {
    return "Error: subagent requires a non-empty 'task' argument (string).";
  }
  const toolsArg = typeof input.tools === "string" ? input.tools : undefined;
  try {
    return await factory(task, toolsArg);
  } catch (err) {
    return `Error spawning sub-agent: ${
      err instanceof Error ? err.message : String(err)
    }`;
  }
}

/** Handle agents_list tool call. */
function executeAgentsList(registry: LlmProviderRegistry): string {
  const defaultProvider = registry.getDefault();
  return JSON.stringify({
    default: defaultProvider?.name ?? "none",
    note:
      "Use 'llm_task' with 'model' parameter to target a specific provider.",
  });
}

// ─── Built-in tool dispatch ──────────────────────────────────────────────────

/** Dispatch agent-specific tools (subagent, agents_list). */
function dispatchAgentTool(
  name: string,
  input: Record<string, unknown>,
  opts: ToolExecutorOptions,
): Promise<string> | string | null {
  if (name === "subagent") {
    return opts.subagentFactory
      ? executeSubagent(input, opts.subagentFactory)
      : "Sub-agent spawning is not available in this context.";
  }
  if (name === "agents_list") {
    return opts.providerRegistry
      ? executeAgentsList(opts.providerRegistry)
      : "No provider registry available.";
  }
  return null;
}

/** Return a copy of `input` with `pathKey` resolved against the CWD tracker. */
function resolveFilesystemInput(
  input: Record<string, unknown>,
  cwdTracker: CwdTracker,
  pathKey = "path",
): Record<string, unknown> {
  const raw = input[pathKey];
  if (typeof raw !== "string" || raw.length === 0) return input;
  const resolved = resolveAgainstCwd(cwdTracker, raw);
  if (resolved === raw) return input;
  return { ...input, [pathKey]: resolved };
}

/** Parse exit code from the formatted command result string. */
function parseExitCode(result: string): number {
  const match = result.match(/\[exit code: (\d+)/);
  return match ? Number(match[1]) : -1;
}

/** Run a command, then update the CWD tracker if a `cd` was detected. */
async function executeRunCommandWithCwd(
  input: Record<string, unknown>,
  execTools: ToolExecutorOptions["execTools"],
  cwdTracker: CwdTracker,
): Promise<string> {
  const hasExplicitCwd = typeof input.cwd === "string" && input.cwd.length > 0;
  const resolved = (!hasExplicitCwd && cwdTracker.workingDir !== ".")
    ? { ...input, cwd: cwdTracker.workingDir }
    : input;
  const result = await executeRunCommand(resolved, execTools);
  const command = (input.command ?? input.cmd) as string | undefined;
  if (command && !hasExplicitCwd) {
    updateCwdAfterCommand(cwdTracker, command, parseExitCode(result));
  }
  return result;
}

/** Dispatch filesystem tools. Returns null if not matched. */
function dispatchFilesystemTool(
  name: string,
  input: Record<string, unknown>,
  opts: ToolExecutorOptions,
  cwdTracker: CwdTracker,
): Promise<string> | null {
  const sandbox = opts.filesystemSandbox;
  switch (name) {
    case "read_file":
      return executeReadFile(
        resolveFilesystemInput(input, cwdTracker),
        sandbox,
      );
    case "write_file":
      return executeWriteFile(
        resolveFilesystemInput(input, cwdTracker),
        opts.execTools,
        sandbox,
      );
    case "list_directory":
      return executeListDirectory(
        resolveFilesystemInput(input, cwdTracker),
        sandbox,
      );
    case "run_command":
      return executeRunCommandWithCwd(input, opts.execTools, cwdTracker);
    case "search_files":
      return executeSearchFiles(
        resolveFilesystemInput(input, cwdTracker),
        sandbox,
      );
    case "edit_file":
      return executeEditFile(
        resolveFilesystemInput(input, cwdTracker),
        sandbox,
      );
    case "log_read":
      return executeLogRead(name, input).then((r) =>
        r ?? "No log files found or logs are empty."
      );
    default:
      return null;
  }
}

// ─── Main executor factory ───────────────────────────────────────────────────

/** Context needed to route a tool call through all dispatch layers. */
interface ToolCallContext {
  readonly chain: (SubsystemExecutor | null | undefined)[];
  readonly opts: ToolExecutorOptions;
  readonly cwdTracker: CwdTracker;
}

/** Route a single tool call through subsystems, builtins, and cron. */
async function routeToolCall(
  ctx: ToolCallContext,
  name: string,
  input: Record<string, unknown>,
): Promise<string> {
  const subsystemResult = await dispatchToSubsystems(ctx.chain, name, input);
  if (subsystemResult !== null) return subsystemResult;

  const fsResult = dispatchFilesystemTool(
    name,
    input,
    ctx.opts,
    ctx.cwdTracker,
  );
  if (fsResult !== null) return fsResult;

  const agentResult = dispatchAgentTool(name, input, ctx.opts);
  if (agentResult !== null) return agentResult;

  return dispatchCronTool(name, input, ctx.opts.cronManager) ??
    `Unknown tool: ${name}`;
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
  const todoExecutor = opts.todoManager
    ? createTodoToolExecutor(opts.todoManager)
    : null;
  const webExecutor = createWebToolExecutor({
    searchProvider: opts.searchProvider,
    webFetcher: opts.webFetcher,
    getActiveSkillDomains: opts.skillContextTracker
      ? () => {
        const active = opts.skillContextTracker!.getActive();
        if (!active) return null;
        return active.networkDomains;
      }
      : undefined,
  });
  const chain = [
    ...buildCoreSubsystems(opts, todoExecutor),
    ...buildExtendedSubsystems(opts, webExecutor),
  ];

  const cwdTracker = createCwdTracker();
  const ctx: ToolCallContext = { chain, opts, cwdTracker };
  return (name: string, input: Record<string, unknown>): Promise<string> =>
    routeToolCall(ctx, name, input);
}
