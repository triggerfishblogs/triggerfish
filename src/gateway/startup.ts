/**
 * Gateway startup — brings up the full Triggerfish runtime.
 *
 * Loads config, wires all subsystems (orchestrator, scheduler, channels,
 * MCP servers, Tidepool, gateway WebSocket server), and keeps the process
 * alive until SIGTERM/SIGINT.
 *
 * Sub-modules:
 * - startup_channels.ts: Channel adapter wiring (Telegram, Discord, Signal)
 * - startup_mcp.ts: MCP server connection and status broadcasting
 * - startup_subsystems.ts: Obsidian, skill discovery, CLI secret prompt
 *
 * @module
 */

import { join } from "@std/path";
import { isDockerEnvironment } from "../core/env.ts";
import { createGatewayServer } from "./server.ts";
import {
  createSessionToolExecutor,
} from "./tools.ts";
import type { RegisteredChannel } from "./tools.ts";
import { createEnhancedSessionManager } from "./sessions.ts";
import { createSessionManager } from "../core/session/manager.ts";
import { createChatSession } from "./chat.ts";
import { createA2UIHost } from "../tools/tidepool/host.ts";
import {
  createTidepoolToolExecutor,
  createTidePoolTools,
  TIDEPOOL_SYSTEM_PROMPT,
} from "../tools/tidepool/mod.ts";
import {
  mapToolPrefixClassifications,
} from "../agent/orchestrator.ts";
import type { ToolDefinition } from "../core/types/tool.ts";
import { createProviderRegistry } from "../agent/llm.ts";
import {
  loadProvidersFromConfig,
  resolveVisionProvider,
} from "../agent/providers/config.ts";
import type { ModelsConfig } from "../agent/providers/config.ts";
import { createPolicyEngine } from "../core/policy/engine.ts";
import { createDefaultRules, createHookRunner } from "../core/policy/hooks.ts";
import { createSession, updateTaint } from "../core/types/session.ts";
import type { ChannelId, UserId } from "../core/types/session.ts";
import type { ClassificationLevel } from "../core/types/classification.ts";
import { createWorkspace } from "../exec/workspace.ts";
import { createExecTools } from "../exec/tools.ts";
import {
  createClaudeSessionManager,
  createClaudeToolExecutor,
} from "../exec/claude.ts";
import { createPathClassifier } from "../core/security/path_classification.ts";
import { createToolFloorRegistry } from "../core/security/tool_floors.ts";
import { createSchedulerService } from "../scheduler/service.ts";
import { createTriggerStore } from "../scheduler/trigger_store.ts";
import { createPersistentCronManager } from "../scheduler/cron.ts";
import { createSqliteStorage } from "../core/storage/sqlite.ts";
import {
  createHealthcheckToolExecutor,
  createLlmTaskToolExecutor,
  createSummarizeToolExecutor,
  createTodoManager,
} from "../tools/mod.ts";
import {
  createFts5SearchProvider,
  createMemoryStore,
  createMemoryToolExecutor,
} from "../tools/memory/mod.ts";
import {
  createDomainPolicy as createBrowserDomainPolicy,
  createAutoLaunchBrowserExecutor,
  createBrowserManager,
} from "../tools/browser/mod.ts";
import {
  createImageToolExecutor,
} from "../tools/image/mod.ts";
import {
  createExploreToolExecutor,
} from "../tools/explore/mod.ts";
import {
  createGitHubClient,
  createGitHubToolExecutor,
  resolveGitHubToken,
} from "../integrations/github/mod.ts";
import { createKeychain } from "../core/secrets/keychain.ts";
import {
  createSecretToolExecutor,
} from "../tools/secrets.ts";
import type { SecretPromptCallback } from "../tools/secrets.ts";
import { createPairingService } from "../channels/pairing.ts";
import {
  wireDiscordChannel,
  wireSignalChannel,
  wireTelegramChannel,
} from "./startup_channels.ts";
import type {
  DiscordChannelConfig,
  SignalChannelConfig,
  TelegramChannelConfig,
} from "./startup_channels.ts";
import { createNotificationService } from "./notifications.ts";
import {
  createTriggerToolExecutor,
} from "./trigger_tools.ts";
import { parseClassification } from "../core/types/classification.ts";
import { createSkillToolExecutor } from "../tools/skills/mod.ts";
import {
  createFileWriter,
  createLogger,
  initLogger,
  parseUserLogLevel,
  shutdownLogger,
  USER_LEVEL_MAP,
} from "../core/logger/mod.ts";
import { logDir as resolveLogDir } from "../cli/daemon.ts";
import { loadConfigWithSecrets } from "../core/config.ts";
import { resolveBaseDir, resolveConfigPath } from "../cli/paths.ts";
import { TIDEPOOL_PORT } from "../cli/constants.ts";
import { buildSkillsSystemPrompt, buildTriggersSystemPrompt } from "../tools/skills/prompts.ts";
import {
  buildGoogleExecutor,
  buildSchedulerConfig,
  buildSubagentFactory,
  buildWebTools,
  createOrchestratorFactory,
} from "./factory.ts";
import { createToolExecutor, resolveToolsForProfile, resolvePromptsForProfile, TOOL_GROUPS } from "./agent_tools.ts";
import { createPlanManager, createPlanToolExecutor } from "../agent/plan.ts";
import { wireMcpServers } from "./startup_mcp.ts";
import type { McpBroadcastRefs } from "./startup_mcp.ts";
import {
  buildObsidianExecutor,
  createCliSecretPrompt,
  discoverSkills,
} from "./startup_subsystems.ts";
import type { ObsidianPluginConfig } from "./startup_subsystems.ts";

/**
 * Start the gateway server with scheduler and persistent cron storage.
 */
export async function runStart(): Promise<void> {
  console.log("Starting Triggerfish gateway...\n");

  const baseDir = resolveBaseDir();
  const configPath = resolveConfigPath(baseDir);

  // Check if config exists
  try {
    await Deno.stat(configPath);
  } catch {
    if (isDockerEnvironment()) {
      console.error(`No configuration found at ${configPath}\n`);
      console.error("Option 1: Mount your config file:");
      console.error(
        "  docker run -v ./triggerfish.yaml:/data/triggerfish.yaml triggerfish/triggerfish\n",
      );
      console.error("Option 2: Run the setup wizard interactively:");
      console.error(
        "  docker run -it -v triggerfish-data:/data triggerfish/triggerfish dive\n",
      );
    } else {
      console.log("Configuration not found.");
      console.log("Run 'triggerfish dive' to set up your agent.\n");
    }
    Deno.exit(1);
  }

  // Create default directories on first run
  for (const sub of ["logs", "data", "skills"]) {
    await Deno.mkdir(join(baseDir, sub), { recursive: true });
  }
  if (isDockerEnvironment()) {
    await Deno.mkdir(join(baseDir, "workspace"), { recursive: true });
  }

  // Initialize structured logger early so we capture startup.
  // On Windows, when running as a service the C# wrapper already captures
  // stdout/stderr to triggerfish.log via a StreamWriter. Opening the same
  // file from Deno causes EBUSY (os error 32) because Windows file locks
  // are mandatory. Skip the FileWriter in that case — stderr output is
  // sufficient since the service wrapper redirects it to the log file.
  const isWindowsService = Deno.build.os === "windows" &&
    !Deno.stdout.isTerminal();
  const fileWriter = isWindowsService
    ? undefined
    : await createFileWriter({ logDir: resolveLogDir() });
  initLogger({ level: "INFO", fileWriter, console: true });
  let log = createLogger("main");

  // Load config and resolve secret references from OS keychain
  const keychainForConfig = createKeychain();
  const configResult = await loadConfigWithSecrets(configPath, keychainForConfig);
  if (!configResult.ok) {
    log.error("Failed to load configuration:", configResult.error);
    Deno.exit(1);
  }

  const config = configResult.value;

  // Re-initialize logger with YAML-configured level.
  // Priority: logging.level in triggerfish.yaml > TRIGGERFISH_DEBUG=1 compat > "normal"
  const debugCompat = Deno.env.get("TRIGGERFISH_DEBUG") === "1" ? "debug" : undefined;
  const userLevel = parseUserLogLevel(config.logging?.level ?? debugCompat ?? "normal");
  initLogger({
    level: USER_LEVEL_MAP[userLevel],
    fileWriter,
    console: true,
  });
  log = createLogger("main");
  log.info(`Configuration loaded (log_level=${userLevel})`);

  // Create persistent storage for cron jobs
  const dataDir = join(baseDir, "data");
  const storage = createSqliteStorage(join(dataDir, "triggerfish.db"));
  const pairingService = createPairingService(storage);
  const cronManager = await createPersistentCronManager(storage);

  const existingJobs = cronManager.list();
  if (existingJobs.length > 0) {
    log.info(`Loaded ${existingJobs.length} persistent cron job(s)`);
  }

  // Create session manager (shared by orchestrator factory, main session, and gateway)
  const baseSessionManager = createSessionManager(storage);
  const enhancedSessionManager = createEnhancedSessionManager(
    baseSessionManager,
  );

  // Notification service for scheduler output delivery
  const notificationService = createNotificationService(storage);

  // Trigger store for persisting trigger results (used by trigger_add_to_context tool)
  const triggerStore = createTriggerStore(storage);

  // Build filesystem security config (shared by factory and main session)
  const fsConfig = config.filesystem;
  const fsPathMap = new Map<string, ClassificationLevel>();
  if (fsConfig?.paths) {
    for (const [pattern, level] of Object.entries(fsConfig.paths)) {
      const parsed = parseClassification(level);
      if (parsed.ok) {
        fsPathMap.set(pattern, parsed.value);
      }
    }
  }
  let fsDefault: ClassificationLevel = "CONFIDENTIAL";
  if (fsConfig?.default) {
    const parsed = parseClassification(fsConfig.default);
    if (parsed.ok) {
      fsDefault = parsed.value;
    }
  }

  if (fsDefault === "PUBLIC") {
    log.warn("filesystem.default is set to PUBLIC — all unmapped paths are accessible at PUBLIC level");
  }

  // Build tool floor registry from enterprise overrides (shared by factory and main session)
  const toolFloorOverrides = new Map<string, ClassificationLevel>();
  if (config.tools?.floors) {
    for (const [tool, level] of Object.entries(config.tools.floors)) {
      const parsed = parseClassification(level);
      if (parsed.ok) {
        toolFloorOverrides.set(tool, parsed.value);
      }
    }
  }
  const toolFloorRegistry = createToolFloorRegistry(
    toolFloorOverrides.size > 0 ? toolFloorOverrides : undefined,
  );

  // Build orchestrator factory and scheduler with persistent cron manager
  const factory = createOrchestratorFactory(
    config,
    baseDir,
    cronManager,
    storage,
    enhancedSessionManager,
    fsPathMap,
    fsDefault,
    toolFloorRegistry,
  );
  const schedulerConfig = buildSchedulerConfig(config, baseDir, factory);
  const schedulerService = createSchedulerService({
    ...schedulerConfig,
    cronManager,
    notificationService,
    ownerId: "owner" as UserId,
    triggerStore,
  });

  // Create the main session orchestrator — this is the daemon-owned session
  const registry = createProviderRegistry();
  loadProvidersFromConfig(config.models as ModelsConfig, registry);

  if (!registry.getDefault()) {
    log.error("No LLM provider configured. Check triggerfish.yaml.");
    Deno.exit(1);
  }

  const engine = createPolicyEngine();
  for (const rule of createDefaultRules()) {
    engine.addRule(rule);
  }
  const hookRunner = createHookRunner(engine);

  const spinePath = join(baseDir, "SPINE.md");
  const mainWorkspace = await createWorkspace({
    agentId: "main-session",
    basePath: join(baseDir, "workspaces"),
  });

  // Symlink SPINE.md into workspace so the agent can read AND edit its identity
  try {
    const workspaceSpine = join(mainWorkspace.path, "SPINE.md");
    try {
      await Deno.remove(workspaceSpine);
    } catch { /* doesn't exist yet */ }
    await Deno.symlink(spinePath, workspaceSpine);
  } catch {
    // SPINE.md may not exist yet — not fatal
  }

  // Build path classifier for main workspace
  const pathClassifier = createPathClassifier(
    { paths: fsPathMap, defaultClassification: fsDefault },
    {
      basePath: mainWorkspace.path,
      internalPath: mainWorkspace.internalPath,
      confidentialPath: mainWorkspace.confidentialPath,
      restrictedPath: mainWorkspace.restrictedPath,
    },
  );

  const execTools = createExecTools(mainWorkspace);
  const todoManager = createTodoManager({ storage, agentId: "main-session" });
  const { searchProvider, webFetcher, domainClassifier } = buildWebTools(config);

  // Initialize memory system with FTS5 search
  const { Database } = await import("@db/sqlite");
  const memoryDb = new Database(join(dataDir, "triggerfish.db"));
  memoryDb.exec("PRAGMA journal_mode=WAL");
  const memorySearchProvider = createFts5SearchProvider(memoryDb);
  const memoryStore = createMemoryStore({
    storage,
    searchProvider: memorySearchProvider,
  });
  let session = createSession({
    userId: "owner" as UserId,
    channelId: "daemon" as ChannelId,
  });
  const memoryExecutor = createMemoryToolExecutor({
    store: memoryStore,
    searchProvider: memorySearchProvider,
    agentId: "main-session",
    sessionTaint: session.taint,
    sourceSessionId: session.id,
  });

  // Plan manager for main session
  const mainPlanManager = createPlanManager({
    plansDir: `${mainWorkspace.path}/plans`,
  });
  const mainPlanExecutor = createPlanToolExecutor(mainPlanManager, session.id);

  // Vision provider for image fallback and browser screenshots (optional)
  const visionProvider = resolveVisionProvider(config.models as ModelsConfig);

  // Browser tools — auto-launch Chrome on first browser_* call
  const browserDomainPolicy = createBrowserDomainPolicy({
    allowList: (config.web?.domains?.allowlist ?? []) as string[],
    denyList: (config.web?.domains?.denylist ?? []) as string[],
    classifications: Object.fromEntries(
      (config.web?.domains?.classifications ?? []).map((
        c,
      ) => [c.pattern, c.classification]),
    ),
  });
  const browserHandle = createAutoLaunchBrowserExecutor({
    manager: createBrowserManager({
      profileBaseDir: join(dataDir, "browser-profiles"),
      domainPolicy: browserDomainPolicy,
      storage,
      headless: false,
    }),
    agentId: "main-session",
    getSessionTaint: () => session.taint,
    visionProvider,
    primaryProvider: registry.getDefault(),
  });
  const browserExecutor = browserHandle.executor;

  // Tidepool tools (lazy getter — tools resolve after host creation)
  // deno-lint-ignore prefer-const
  let tidepoolTools: import("../tools/tidepool/mod.ts").TidePoolTools | undefined;
  const tidepoolExecutor = createTidepoolToolExecutor(() => tidepoolTools);

  // Image analysis tools
  const imageExecutor = createImageToolExecutor(registry, visionProvider);

  // Channel adapter registry — populated below when channels are wired up.
  // Shared mutable Map so the session executor can see channels registered later.
  const channelAdapters = new Map<string, RegisteredChannel>();

  // Session management tools — uses shared EnhancedSessionManager created earlier
  const sessionExecutor = createSessionToolExecutor({
    sessionManager: enhancedSessionManager,
    callerSessionId: session.id,
    callerTaint: session.taint,
    getCallerTaint: () => session.taint,
    channels: channelAdapters,
    pairingService,
  });

  // Sub-agent factory — bridges OrchestratorFactory to the subagent tool
  const subagentFactory = buildSubagentFactory(factory);

  // Explore tool — uses subagent factory for parallel codebase exploration
  const exploreExecutor = createExploreToolExecutor(
    subagentFactory,
    async (prompt: string) => {
      const provider = registry.getDefault();
      if (!provider) return prompt;
      const result = await provider.complete(
        [{ role: "user", content: prompt }],
        [],
        {},
      );
      return result.content;
    },
  );

  // Integration/plugin/channel classification map. Built-in tools pass through.
  const toolClassifications = mapToolPrefixClassifications(config);

  // GitHub tools — resolve token from OS keychain
  const keychain = createKeychain();
  const githubTokenResult = await resolveGitHubToken({ secretStore: keychain });
  const githubExecutor = createGitHubToolExecutor(
    githubTokenResult.ok
      ? {
        client: createGitHubClient({
          token: githubTokenResult.value,
          baseUrl: config.github?.base_url,
          classificationConfig: config.github?.classification_overrides
            ? {
              overrides: config.github.classification_overrides as Readonly<
                Record<string, ClassificationLevel>
              >,
            }
            : undefined,
        }),
        sessionTaint: session.taint,
        sourceSessionId: session.id,
      }
      : undefined,
  );
  // GitHub classification is set by mapToolPrefixClassifications from config

  // Obsidian vault tools (graceful degrade if not configured)
  const obsidianExecutor = config.plugins?.obsidian
    ? await buildObsidianExecutor(
      config.plugins.obsidian as ObsidianPluginConfig,
      () => session.taint,
      session.id,
    )
    : undefined;

  // --- MCP server wiring ---
  // MCP servers are connected in the background (non-blocking). Tools are injected
  // dynamically as servers come online. The daemon and chat session start immediately
  // without waiting for MCP servers to be available.
  const mcpBroadcastRefs: McpBroadcastRefs = {
    chatSession: null,
    gatewayServer: null,
    tidepoolHost: null,
  };
  let mcpExecutor:
    | ((name: string, input: Record<string, unknown>) => Promise<string | null>)
    | undefined;
  let mcpWiring: ReturnType<typeof wireMcpServers> | null = null;

  if (config.mcp_servers && Object.keys(config.mcp_servers).length > 0) {
    mcpWiring = wireMcpServers(
      config.mcp_servers,
      hookRunner,
      () => session,
      toolClassifications,
      mcpBroadcastRefs,
      keychain,
    );
    mcpExecutor = mcpWiring.executor;
  }

  // Discover skills from bundled, managed, and workspace directories
  const { skills: discoveredSkills, loader: skillLoader } = await discoverSkills(baseDir);
  const SKILLS_SYSTEM_PROMPT = buildSkillsSystemPrompt(discoveredSkills);
  const TRIGGERS_SYSTEM_PROMPT = buildTriggersSystemPrompt(baseDir);

  // Claude session manager — spawns headless Claude CLI subprocesses
  const claudeSessionManager = createClaudeSessionManager({
    workspacePath: mainWorkspace.path,
  });
  const claudeExecutor = createClaudeToolExecutor(claudeSessionManager);

  // Secret store and CLI prompt callback for secure out-of-context secret input.
  const mainKeychain = createKeychain();
  const cliSecretPrompt: SecretPromptCallback = createCliSecretPrompt();
  // Mutable prompt callback ref — defaults to CLI terminal input.
  // Tidepool path swaps this to the browser WebSocket callback once the
  // chatSession is available. Access is safe because the mutex serializes
  // executeAgentTurn calls and ensures no concurrent secret_save invocations.
  let activeSecretPrompt: SecretPromptCallback = cliSecretPrompt;
  const secretExecutor = createSecretToolExecutor(
    mainKeychain,
    (name, hint) => activeSecretPrompt(name, hint),
  );

  const triggerExecutor = createTriggerToolExecutor({
    triggerStore,
    sessionTaint: session.taint,
    getSessionTaint: () => session.taint,
    escalateTaint: (level: ClassificationLevel) => {
      session = updateTaint(session, level, "trigger context injection");
    },
  });

  const skillExecutor = createSkillToolExecutor({ skillLoader });

  const toolExecutor = createToolExecutor({
    execTools,
    cronManager,
    todoManager,
    searchProvider,
    webFetcher,
    memoryExecutor,
    planExecutor: mainPlanExecutor,
    browserExecutor,
    tidepoolExecutor,
    imageExecutor,
    sessionExecutor,
    exploreExecutor,
    googleExecutor: buildGoogleExecutor(() => session.taint, session.id),
    githubExecutor,
    obsidianExecutor,
    llmTaskExecutor: registry ? createLlmTaskToolExecutor(registry) : undefined,
    summarizeExecutor: registry
      ? createSummarizeToolExecutor(registry)
      : undefined,
    healthcheckExecutor: createHealthcheckToolExecutor({
      providerRegistry: registry,
      storageProvider: storage,
      skillLoader,
    }),
    claudeExecutor,
    mcpExecutor,
    subagentFactory,
    secretExecutor,
    triggerExecutor,
    skillExecutor,
    providerRegistry: registry,
  });

  // Read streaming preference from config. When not set, let the orchestrator
  // default to true. Users can disable with `streaming: false` in triggerfish.yaml.
  const modelsConfig = config.models as Record<string, unknown> | undefined;
  const streamingPref = modelsConfig?.streaming;

  // Tidepool call flag — toggled by the tidepoolChatSession wrapper so that
  // tidepool tools and system prompts are only injected for Tidepool calls.
  let isTidepoolCall = false;

  const chatSession = createChatSession({
    hookRunner,
    providerRegistry: registry,
    spinePath,
    tools: resolveToolsForProfile("cli"),
    getExtraTools: () => [
      ...(mcpWiring ? mcpWiring.getToolDefinitions() : []),
      ...(isTidepoolCall && tidepoolTools ? TOOL_GROUPS.tidepool() : []),
    ],
    getExtraSystemPromptSections: () => {
      const sections: string[] = [];
      if (mcpWiring) {
        const mcpPrompt = mcpWiring.getSystemPrompt();
        if (mcpPrompt) sections.push(mcpPrompt);
      }
      if (isTidepoolCall) sections.push(TIDEPOOL_SYSTEM_PROMPT);
      return sections;
    },
    toolExecutor,
    systemPromptSections: [
      ...resolvePromptsForProfile("cli"),
      SKILLS_SYSTEM_PROMPT,
      TRIGGERS_SYSTEM_PROMPT,
    ],
    secretStore: mainKeychain,
    session,
    ...(streamingPref !== undefined
      ? { enableStreaming: streamingPref === true }
      : {}),
    getSession: () => session,
    debug: config.debug === true || Deno.env.get("TRIGGERFISH_DEBUG") === "1",
    visionProvider,
    toolClassifications,
    getSessionTaint: () => session.taint,
    escalateTaint: (level: ClassificationLevel, reason: string) => {
      session = updateTaint(session, level, reason);
    },
    resetSession: () => {
      session = createSession({
        userId: "owner" as UserId,
        channelId: "daemon" as ChannelId,
      });
      // Close browser so next session gets a fresh launch
      browserHandle.close().catch(() => {});
    },
    pairingService,
    pathClassifier,
    domainClassifier,
    toolFloorRegistry,
    primaryModelName: config.models.primary.model,
  });

  log.info("Main session created");
  // Wire chat session for MCP status broadcasting (late-bound ref used in onStatusChange callback)
  mcpBroadcastRefs.chatSession = chatSession;

  // Wrap the chatSession executeAgentTurn for Tidepool so that each WebSocket
  // message sets the active secret prompt callback to the Tidepool variant
  // (which sends a `secret_prompt` event over the browser WebSocket).
  // CLI path leaves activeSecretPrompt as the terminal hidden-input callback.
  const tidepoolChatSession = {
    ...chatSession,
    executeAgentTurn: (
      content: Parameters<typeof chatSession.executeAgentTurn>[0],
      sendEvent: Parameters<typeof chatSession.executeAgentTurn>[1],
      signal?: Parameters<typeof chatSession.executeAgentTurn>[2],
    ) => {
      isTidepoolCall = true;
      activeSecretPrompt = chatSession.createTidepoolSecretPrompt(sendEvent);
      return chatSession.executeAgentTurn(content, sendEvent, signal).finally(() => {
        isTidepoolCall = false;
        activeSecretPrompt = cliSecretPrompt;
      });
    },
  };

  // Start Tidepool + Gateway EARLY so `triggerfish chat` can connect
  // while channels and MCP servers finish wiring in the background.
  const tidepoolHost = createA2UIHost({ chatSession: tidepoolChatSession });
  await tidepoolHost.start(TIDEPOOL_PORT);
  tidepoolTools = createTidePoolTools(tidepoolHost);
  log.info(`Tidepool listening on http://127.0.0.1:${TIDEPOOL_PORT}`);
  console.log(`  Tidepool: http://127.0.0.1:${TIDEPOOL_PORT}`);
  // Wire up MCP status indicator for Tidepool
  mcpBroadcastRefs.tidepoolHost = tidepoolHost;
  // Register Tidepool for trigger/scheduler notification delivery
  notificationService.registerChannel({
    name: "tidepool",
    send: async (msg) => { tidepoolHost.broadcastNotification(msg); },
  });

  // Wrap the chatSession for CLI WebSocket clients so that secret_save prompts
  // are sent over the WebSocket (just like the Tidepool variant) instead of
  // trying to read from the daemon's stdin (which has no TTY).
  const gatewayChatSession = {
    ...chatSession,
    executeAgentTurn: (
      content: Parameters<typeof chatSession.executeAgentTurn>[0],
      sendEvent: Parameters<typeof chatSession.executeAgentTurn>[1],
      signal?: Parameters<typeof chatSession.executeAgentTurn>[2],
    ) => {
      activeSecretPrompt = chatSession.createTidepoolSecretPrompt(sendEvent);
      return chatSession.executeAgentTurn(content, sendEvent, signal).finally(() => {
        activeSecretPrompt = cliSecretPrompt;
      });
    },
  };

  const server = createGatewayServer({
    port: 18789,
    schedulerService,
    chatSession: gatewayChatSession,
    sessionManager: enhancedSessionManager,
    notificationService,
  });
  const addr = await server.start();
  log.info(`Gateway listening on ${addr.hostname}:${addr.port}`);
  // Wire gateway server for MCP status broadcasting
  mcpBroadcastRefs.gatewayServer = server;
  // Register CLI WebSocket for trigger/scheduler notification delivery
  notificationService.registerChannel({
    name: "cli-websocket",
    send: async (msg) => { server.broadcastNotification(msg); },
  });

  // --- Channel wiring ---
  const channelDeps = { chatSession, notificationService, channelAdapters };

  const telegramConfig = config.channels?.telegram as TelegramChannelConfig | undefined;
  if (telegramConfig?.botToken) {
    await wireTelegramChannel(telegramConfig, channelDeps);
  }

  const discordConfig = config.channels?.discord as DiscordChannelConfig | undefined;
  if (discordConfig) {
    await wireDiscordChannel(discordConfig, channelDeps);
  }

  const signalConfig = config.channels?.signal as SignalChannelConfig | undefined;
  const signalDaemonState = signalConfig
    ? wireSignalChannel(signalConfig, channelDeps)
    : { handle: null };

  // Start the scheduler (cron tick loop + trigger)
  schedulerService.start();
  log.info("Scheduler started");
  if (schedulerConfig.trigger.enabled) {
    log.info(`Trigger: every ${schedulerConfig.trigger.intervalMinutes}m`);
  }
  log.info("Triggerfish is running!");

  // Graceful shutdown handler
  let shuttingDown = false;
  const handleShutdown = async () => {
    if (shuttingDown) return;
    shuttingDown = true;
    log.info("Shutting down...");

    // Stop signal-cli daemon if we spawned it
    if (signalDaemonState.handle) {
      try { signalDaemonState.handle.child.kill("SIGTERM"); } catch { /* already dead */ }
      signalDaemonState.handle = null;
    }

    // Stop scheduler (cron tick loop + triggers)
    try { schedulerService.stop(); } catch { /* best effort */ }

    // Stop gateway and tidepool servers
    try { await server.stop(); } catch { /* best effort */ }
    try { await tidepoolHost.stop(); } catch { /* best effort */ }

    // Close database connections
    try { memoryDb.close(); } catch { /* best effort */ }
    try { await storage.close(); } catch { /* best effort */ }

    log.info("Shutdown complete");

    // Close the log file handle so the file lock is released before exit.
    // Without this, a stop→start cycle on Windows can hit EBUSY if the
    // old process's handle lingers.
    try { await shutdownLogger(); } catch { /* best effort */ }
    Deno.exit(0);
  };
  try {
    Deno.addSignalListener("SIGTERM", () => { handleShutdown(); });
  } catch { /* not supported on all platforms */ }
  try {
    Deno.addSignalListener("SIGINT", () => { handleShutdown(); });
  } catch { /* not supported on all platforms */ }

  // Keep running until interrupted
  await new Promise(() => {}); // Never resolves — signal handler calls Deno.exit()
}
