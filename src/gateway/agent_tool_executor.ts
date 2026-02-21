/**
 * Tool executor dispatch — routes tool calls to the appropriate handler.
 *
 * Given a set of optional subsystem executors (memory, browser, plan, etc.),
 * builds a single ToolExecutor function that tries each in order, falling
 * back to built-in filesystem/cron/subagent handlers.
 *
 * @module
 */

import { createExecTools } from "../exec/tools.ts";
import { createTodoToolExecutor } from "../tools/mod.ts";
import type { TodoManager } from "../tools/mod.ts";
import { createWebToolExecutor } from "../tools/web/mod.ts";
import type { SearchProvider, WebFetcher } from "../tools/web/mod.ts";
import type { ToolExecutor } from "../core/types/tool.ts";
import type { LlmProviderRegistry } from "../agent/llm.ts";
import type { CronManager } from "../scheduler/cron.ts";
import type { ClassificationLevel } from "../core/types/classification.ts";

/** Generic executor signature used by optional subsystem executors. */
type SubsystemExecutor = (
  name: string,
  input: Record<string, unknown>,
) => Promise<string | null>;

/** Options for creating a tool executor. */
export interface ToolExecutorOptions {
  readonly execTools: ReturnType<typeof createExecTools>;
  readonly cronManager?: CronManager;
  readonly todoManager?: TodoManager;
  readonly searchProvider?: SearchProvider;
  readonly webFetcher?: WebFetcher;
  readonly memoryExecutor?: SubsystemExecutor;
  readonly planExecutor?: SubsystemExecutor;
  readonly browserExecutor?: SubsystemExecutor;
  readonly tidepoolExecutor?: SubsystemExecutor;
  readonly providerRegistry?: LlmProviderRegistry;
  readonly sessionExecutor?: SubsystemExecutor;
  readonly imageExecutor?: SubsystemExecutor;
  readonly exploreExecutor?: SubsystemExecutor;
  readonly googleExecutor?: SubsystemExecutor;
  readonly githubExecutor?: SubsystemExecutor;
  readonly obsidianExecutor?: SubsystemExecutor;
  readonly llmTaskExecutor?: SubsystemExecutor;
  readonly summarizeExecutor?: SubsystemExecutor;
  readonly healthcheckExecutor?: SubsystemExecutor;
  readonly mcpExecutor?: SubsystemExecutor;
  readonly claudeExecutor?: SubsystemExecutor;
  readonly subagentFactory?: (task: string, tools?: string) => Promise<string>;
  readonly secretExecutor?: SubsystemExecutor;
  readonly triggerExecutor?: SubsystemExecutor;
  /**
   * Executor for `get_tool_classification` — available in trigger sessions
   * so the agent can look up tool classifications and order its work from
   * lowest to highest classification before calling any integration tools.
   */
  readonly triggerClassificationExecutor?: SubsystemExecutor;
  readonly skillExecutor?: SubsystemExecutor;
}

// ─── Subsystem dispatch chain ────────────────────────────────────────────────

/**
 * Try each optional subsystem executor in priority order.
 * Returns the first non-null result, or null if none matched.
 */
async function dispatchToSubsystems(
  opts: ToolExecutorOptions,
  todoExecutor: SubsystemExecutor | null,
  webExecutor: SubsystemExecutor,
  name: string,
  input: Record<string, unknown>,
): Promise<string | null> {
  // Ordered chain — each returns null if not its tool
  const chain: (SubsystemExecutor | null | undefined)[] = [
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
    opts.obsidianExecutor,
    opts.llmTaskExecutor,
    opts.summarizeExecutor,
    opts.healthcheckExecutor,
    opts.claudeExecutor,
    opts.mcpExecutor,
    opts.secretExecutor,
    opts.triggerExecutor,
    opts.triggerClassificationExecutor,
    opts.skillExecutor,
    webExecutor,
  ];

  for (const executor of chain) {
    if (!executor) continue;
    const result = await executor(name, input);
    if (result !== null) return result;
  }
  return null;
}

// ─── Built-in tool handlers ──────────────────────────────────────────────────

/** Handle read_file tool call. */
async function executeReadFile(input: Record<string, unknown>): Promise<string> {
  const path = input.path;
  if (typeof path !== "string" || path.length === 0) {
    return "Error: read_file requires a 'path' argument (string).";
  }
  try {
    return await Deno.readTextFile(path);
  } catch (err) {
    return `Error reading file: ${err instanceof Error ? err.message : String(err)}`;
  }
}

/** Handle write_file tool call via ExecTools sandbox. */
async function executeWriteFile(
  input: Record<string, unknown>,
  execTools: ToolExecutorOptions["execTools"],
): Promise<string> {
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

/** Handle list_directory tool call. */
async function executeListDirectory(input: Record<string, unknown>): Promise<string> {
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
    return `Error listing directory: ${err instanceof Error ? err.message : String(err)}`;
  }
}

/** Handle run_command tool call via ExecTools sandbox. */
async function executeRunCommand(
  input: Record<string, unknown>,
  execTools: ToolExecutorOptions["execTools"],
): Promise<string> {
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
  parts.push(`[exit code: ${out.exitCode}, ${Math.round(out.duration)}ms]`);
  return parts.join("\n");
}

/** Handle search_files tool call (glob or content search). */
async function executeSearchFiles(input: Record<string, unknown>): Promise<string> {
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
      const proc = new Deno.Command("grep", {
        args: ["-rl", pattern, searchPath],
        stdout: "piped",
        stderr: "piped",
      });
      const output = await proc.output();
      const stdout = new TextDecoder().decode(output.stdout).trim();
      return stdout.length > 0 ? stdout : "No matches found.";
    } else {
      const proc = new Deno.Command("find", {
        args: [searchPath, "-name", pattern, "-type", "f"],
        stdout: "piped",
        stderr: "piped",
      });
      const output = await proc.output();
      const stdout = new TextDecoder().decode(output.stdout).trim();
      return stdout.length > 0 ? stdout : "No files found matching pattern.";
    }
  } catch (err) {
    return `Error searching: ${err instanceof Error ? err.message : String(err)}`;
  }
}

/** Handle edit_file tool call (find-and-replace unique string). */
async function executeEditFile(input: Record<string, unknown>): Promise<string> {
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
    if (count === 0) return "Error: old_text not found in file.";
    if (count > 1) {
      return `Error: old_text appears ${count} times (must be exactly 1). Provide a larger unique snippet.`;
    }
    const updated = content.replace(oldText, newText);
    await Deno.writeTextFile(path, updated);
    return `Edited ${path} (${updated.length} bytes written)`;
  } catch (err) {
    return `Error editing file: ${err instanceof Error ? err.message : String(err)}`;
  }
}

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
    return `Error spawning sub-agent: ${err instanceof Error ? err.message : String(err)}`;
  }
}

/** Handle agents_list tool call. */
function executeAgentsList(registry: LlmProviderRegistry): string {
  const defaultProvider = registry.getDefault();
  return JSON.stringify({
    default: defaultProvider?.name ?? "none",
    note: "Use 'llm_task' with 'model' parameter to target a specific provider.",
  });
}

// ─── Cron tool handlers ──────────────────────────────────────────────────────

/** Handle cron_create tool call. */
function executeCronCreate(
  input: Record<string, unknown>,
  cronManager: CronManager,
): string {
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

/** Handle cron_list tool call. */
function executeCronList(cronManager: CronManager): string {
  const jobs = cronManager.list();
  if (jobs.length === 0) return "No cron jobs registered.";
  return jobs.map((j) =>
    `${j.id}\n  Schedule: ${j.expression}\n  Task: ${j.task}\n  Enabled: ${j.enabled}\n  Classification: ${j.classificationCeiling}\n  Created: ${j.createdAt.toISOString()}`
  ).join("\n\n");
}

/** Handle cron_delete tool call. */
function executeCronDelete(
  input: Record<string, unknown>,
  cronManager: CronManager,
): string {
  const jobId = input.job_id as string;
  const result = cronManager.delete(jobId);
  return result.ok ? `Deleted cron job ${jobId}` : `Error: ${result.error}`;
}

/** Handle cron_history tool call. */
function executeCronHistory(
  input: Record<string, unknown>,
  cronManager: CronManager,
): string {
  const jobId = input.job_id as string;
  const hist = cronManager.history(jobId);
  if (hist.length === 0) return "No execution history for this job.";
  return hist.slice(-10).map((e) =>
    `${e.executedAt.toISOString()} — ${e.success ? "SUCCESS" : "FAILED"}${
      e.error ? ` (${e.error})` : ""
    } [${Math.round(e.durationMs)}ms]`
  ).join("\n");
}

// ─── Main executor factory ───────────────────────────────────────────────────

/**
 * Create a tool executor backed by ExecTools, direct filesystem access,
 * and optional subsystem executors for scheduling, planning, browser, etc.
 *
 * Tools that operate on absolute paths (read_file, list_directory, search_files)
 * use Deno APIs directly. Tools that operate on the workspace (write_file,
 * run_command) use ExecTools for sandboxing. Cron tools delegate to CronManager.
 */
export function createToolExecutor(opts: ToolExecutorOptions): ToolExecutor {
  const { execTools, cronManager } = opts;
  const todoExecutor = opts.todoManager
    ? createTodoToolExecutor(opts.todoManager)
    : null;
  const webExecutor = createWebToolExecutor(opts.searchProvider, opts.webFetcher);

  return async (name: string, input: Record<string, unknown>): Promise<string> => {
    // Try subsystem executors first
    const subsystemResult = await dispatchToSubsystems(
      opts, todoExecutor, webExecutor, name, input,
    );
    if (subsystemResult !== null) return subsystemResult;

    // Built-in tool dispatch
    switch (name) {
      case "read_file":
        return executeReadFile(input);
      case "write_file":
        return executeWriteFile(input, execTools);
      case "list_directory":
        return executeListDirectory(input);
      case "run_command":
        return executeRunCommand(input, execTools);
      case "search_files":
        return executeSearchFiles(input);
      case "edit_file":
        return executeEditFile(input);

      case "subagent":
        return opts.subagentFactory
          ? executeSubagent(input, opts.subagentFactory)
          : "Sub-agent spawning is not available in this context.";
      case "agents_list":
        return opts.providerRegistry
          ? executeAgentsList(opts.providerRegistry)
          : "No provider registry available.";

      case "cron_create":
        return cronManager
          ? executeCronCreate(input, cronManager)
          : "Cron management is not available in this context.";
      case "cron_list":
        return cronManager
          ? executeCronList(cronManager)
          : "Cron management is not available in this context.";
      case "cron_delete":
        return cronManager
          ? executeCronDelete(input, cronManager)
          : "Cron management is not available in this context.";
      case "cron_history":
        return cronManager
          ? executeCronHistory(input, cronManager)
          : "Cron management is not available in this context.";

      default:
        return `Unknown tool: ${name}`;
    }
  };
}
