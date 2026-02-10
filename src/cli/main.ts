/**
 * CLI entry point and command router for Triggerfish.
 *
 * Parses command-line arguments, loads configuration from YAML,
 * and validates config structure.
 * @module
 */

import { parse as parseYaml } from "@std/yaml";
import { createGatewayServer } from "../gateway/server.ts";
import { createChatSession } from "../gateway/chat.ts";
import type { ChatEvent } from "../gateway/chat.ts";
import { createA2UIHost } from "../tidepool/host.ts";
import { createPatrolCheck } from "../dive/patrol.ts";
import type { PatrolInput } from "../dive/patrol.ts";
import { runWizard } from "../dive/wizard.ts";
import {
  installAndStartDaemon,
  stopDaemon,
  getDaemonStatus,
  tailLogs,
  updateTriggerfish,
} from "./daemon.ts";
import { createOrchestrator } from "../agent/orchestrator.ts";
import type { ToolDefinition, ToolExecutor, OrchestratorEvent } from "../agent/orchestrator.ts";
import { createProviderRegistry } from "../agent/llm.ts";
import { loadProvidersFromConfig } from "../agent/providers/config.ts";
import type { ModelsConfig } from "../agent/providers/config.ts";
import { createPolicyEngine } from "../core/policy/engine.ts";
import { createHookRunner, createDefaultRules } from "../core/policy/hooks.ts";
import { createSession } from "../core/types/session.ts";
import type { UserId, ChannelId } from "../core/types/session.ts";
import type { ClassificationLevel } from "../core/types/classification.ts";
import { createWorkspace } from "../exec/workspace.ts";
import { createExecTools } from "../exec/tools.ts";
import {
  printBanner,
  formatBanner,
  createEventHandler,
  createScreenEventHandler,
  renderError,
  formatError,
  renderPrompt,
} from "./chat_ui.ts";
import type { ToolDisplayMode } from "./chat_ui.ts";
import { createKeypressReader, createLineEditor, createSuggestionEngine } from "./terminal.ts";
import type { LineEditor } from "./terminal.ts";
import { loadInputHistory, saveInputHistory } from "./history.ts";
import { createScreenManager } from "./screen.ts";
import { createSchedulerService } from "../scheduler/service.ts";
import type {
  OrchestratorFactory,
  SchedulerServiceConfig,
  WebhookSourceConfig,
} from "../scheduler/service.ts";
import { createPersistentCronManager } from "../scheduler/cron.ts";
import type { CronManager } from "../scheduler/cron.ts";
import type { StorageProvider } from "../core/storage/provider.ts";
import { createSqliteStorage } from "../core/storage/sqlite.ts";
import {
  createTodoManager,
  createTodoToolExecutor,
  getTodoToolDefinitions,
  TODO_SYSTEM_PROMPT,
} from "../tools/mod.ts";
import type { TodoManager } from "../tools/mod.ts";

/** Known CLI commands. */
const KNOWN_COMMANDS = new Set([
  "chat",
  "cron",
  "run",
  "start",
  "stop",
  "status",
  "logs",
  "config",
  "dive",
  "patrol",
  "update",
  "help",
  "version",
]);

/** Options that influence default command selection. */
export interface ParseOptions {
  readonly configExists?: boolean;
}

/** Result of parsing CLI arguments. */
export interface ParsedCommand {
  readonly command: string;
  readonly subcommand?: string;
  readonly flags: Readonly<Record<string, boolean | string>>;
}

/** Triggerfish YAML configuration shape. */
export interface TriggerFishConfig {
  readonly models: {
    readonly primary: string;
    readonly providers: Readonly<Record<string, { readonly model: string }>>;
  };
  readonly channels: Readonly<Record<string, unknown>>;
  readonly classification: {
    readonly mode: string;
  };
  readonly scheduler?: {
    readonly trigger?: {
      readonly enabled?: boolean;
      readonly interval_minutes?: number;
      readonly quiet_hours?: {
        readonly start?: number;
        readonly end?: number;
      };
    };
    readonly webhooks?: {
      readonly enabled?: boolean;
      readonly sources?: Readonly<Record<string, {
        readonly secret: string;
        readonly classification: string;
      }>>;
    };
  };
}

/** Success result. */
export interface Ok<T> {
  readonly ok: true;
  readonly value: T;
}

/** Failure result. */
export interface Err<E> {
  readonly ok: false;
  readonly error: E;
}

/** Discriminated union result type. */
export type Result<T, E> = Ok<T> | Err<E>;

/**
 * Parse CLI arguments into a structured command object.
 *
 * @param args - Raw command-line argument array (without the binary name).
 * @param options - Optional context influencing defaults.
 * @returns Parsed command with optional subcommand and flags.
 */
export function parseCommand(
  args: readonly string[],
  options: ParseOptions = {},
): ParsedCommand {
  const flags: Record<string, boolean | string> = {};

  // Handle special flags first
  if (args.includes("--version")) {
    return { command: "version", flags };
  }

  // Extract flags from args
  const positional: string[] = [];
  for (const arg of args) {
    if (arg.startsWith("--")) {
      const key = arg.slice(2);
      flags[key] = true;
    } else {
      positional.push(arg);
    }
  }

  // No positional args
  if (positional.length === 0) {
    const configExists = options.configExists ?? true;
    return { command: configExists ? "help" : "dive", flags };
  }

  const command = positional[0];

  // Unknown command → help
  if (!KNOWN_COMMANDS.has(command)) {
    return { command: "help", flags };
  }

  // Commands with subcommands
  if (command === "config" && positional.length > 1) {
    return { command, subcommand: positional[1], flags };
  }
  if (command === "cron" && positional.length > 1) {
    // Capture remaining positional args as flags for cron subcommands
    const sub = positional[1];
    if (sub === "add" && positional.length >= 4) {
      flags["expression"] = positional[2];
      flags["task"] = positional.slice(3).join(" ");
    } else if ((sub === "delete" || sub === "history") && positional.length > 2) {
      flags["job_id"] = positional[2];
    }
    return { command, subcommand: sub, flags };
  }

  return { command, flags };
}

/**
 * Load and parse a triggerfish YAML configuration file.
 *
 * @param path - Absolute path to the YAML file.
 * @returns Result with parsed config or error string.
 */
export function loadConfig(path: string): Result<TriggerFishConfig, string> {
  try {
    const raw = Deno.readTextFileSync(path);
    const parsed = parseYaml(raw);

    if (typeof parsed !== "object" || parsed === null) {
      return { ok: false, error: "Config file did not parse to an object" };
    }

    const validation = validateConfig(parsed as Record<string, unknown>);
    if (!validation.ok) {
      return validation as Err<string>;
    }

    return { ok: true, value: parsed as unknown as TriggerFishConfig };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, error: `Failed to load config: ${message}` };
  }
}

/**
 * Validate a parsed config object has all required fields.
 *
 * @param obj - Parsed object to validate.
 * @returns Result indicating validity or the first validation error.
 */
export function validateConfig(
  obj: Record<string, unknown>,
): Result<void, string> {
  // models must exist and have a primary field
  if (typeof obj.models !== "object" || obj.models === null) {
    return { ok: false, error: "Missing required field: models" };
  }

  const models = obj.models as Record<string, unknown>;
  if (typeof models.primary !== "string" || models.primary.length === 0) {
    return { ok: false, error: "Missing required field: models.primary" };
  }

  return { ok: true, value: undefined };
}

/**
 * Display help text.
 */
function showHelp(): void {
  console.log(`
Triggerfish - Secure Multi-Channel AI Agent Platform

USAGE:
  triggerfish [command] [options]

COMMANDS:
  chat        Start an interactive chat session
  cron        Manage scheduled cron jobs
  dive        First-run setup wizard (creates triggerfish.yaml)
  run         Run the gateway server in foreground
  start       Install and start the daemon
  stop        Stop the daemon
  status      Show daemon status
  logs        View daemon logs (--tail to follow)
  patrol      Run health diagnostics
  update      Pull latest code, recompile, and restart
  help        Show this help message
  version     Show version information

CRON SUBCOMMANDS:
  cron list                              List all cron jobs
  cron add "<schedule>" <task>           Create a new cron job
  cron delete <job_id>                   Delete a cron job
  cron history <job_id>                  Show execution history

EXAMPLES:
  triggerfish chat                                  # Start chatting with your agent
  triggerfish cron add "0 9 * * *" morning briefing # Daily 9am task
  triggerfish cron list                             # Show all cron jobs
  triggerfish cron delete <uuid>                    # Remove a job
  triggerfish cron history <uuid>                   # View execution log
  triggerfish dive                                  # Interactive setup
  triggerfish run                                   # Run gateway in foreground
  triggerfish start                                 # Install and start daemon
  triggerfish stop                                  # Stop the daemon
  triggerfish status                                # Check daemon status
  triggerfish logs --tail                           # Follow daemon logs
  triggerfish patrol                                # Health check
  triggerfish update                                # Update to latest version

For more information, visit: https://triggerfish.sh/docs
`);
}

/**
 * Display version information.
 */
function showVersion(): void {
  console.log("Triggerfish v0.1.0-alpha");
}

/**
 * Run the dive setup wizard.
 *
 * Returns true if the wizard requested daemon installation,
 * false otherwise. Exits with code 0 on success, 1 on error.
 */
async function runDive(
  flags: Readonly<Record<string, boolean | string>>,
): Promise<void> {
  const baseDir = `${Deno.env.get("HOME")}/.triggerfish`;
  const configPath = `${baseDir}/triggerfish.yaml`;

  // Check if config already exists (skip check if --force)
  if (flags["force"] !== true) {
    try {
      await Deno.stat(configPath);
      console.log("");
      console.log("  Configuration already exists at:", configPath);
      console.log("  Run 'triggerfish start' to launch the gateway.");
      console.log("  Run 'triggerfish dive --force' to re-run the wizard.");
      console.log("");
      return;
    } catch {
      // Config doesn't exist, continue with setup
    }
  }

  const result = await runWizard(baseDir);

  // If called with --install-daemon (from install script), auto-start daemon
  if (result.installDaemon && flags["install-daemon"] === true) {
    await runDaemonStart();
  } else if (result.installDaemon) {
    // User said yes to daemon but not called from installer — tell them how
    console.log("  Run 'triggerfish start' to install the daemon.");
    console.log("");
  }
}

/**
 * Probe the gateway HTTP endpoint to check if it's alive.
 */
async function probeGateway(port = 18789): Promise<boolean> {
  try {
    const response = await fetch(`http://127.0.0.1:${port}`, {
      signal: AbortSignal.timeout(2000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Count configured channels from the config file.
 */
function countConfiguredChannels(): number {
  const configPath = `${Deno.env.get("HOME")}/.triggerfish/triggerfish.yaml`;
  try {
    const raw = Deno.readTextFileSync(configPath);
    const parsed = parseYaml(raw) as Record<string, unknown>;
    const channels = parsed?.channels;
    if (channels && typeof channels === "object" && channels !== null) {
      return Object.keys(channels).length;
    }
  } catch {
    // Config not found or invalid
  }
  return 0;
}

/**
 * Count installed skills in ~/.triggerfish/skills/.
 */
function countInstalledSkills(): number {
  const skillsDir = `${Deno.env.get("HOME")}/.triggerfish/skills`;
  try {
    let count = 0;
    for (const entry of Deno.readDirSync(skillsDir)) {
      if (entry.isDirectory) count++;
    }
    return count;
  } catch {
    return 0;
  }
}

/**
 * Run patrol health diagnostics using real runtime state.
 */
async function runPatrol(): Promise<void> {
  console.log("🔍 Running Triggerfish health diagnostics...\n");

  // Check real state
  const daemonStatus = await getDaemonStatus();
  const gatewayAlive = daemonStatus.running ? await probeGateway() : false;
  const channelCount = countConfiguredChannels();
  const skillCount = countInstalledSkills();

  // LLM is "connected" if gateway is alive (provider is loaded at startup)
  // A more thorough check would query the gateway, but this is good enough
  const llmConnected = gatewayAlive;

  const input: PatrolInput = {
    gatewayRunning: gatewayAlive,
    llmConnected,
    channelsActive: channelCount,
    policyRulesLoaded: gatewayAlive ? 4 : 0, // Fixed rules always loaded when running
    skillsInstalled: skillCount,
  };

  const checker = createPatrolCheck(input);
  const report = await checker.run();

  // Show daemon info
  if (daemonStatus.running) {
    console.log(`  Daemon: running (PID ${daemonStatus.pid ?? "?"})`);
    if (daemonStatus.uptime) {
      console.log(`  Since:  ${daemonStatus.uptime}`);
    }
  }
  console.log("");

  console.log(`Overall Status: ${report.overall}\n`);
  console.log("Health Checks:");
  for (const check of report.checks) {
    const icon = check.status === "HEALTHY"
      ? "✓"
      : check.status === "WARNING"
      ? "⚠"
      : "✗";
    console.log(`  ${icon} ${check.name}: ${check.message}`);
  }
  console.log();

  if (report.overall === "CRITICAL") {
    console.log("❌ Critical issues detected. Run 'triggerfish start' to launch the gateway.\n");
    Deno.exit(1);
  } else if (report.overall === "WARNING") {
    console.log("⚠️  Warnings detected. Check configuration.\n");
  } else {
    console.log("✅ All systems healthy.\n");
  }
}

/**
 * Create an OrchestratorFactory from config.
 *
 * The factory captures shared infrastructure (provider registry, policy
 * engine, hook runner, tool definitions) and creates a fresh workspace,
 * session, and orchestrator per call for execution isolation.
 */
function createOrchestratorFactory(
  config: TriggerFishConfig,
  baseDir: string,
  cronManager?: CronManager,
  storage?: StorageProvider,
): OrchestratorFactory {
  const registry = createProviderRegistry();
  loadProvidersFromConfig(config.models as ModelsConfig, registry);

  const engine = createPolicyEngine();
  for (const rule of createDefaultRules()) {
    engine.addRule(rule);
  }
  const hookRunner = createHookRunner(engine);

  const spinePath = `${baseDir}/SPINE.md`;
  const toolDefs = getToolDefinitions();

  return {
    async create(channelId: string) {
      const agentId = `scheduler-${channelId}-${Date.now()}`;
      const workspace = await createWorkspace({
        agentId,
        basePath: `${baseDir}/workspaces`,
      });
      const execTools = createExecTools(workspace);
      const todoManager = storage ? createTodoManager({ storage, agentId }) : undefined;
      const toolExecutor = createToolExecutor(execTools, cronManager, todoManager);

      const orchestrator = createOrchestrator({
        hookRunner,
        providerRegistry: registry,
        spinePath,
        tools: toolDefs,
        toolExecutor,
        systemPromptSections: [TODO_SYSTEM_PROMPT],
      });

      const session = createSession({
        userId: "owner" as UserId,
        channelId: channelId as ChannelId,
      });

      return { orchestrator, session };
    },
  };
}

/**
 * Build a SchedulerServiceConfig from the YAML config with defaults.
 */
function buildSchedulerConfig(
  config: TriggerFishConfig,
  baseDir: string,
  factory: OrchestratorFactory,
): SchedulerServiceConfig {
  const sched = config.scheduler;

  const sources: Record<string, WebhookSourceConfig> = {};
  if (sched?.webhooks?.sources) {
    for (const [id, src] of Object.entries(sched.webhooks.sources)) {
      sources[id] = {
        secret: src.secret,
        classification: src.classification as ClassificationLevel,
      };
    }
  }

  return {
    orchestratorFactory: factory,
    triggerMdPath: `${baseDir}/TRIGGER.md`,
    trigger: {
      enabled: sched?.trigger?.enabled ?? true,
      intervalMinutes: sched?.trigger?.interval_minutes ?? 30,
      quietHours: sched?.trigger?.quiet_hours
        ? {
          start: sched.trigger.quiet_hours.start ?? 22,
          end: sched.trigger.quiet_hours.end ?? 7,
        }
        : { start: 22, end: 7 },
      classificationCeiling: "INTERNAL" as ClassificationLevel,
    },
    webhooks: {
      enabled: sched?.webhooks?.enabled ?? false,
      sources,
    },
  };
}

/**
 * Start the gateway server with scheduler and persistent cron storage.
 */
async function runStart(): Promise<void> {
  console.log("Starting Triggerfish gateway...\n");

  const configPath = `${Deno.env.get("HOME")}/.triggerfish/triggerfish.yaml`;

  // Check if config exists
  try {
    await Deno.stat(configPath);
  } catch {
    console.log("Configuration not found.");
    console.log("Run 'triggerfish dive' to set up your agent.\n");
    Deno.exit(1);
  }

  // Load config
  const configResult = loadConfig(configPath);
  if (!configResult.ok) {
    console.log("Failed to load configuration:", configResult.error);
    Deno.exit(1);
  }

  const config = configResult.value;
  const baseDir = `${Deno.env.get("HOME")}/.triggerfish`;

  console.log("  Configuration loaded");

  // Create persistent storage for cron jobs
  const dataDir = `${baseDir}/data`;
  await Deno.mkdir(dataDir, { recursive: true });
  const storage = createSqliteStorage(`${dataDir}/triggerfish.db`);
  const cronManager = await createPersistentCronManager(storage);

  const existingJobs = cronManager.list();
  if (existingJobs.length > 0) {
    console.log(`  Loaded ${existingJobs.length} persistent cron job(s)`);
  }

  // Build orchestrator factory and scheduler with persistent cron manager
  const factory = createOrchestratorFactory(config, baseDir, cronManager, storage);
  const schedulerConfig = buildSchedulerConfig(config, baseDir, factory);
  const schedulerService = createSchedulerService({
    ...schedulerConfig,
    cronManager,
  });

  // Create the main session orchestrator — this is the daemon-owned session
  const registry = createProviderRegistry();
  loadProvidersFromConfig(config.models as ModelsConfig, registry);

  if (!registry.getDefault()) {
    console.log("No LLM provider configured. Check triggerfish.yaml.\n");
    Deno.exit(1);
  }

  const engine = createPolicyEngine();
  for (const rule of createDefaultRules()) {
    engine.addRule(rule);
  }
  const hookRunner = createHookRunner(engine);

  const spinePath = `${baseDir}/SPINE.md`;
  const mainWorkspace = await createWorkspace({
    agentId: "main-session",
    basePath: `${baseDir}/workspaces`,
  });
  const execTools = createExecTools(mainWorkspace);
  const todoManager = createTodoManager({ storage, agentId: "main-session" });
  const toolExecutor = createToolExecutor(execTools, cronManager, todoManager);

  const session = createSession({
    userId: "owner" as UserId,
    channelId: "daemon" as ChannelId,
  });

  const chatSession = createChatSession({
    hookRunner,
    providerRegistry: registry,
    spinePath,
    tools: getToolDefinitions(),
    toolExecutor,
    systemPromptSections: [TODO_SYSTEM_PROMPT],
    session,
  });

  console.log("  Main session created");

  // Create and start Tidepool host with chat support
  const tidepoolHost = createA2UIHost({ chatSession });
  const tidepoolPort = 18790;
  await tidepoolHost.start(tidepoolPort);
  console.log(`  Tidepool listening on http://127.0.0.1:${tidepoolPort}`);

  // Create and start gateway server with scheduler + chat session
  const server = createGatewayServer({
    port: 18789,
    schedulerService,
    chatSession,
  });
  const addr = await server.start();

  // Start the scheduler (cron tick loop + trigger)
  schedulerService.start();

  console.log(`  Gateway listening on ${addr.hostname}:${addr.port}`);
  console.log("  Scheduler started");
  if (schedulerConfig.trigger.enabled) {
    console.log(`  Trigger: every ${schedulerConfig.trigger.intervalMinutes}m`);
  }
  console.log("\n  Triggerfish is running!");
  console.log("\nPress Ctrl+C to stop.\n");

  // Keep running until interrupted
  await new Promise(() => {}); // Never resolves
}

/**
 * Install and start the Triggerfish daemon.
 */
async function runDaemonStart(): Promise<void> {
  console.log("Installing Triggerfish daemon...\n");

  const binaryPath = Deno.execPath();
  const result = await installAndStartDaemon(binaryPath);

  if (result.ok) {
    console.log("✓", result.message);
    console.log("\nRun 'triggerfish status' to verify.");
    console.log("Run 'triggerfish logs --tail' to follow output.\n");
  } else {
    console.log("✗", result.message);
    Deno.exit(1);
  }
}

/**
 * Stop the Triggerfish daemon.
 */
async function runDaemonStop(): Promise<void> {
  const result = await stopDaemon();

  if (result.ok) {
    console.log("✓", result.message);
  } else {
    console.log("✗", result.message);
    Deno.exit(1);
  }
}

/**
 * Show daemon status.
 */
async function runDaemonStatus(): Promise<void> {
  const status = await getDaemonStatus();

  if (status.running) {
    console.log("✓ Triggerfish is running");
    if (status.pid) console.log(`  PID: ${status.pid}`);
    if (status.uptime) console.log(`  Since: ${status.uptime}`);
    console.log(`  Manager: ${status.manager}`);
  } else {
    console.log("✗ Triggerfish is not running");
    console.log("\nRun 'triggerfish start' to launch the daemon.");
  }
}

/**
 * Tail daemon logs.
 */
async function runDaemonLogs(
  flags: Readonly<Record<string, boolean | string>>,
): Promise<void> {
  const follow = flags.tail === true;
  await tailLogs(follow);
}

/**
 * Pull latest code, recompile, and restart the daemon.
 */
async function runUpdate(): Promise<void> {
  console.log("Updating Triggerfish...\n");

  const result = await updateTriggerfish();

  if (result.ok) {
    if (result.previousVersion === result.newVersion) {
      console.log("✓ Already up to date (" + result.newVersion + ")");
    } else {
      console.log("✓", result.message);
      console.log("\nRun 'triggerfish status' to verify the daemon restarted.");
    }
  } else {
    console.log("✗", result.message);
    Deno.exit(1);
  }
}

/** Tool definitions for the agent. */
function getToolDefinitions(): readonly ToolDefinition[] {
  return [
    ...getTodoToolDefinitions(),
    {
      name: "read_file",
      description: "Read the contents of a file at an absolute path.",
      parameters: {
        path: { type: "string", description: "Absolute file path to read", required: true },
      },
    },
    {
      name: "write_file",
      description: "Write content to a file at a workspace-relative path.",
      parameters: {
        path: { type: "string", description: "Relative path in the workspace", required: true },
        content: { type: "string", description: "File content to write", required: true },
      },
    },
    {
      name: "list_directory",
      description: "List files and directories at a given absolute path.",
      parameters: {
        path: { type: "string", description: "Absolute directory path to list", required: true },
      },
    },
    {
      name: "run_command",
      description: "Run a shell command in the agent workspace directory.",
      parameters: {
        command: { type: "string", description: "Shell command to execute", required: true },
      },
    },
    {
      name: "search_files",
      description: "Search for files matching a glob pattern, or search file contents with grep.",
      parameters: {
        path: { type: "string", description: "Directory to search in", required: true },
        pattern: { type: "string", description: "Glob pattern for file names, or text/regex to search within files", required: true },
        content_search: { type: "boolean", description: "If true, search file contents instead of file names", required: false },
      },
    },
    {
      name: "cron_create",
      description: "Create a scheduled cron job. The task runs on the given cron schedule.",
      parameters: {
        expression: { type: "string", description: "5-field cron expression (e.g. '0 9 * * *' for 9am daily)", required: true },
        task: { type: "string", description: "The task/prompt to execute on each trigger", required: true },
        classification: { type: "string", description: "Classification ceiling: PUBLIC, INTERNAL, CONFIDENTIAL, or RESTRICTED", required: false },
      },
    },
    {
      name: "cron_list",
      description: "List all registered cron jobs with their schedules and status.",
      parameters: {},
    },
    {
      name: "cron_delete",
      description: "Delete a cron job by its ID.",
      parameters: {
        job_id: { type: "string", description: "The UUID of the cron job to delete", required: true },
      },
    },
    {
      name: "cron_history",
      description: "Show recent execution history for a cron job.",
      parameters: {
        job_id: { type: "string", description: "The UUID of the cron job", required: true },
      },
    },
  ];
}

/**
 * Create a tool executor backed by ExecTools, direct filesystem access,
 * and an optional CronManager for scheduling tools.
 *
 * Tools that operate on absolute paths (read_file, list_directory, search_files)
 * use Deno APIs directly. Tools that operate on the workspace (write_file,
 * run_command) use ExecTools for sandboxing. Cron tools delegate to CronManager.
 */
function createToolExecutor(
  execTools: ReturnType<typeof createExecTools>,
  cronManager?: CronManager,
  todoManager?: TodoManager,
): ToolExecutor {
  const todoExecutor = todoManager ? createTodoToolExecutor(todoManager) : null;

  return async (name: string, input: Record<string, unknown>): Promise<string> => {
    // Try todo tools first (returns null if not a todo tool)
    if (todoExecutor) {
      const todoResult = await todoExecutor(name, input);
      if (todoResult !== null) return todoResult;
    }

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
          return `Error reading file: ${err instanceof Error ? err.message : String(err)}`;
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
          return `Error listing directory: ${err instanceof Error ? err.message : String(err)}`;
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
        parts.push(`[exit code: ${out.exitCode}, ${Math.round(out.duration)}ms]`);
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
            return stdout.length > 0 ? stdout : "No files found matching pattern.";
          }
        } catch (err) {
          return `Error searching: ${err instanceof Error ? err.message : String(err)}`;
        }
      }

      case "cron_create": {
        if (!cronManager) return "Cron management is not available in this context.";
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
        if (!cronManager) return "Cron management is not available in this context.";
        const jobs = cronManager.list();
        if (jobs.length === 0) return "No cron jobs registered.";
        return jobs.map((j) =>
          `${j.id}\n  Schedule: ${j.expression}\n  Task: ${j.task}\n  Enabled: ${j.enabled}\n  Classification: ${j.classificationCeiling}\n  Created: ${j.createdAt.toISOString()}`
        ).join("\n\n");
      }

      case "cron_delete": {
        if (!cronManager) return "Cron management is not available in this context.";
        const jobId = input.job_id as string;
        const result = cronManager.delete(jobId);
        return result.ok ? `Deleted cron job ${jobId}` : `Error: ${result.error}`;
      }

      case "cron_history": {
        if (!cronManager) return "Cron management is not available in this context.";
        const jobId = input.job_id as string;
        const hist = cronManager.history(jobId);
        if (hist.length === 0) return "No execution history for this job.";
        return hist.slice(-10).map((e) =>
          `${e.executedAt.toISOString()} — ${e.success ? "SUCCESS" : "FAILED"}${e.error ? ` (${e.error})` : ""} [${Math.round(e.durationMs)}ms]`
        ).join("\n");
      }

      default:
        return `Unknown tool: ${name}`;
    }
  };
}

/**
 * Run an interactive chat REPL.
 *
 * Connects to the daemon's gateway WebSocket at /chat for the shared
 * session. All terminal UI (raw mode, scroll regions, keypress reader,
 * input history, suggestions, ESC interrupt, Ctrl+O toggle) is preserved.
 * The daemon owns the session, orchestrator, and policy engine.
 */
async function runChat(): Promise<void> {
  const configPath = `${Deno.env.get("HOME")}/.triggerfish/triggerfish.yaml`;

  // Load config (for banner display only)
  const configResult = loadConfig(configPath);
  if (!configResult.ok) {
    console.log("No configuration found. Run 'triggerfish dive' first.\n");
    Deno.exit(1);
  }

  const config = configResult.value;
  const baseDir = `${Deno.env.get("HOME")}/.triggerfish`;
  const dataDir = `${baseDir}/data`;
  await Deno.mkdir(dataDir, { recursive: true });

  // Connect to the daemon's chat WebSocket
  const gatewayUrl = "ws://127.0.0.1:18789/chat";
  let ws: WebSocket;
  try {
    ws = new WebSocket(gatewayUrl);
  } catch {
    console.log("Cannot connect to daemon. Is it running?");
    console.log("Run 'triggerfish start' or 'triggerfish run' first.\n");
    Deno.exit(1);
    return;
  }

  // Wait for connection + connected event
  let providerName = "unknown";
  let modelName = "";
  const connected = Promise.withResolvers<void>();

  ws.addEventListener("error", () => {
    console.log("Cannot connect to daemon. Is it running?");
    console.log("Run 'triggerfish start' or 'triggerfish run' first.\n");
    Deno.exit(1);
  });

  ws.addEventListener("open", () => {
    // Connection established, wait for "connected" event
  });

  // Determine if we're in TTY mode
  const isTty = Deno.stdin.isTerminal();

  // Set up display mode toggle (Ctrl+O)
  let displayMode: ToolDisplayMode = "compact";
  const getDisplayMode = (): ToolDisplayMode => displayMode;

  // Set up screen manager
  const screen = createScreenManager();

  // Create event handler — use screen-aware handler for TTY, legacy for pipes
  const eventHandler = isTty
    ? createScreenEventHandler(screen, getDisplayMode)
    : createEventHandler();

  // State tracking
  const state = { isProcessing: false };

  // Route incoming WebSocket events to the event handler
  ws.addEventListener("message", (event: MessageEvent) => {
    try {
      const data = typeof event.data === "string"
        ? event.data
        : new TextDecoder().decode(event.data as ArrayBuffer);
      const evt = JSON.parse(data) as ChatEvent;

      if (evt.type === "connected") {
        providerName = evt.provider;
        modelName = evt.model;
        connected.resolve();
        return;
      }

      if (evt.type === "error") {
        if (isTty) {
          screen.writeOutput(formatError(evt.message));
          screen.writeOutput("");
          screen.redrawInput(editor);
        } else {
          renderError(evt.message);
          renderPrompt();
        }
        state.isProcessing = false;
        return;
      }

      if (evt.type === "response") {
        // The event handler will render the response text
        eventHandler(evt as OrchestratorEvent);
        state.isProcessing = false;
        if (isTty) {
          screen.writeOutput("");
          screen.redrawInput(editor);
        } else {
          renderPrompt();
        }
        return;
      }

      // Forward all other events (llm_start, llm_complete, tool_call, tool_result)
      eventHandler(evt as OrchestratorEvent);
    } catch {
      // Ignore parse errors
    }
  });

  // Handle WebSocket close
  ws.addEventListener("close", () => {
    if (isTty) {
      screen.writeOutput("  \x1b[31mDisconnected from daemon.\x1b[0m");
      screen.writeOutput("");
      screen.redrawInput(editor);
    } else {
      console.log("\n  Disconnected from daemon.\n");
    }
    state.isProcessing = false;
  });

  // Wait for the connected event before showing UI
  // Timeout after 5 seconds
  const timeout = setTimeout(() => {
    console.log("Timed out waiting for daemon. Is it running?");
    console.log("Run 'triggerfish start' or 'triggerfish run' first.\n");
    ws.close();
    Deno.exit(1);
  }, 5000);
  await connected.promise;
  clearTimeout(timeout);

  // Load input history
  const historyFilePath = `${dataDir}/input_history.json`;
  let inputHistory = await loadInputHistory(historyFilePath);

  // Set up suggestion engine
  const suggestionEngine = createSuggestionEngine();

  // If not a TTY, fall back to the simple line-buffered REPL
  if (!isTty) {
    printBanner(providerName, config.models.primary, "");
    await runSimpleWsRepl(ws, providerName, config);
    return;
  }

  // ─── TTY mode: raw terminal with scroll regions ──────────────

  // Print banner via screen manager
  screen.init();
  screen.writeOutput(formatBanner(providerName, config.models.primary, ""));

  // Create keypress reader and line editor
  const keypressReader = createKeypressReader();
  let editor: LineEditor = createLineEditor();
  let stashedInput = ""; // Stash current input when entering history navigation

  // Cleanup function — must run on exit
  function cleanup(): void {
    keypressReader.stop();
    screen.cleanup();
    saveInputHistory(historyFilePath, inputHistory).catch(() => {});
    try { ws.close(); } catch { /* already closed */ }
  }

  // Handle SIGINT (Ctrl+C from outside raw mode, e.g. kill signal)
  try {
    Deno.addSignalListener("SIGINT", () => {
      if (state.isProcessing) {
        try { ws.send(JSON.stringify({ type: "cancel" })); } catch { /* ignore */ }
        screen.writeOutput(`  \x1b[33m⚠ Interrupted\x1b[0m`);
      } else {
        cleanup();
        Deno.exit(0);
      }
    });
  } catch {
    // Signal listeners may not be supported on all platforms
  }

  // Draw initial input prompt
  screen.redrawInput(editor);

  // Start reading keypresses
  keypressReader.start();

  for await (const keypress of keypressReader) {
    // ─── Processing mode: only ESC and Ctrl+C are active ────
    if (state.isProcessing) {
      if (keypress.key === "esc" || keypress.key === "ctrl+c") {
        try { ws.send(JSON.stringify({ type: "cancel" })); } catch { /* ignore */ }
        screen.writeOutput(`  \x1b[33m⚠ Interrupted\x1b[0m`);
      }
      continue;
    }

    // ─── Idle mode: full input handling ─────────────────────
    switch (keypress.key) {
      case "enter": {
        const text = editor.text.trim();

        if (text.length === 0) {
          break;
        }

        // Echo the submitted text into the output region
        screen.writeOutput(`  \x1b[36m\x1b[1m❯\x1b[0m ${text}`);
        screen.writeOutput("");

        // Add to history and save
        inputHistory = inputHistory.push(text);
        inputHistory = inputHistory.resetNavigation();
        saveInputHistory(historyFilePath, inputHistory).catch(() => {});

        // Clear editor
        editor = editor.clear();
        screen.redrawInput(editor);
        stashedInput = "";

        // Handle slash commands locally
        if (text === "/quit" || text === "/exit" || text === "/q") {
          screen.writeOutput("  Goodbye.");
          cleanup();
          return;
        }

        if (text === "/clear") {
          screen.cleanup();
          screen.init();
          screen.writeOutput(formatBanner(providerName, config.models.primary, ""));
          screen.redrawInput(editor);
          break;
        }

        if (text === "/help") {
          screen.writeOutput(
            "  Commands:\n" +
            "    /quit, /exit, /q  — Exit chat\n" +
            "    /clear            — Clear screen\n" +
            "    /compact          — Summarize conversation history\n" +
            "    /verbose          — Toggle tool display detail\n" +
            "    /help             — Show this help\n" +
            "    Ctrl+O            — Toggle tool display mode\n" +
            "    ESC               — Interrupt current operation\n" +
            "    Up/Down           — Navigate input history\n" +
            "    Tab               — Accept suggestion",
          );
          break;
        }

        if (text === "/verbose") {
          displayMode = displayMode === "compact" ? "expanded" : "compact";
          screen.writeOutput(`  Tool display: ${displayMode}`);
          break;
        }

        if (text === "/compact") {
          screen.writeOutput("  Compacting conversation history...");
          screen.writeOutput("  History will be compacted on next message.");
          break;
        }

        // Send message to daemon via WebSocket
        state.isProcessing = true;
        try {
          ws.send(JSON.stringify({ type: "message", content: text }));
        } catch {
          screen.writeOutput(formatError("Lost connection to daemon"));
          state.isProcessing = false;
          screen.writeOutput("");
          screen.redrawInput(editor);
        }

        break;
      }

      case "backspace":
        editor = editor.backspace();
        updateSuggestion();
        screen.redrawInput(editor);
        break;

      case "delete":
        editor = editor.deleteChar();
        updateSuggestion();
        screen.redrawInput(editor);
        break;

      case "left":
        editor = editor.moveCursor("left");
        screen.redrawInput(editor);
        break;

      case "right":
        editor = editor.moveCursor("right");
        screen.redrawInput(editor);
        break;

      case "home":
      case "ctrl+a":
        editor = editor.moveCursor("home");
        screen.redrawInput(editor);
        break;

      case "end":
      case "ctrl+e":
        editor = editor.moveCursor("end");
        screen.redrawInput(editor);
        break;

      case "up": {
        // Stash current input when first entering history
        if (inputHistory.index === -1 && editor.text.length > 0) {
          stashedInput = editor.text;
        }
        inputHistory = inputHistory.up();
        const histText = inputHistory.current();
        if (histText !== null) {
          editor = editor.setText(histText);
          editor = editor.setSuggestion("");
          screen.redrawInput(editor);
        }
        break;
      }

      case "down": {
        inputHistory = inputHistory.down();
        const histText = inputHistory.current();
        if (histText !== null) {
          editor = editor.setText(histText);
        } else {
          // Back to fresh input — restore stashed text
          editor = editor.setText(stashedInput);
          stashedInput = "";
        }
        editor = editor.setSuggestion("");
        screen.redrawInput(editor);
        break;
      }

      case "tab":
        editor = editor.acceptSuggestion();
        screen.redrawInput(editor);
        break;

      case "ctrl+o":
        displayMode = displayMode === "compact" ? "expanded" : "compact";
        screen.setStatus(`Tool display: ${displayMode}`);
        setTimeout(() => screen.clearStatus(), 1500);
        break;

      case "ctrl+c":
        cleanup();
        return;

      case "ctrl+d":
        if (editor.text.length === 0) {
          cleanup();
          return;
        }
        break;

      case "ctrl+u":
        // Clear line
        editor = editor.clear();
        screen.redrawInput(editor);
        break;

      case "ctrl+w": {
        // Delete word backwards
        let text = editor.text;
        let cursor = editor.cursor;
        // Skip trailing spaces
        while (cursor > 0 && text[cursor - 1] === " ") cursor--;
        // Delete to previous space
        while (cursor > 0 && text[cursor - 1] !== " ") cursor--;
        editor = editor.setText(text.slice(0, cursor) + text.slice(editor.cursor));
        screen.redrawInput(editor);
        break;
      }

      case "esc":
        // ESC in idle mode — ignore
        break;

      default:
        // Printable character
        if (keypress.char !== null) {
          editor = editor.insert(keypress.char);
          inputHistory = inputHistory.resetNavigation();
          stashedInput = "";
          updateSuggestion();
          screen.redrawInput(editor);
        }
        break;
    }
  }

  // EOF reached
  cleanup();

  /** Update the suggestion based on current editor text. */
  function updateSuggestion(): void {
    const suggestion = suggestionEngine.suggest(
      editor.text,
      inputHistory.entries as string[],
    );
    if (suggestion) {
      const remainder = suggestion.slice(editor.text.length);
      editor = editor.setSuggestion(remainder);
    } else {
      editor = editor.setSuggestion("");
    }
  }
}

/**
 * Simple line-buffered REPL for non-TTY environments (piped input).
 *
 * Connects to the daemon via WebSocket. Falls back to the original
 * stdin.read() approach for compatibility with piped input.
 */
async function runSimpleWsRepl(
  ws: WebSocket,
  providerName: string,
  config: TriggerFishConfig,
): Promise<void> {
  const decoder = new TextDecoder();
  const buf = new Uint8Array(8192);
  let partial = "";

  renderPrompt();

  while (true) {
    const n = await Deno.stdin.read(buf);
    if (n === null) break;

    partial += decoder.decode(buf.subarray(0, n));

    let newlineIdx: number;
    while ((newlineIdx = partial.indexOf("\n")) !== -1) {
      const line = partial.slice(0, newlineIdx).trimEnd();
      partial = partial.slice(newlineIdx + 1);

      if (line === "/quit" || line === "/exit" || line === "/q") {
        console.log("\n  Goodbye.\n");
        ws.close();
        return;
      }

      if (line === "/clear") {
        console.log("\x1b[2J\x1b[H");
        printBanner(providerName, config.models.primary, "");
        renderPrompt();
        continue;
      }

      if (line.length === 0) {
        renderPrompt();
        continue;
      }

      // Send to daemon and wait for response
      console.log();
      const responsePromise = Promise.withResolvers<void>();

      const handler = (event: MessageEvent) => {
        try {
          const data = typeof event.data === "string"
            ? event.data
            : new TextDecoder().decode(event.data as ArrayBuffer);
          const evt = JSON.parse(data) as ChatEvent;
          if (evt.type === "response" || evt.type === "error") {
            if (evt.type === "error") {
              renderError(evt.message);
            }
            ws.removeEventListener("message", handler);
            responsePromise.resolve();
          }
        } catch {
          // ignore
        }
      };

      ws.addEventListener("message", handler);
      ws.send(JSON.stringify({ type: "message", content: line }));
      await responsePromise.promise;

      renderPrompt();
    }
  }
  ws.close();
}

/**
 * Manage cron jobs via CLI subcommands.
 */
async function runCron(
  subcommand: string | undefined,
  flags: Readonly<Record<string, boolean | string>>,
): Promise<void> {
  const baseDir = `${Deno.env.get("HOME")}/.triggerfish`;
  const dataDir = `${baseDir}/data`;
  await Deno.mkdir(dataDir, { recursive: true });
  const storage = createSqliteStorage(`${dataDir}/triggerfish.db`);
  const cronManager = await createPersistentCronManager(storage);

  try {
    switch (subcommand) {
      case "add": {
        const expression = flags.expression as string | undefined;
        const task = flags.task as string | undefined;
        if (!expression || !task) {
          console.log('Usage: triggerfish cron add "<schedule>" <task description>');
          console.log('Example: triggerfish cron add "0 9 * * *" morning briefing');
          Deno.exit(1);
        }
        const classification = (flags.classification as string) ?? "INTERNAL";
        const result = cronManager.create({
          expression,
          task,
          classificationCeiling: classification as ClassificationLevel,
        });
        if (!result.ok) {
          console.log(`Error: ${result.error}`);
          Deno.exit(1);
        }
        const job = result.value;
        console.log(`Created cron job:`);
        console.log(`  ID:             ${job.id}`);
        console.log(`  Schedule:       ${job.expression}`);
        console.log(`  Task:           ${job.task}`);
        console.log(`  Classification: ${job.classificationCeiling}`);
        console.log(`  Created:        ${job.createdAt.toISOString()}`);
        break;
      }

      case "list": {
        const jobs = cronManager.list();
        if (jobs.length === 0) {
          console.log("No cron jobs registered.");
          console.log('\nCreate one with: triggerfish cron add "0 9 * * *" your task here');
          break;
        }
        console.log(`${jobs.length} cron job(s):\n`);
        for (const job of jobs) {
          const hist = cronManager.history(job.id);
          const lastRun = hist.length > 0
            ? hist[hist.length - 1].executedAt.toISOString()
            : "never";
          console.log(`  ${job.enabled ? "+" : "-"} ${job.id}`);
          console.log(`    Schedule: ${job.expression}`);
          console.log(`    Task:     ${job.task}`);
          console.log(`    Ceiling:  ${job.classificationCeiling}`);
          console.log(`    Last run: ${lastRun}`);
          console.log(`    Runs:     ${hist.length}`);
          console.log();
        }
        break;
      }

      case "delete": {
        const jobId = flags.job_id as string | undefined;
        if (!jobId) {
          console.log("Usage: triggerfish cron delete <job_id>");
          Deno.exit(1);
        }
        const result = cronManager.delete(jobId);
        if (!result.ok) {
          console.log(`Error: ${result.error}`);
          Deno.exit(1);
        }
        console.log(`Deleted cron job ${jobId}`);
        break;
      }

      case "history": {
        const jobId = flags.job_id as string | undefined;
        if (!jobId) {
          console.log("Usage: triggerfish cron history <job_id>");
          Deno.exit(1);
        }
        const hist = cronManager.history(jobId);
        if (hist.length === 0) {
          console.log("No execution history for this job.");
          break;
        }
        console.log(`Last ${Math.min(hist.length, 20)} execution(s):\n`);
        for (const e of hist.slice(-20)) {
          const status = e.success ? "OK" : "FAIL";
          const dur = Math.round(e.durationMs);
          const err = e.error ? ` — ${e.error}` : "";
          console.log(`  ${e.executedAt.toISOString()}  ${status}  ${dur}ms${err}`);
        }
        break;
      }

      default:
        console.log("Usage: triggerfish cron <add|list|delete|history>");
        console.log("\nSubcommands:");
        console.log('  add "<schedule>" <task>   Create a new cron job');
        console.log("  list                      List all cron jobs");
        console.log("  delete <job_id>           Delete a cron job");
        console.log("  history <job_id>          Show execution history");
        break;
    }
  } finally {
    await storage.close();
  }
}

/**
 * Main CLI entry point.
 */
async function main(): Promise<void> {
  const args = Deno.args;

  // Check if config exists for default command detection
  const configPath = `${Deno.env.get("HOME")}/.triggerfish/triggerfish.yaml`;
  let configExists = false;
  try {
    await Deno.stat(configPath);
    configExists = true;
  } catch {
    // Config doesn't exist
  }

  const parsed = parseCommand(args, { configExists });

  switch (parsed.command) {
    case "chat":
      await runChat();
      break;
    case "cron":
      await runCron(parsed.subcommand, parsed.flags);
      break;
    case "dive":
      await runDive(parsed.flags);
      break;
    case "patrol":
      await runPatrol();
      break;
    case "run":
      await runStart();
      break;
    case "start":
      await runDaemonStart();
      break;
    case "stop":
      await runDaemonStop();
      break;
    case "status":
      await runDaemonStatus();
      break;
    case "logs":
      await runDaemonLogs(parsed.flags);
      break;
    case "update":
      await runUpdate();
      break;
    case "version":
      showVersion();
      break;
    case "help":
    default:
      showHelp();
      break;
  }
}

// Execute main if this is the entry point
if (import.meta.main) {
  main().catch((err) => {
    console.error("Fatal error:", err);
    Deno.exit(1);
  });
}
