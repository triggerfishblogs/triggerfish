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
import { isDockerEnvironment } from "../../core/env.ts";
import { createGatewayServer } from "../server/server.ts";
import { createSessionToolExecutor } from "../tools/session_tools.ts";
import type { RegisteredChannel } from "../tools/session_tools.ts";
import { createEnhancedSessionManager } from "../sessions.ts";
import { createSessionManager } from "../../core/session/manager.ts";
import { createChatSession } from "../chat.ts";
import { createA2UIHost } from "../../tools/tidepool/host.ts";
import {
  createTidepoolToolExecutor,
  createTidePoolTools,
  TIDEPOOL_SYSTEM_PROMPT,
} from "../../tools/tidepool/mod.ts";
import { mapToolPrefixClassifications } from "../../agent/orchestrator.ts";
import { createProviderRegistry } from "../../agent/llm.ts";
import {
  loadProvidersFromConfig,
  resolveVisionProvider,
} from "../../agent/providers/config.ts";
import type { ModelsConfig } from "../../agent/providers/config.ts";
import { createPolicyEngine } from "../../core/policy/engine.ts";
import {
  createDefaultRules,
  createHookRunner,
} from "../../core/policy/hooks.ts";
import { createSession, updateTaint } from "../../core/types/session.ts";
import type { ChannelId, UserId } from "../../core/types/session.ts";
import type { ClassificationLevel } from "../../core/types/classification.ts";
import { createWorkspace } from "../../exec/workspace.ts";
import { createExecTools } from "../../exec/tools.ts";
import {
  createClaudeSessionManager,
  createClaudeToolExecutor,
} from "../../exec/claude.ts";
import { createPathClassifier } from "../../core/security/path_classification.ts";
import { createToolFloorRegistry } from "../../core/security/tool_floors.ts";
import { createSchedulerService } from "../../scheduler/service.ts";
import { createTriggerStore } from "../../scheduler/triggers/store.ts";
import { createPersistentCronManager } from "../../scheduler/cron/cron.ts";
import { createSqliteStorage } from "../../core/storage/sqlite.ts";
import {
  createHealthcheckToolExecutor,
  createLlmTaskToolExecutor,
  createSummarizeToolExecutor,
  createTodoManager,
} from "../../tools/mod.ts";
import {
  createFts5SearchProvider,
  createMemoryStore,
  createMemoryToolExecutor,
} from "../../tools/memory/mod.ts";
import {
  createAutoLaunchBrowserExecutor,
  createBrowserManager,
  createDomainPolicy as createBrowserDomainPolicy,
} from "../../tools/browser/mod.ts";
import { createImageToolExecutor } from "../../tools/image/mod.ts";
import { createExploreToolExecutor } from "../../tools/explore/mod.ts";
import {
  createGitHubClient,
  createGitHubToolExecutor,
  resolveGitHubToken,
} from "../../integrations/github/mod.ts";
import { createKeychain } from "../../core/secrets/keychain.ts";
import { createSecretToolExecutor } from "../../tools/secrets.ts";
import type { SecretPromptCallback } from "../../tools/secrets.ts";
import { createPairingService } from "../../channels/pairing.ts";
import {
  wireDiscordChannel,
  wireSignalChannel,
  wireTelegramChannel,
} from "./channels.ts";
import type {
  DiscordChannelConfig,
  SignalChannelConfig,
  TelegramChannelConfig,
} from "./channels.ts";
import { createNotificationService } from "../notifications/notifications.ts";
import { createTriggerToolExecutor } from "../tools/trigger_tools.ts";
import { parseClassification } from "../../core/types/classification.ts";
import { createSkillToolExecutor } from "../../tools/skills/mod.ts";
import {
  createFileWriter,
  createLogger,
  initLogger,
  parseUserLogLevel,
  shutdownLogger,
  USER_LEVEL_MAP,
} from "../../core/logger/mod.ts";
import { logDir as resolveLogDir } from "../../cli/daemon/daemon.ts";
import { loadConfigWithSecrets } from "../../core/config.ts";
import type { TriggerFishConfig } from "../../core/config.ts";
import { resolveBaseDir, resolveConfigPath } from "../../cli/config/paths.ts";
import { TIDEPOOL_PORT } from "../../cli/constants.ts";
import {
  buildSkillsSystemPrompt,
  buildTriggersSystemPrompt,
} from "../../tools/skills/prompts.ts";
import {
  buildGoogleExecutor,
  buildSchedulerConfig,
  buildSubagentFactory,
  buildWebTools,
  createOrchestratorFactory,
} from "./factory.ts";
import {
  createToolExecutor,
  resolvePromptsForProfile,
  resolveToolsForProfile,
  TOOL_GROUPS,
} from "../tools/agent_tools.ts";
import {
  createPlanManager,
  createPlanToolExecutor,
} from "../../agent/plan/plan.ts";
import { wireMcpServers } from "./mcp.ts";
import type { McpBroadcastRefs } from "./mcp.ts";
import {
  buildObsidianExecutor,
  createCliSecretPrompt,
  discoverSkills,
} from "./subsystems.ts";
import type { ObsidianPluginConfig } from "./subsystems.ts";

// ─── Shutdown helpers ────────────────────────────────────────────────────────

/** Dependencies for the shutdown handler. */
interface ShutdownDeps {
  signalDaemonState: {
    handle: { child: { kill(signo?: number | Deno.Signal): void } } | null;
  };
  schedulerService: { stop(): void };
  server: { stop(): Promise<void> };
  tidepoolHost: { stop(): Promise<void> };
  memoryDb: { close(): void };
  storage: { close(): Promise<void> };
  log: ReturnType<typeof createLogger>;
}

/** Kill the Signal daemon child process if it is running. */
function stopSignalDaemon(deps: ShutdownDeps): void {
  if (!deps.signalDaemonState.handle) return;
  try {
    deps.signalDaemonState.handle.child.kill("SIGTERM");
  } catch { /* already dead */ }
  deps.signalDaemonState.handle = null;
}

/** Stop all services and close resources in order. */
async function stopAllServices(deps: ShutdownDeps): Promise<void> {
  try {
    deps.schedulerService.stop();
  } catch { /* best effort */ }
  try {
    await deps.server.stop();
  } catch { /* best effort */ }
  try {
    await deps.tidepoolHost.stop();
  } catch { /* best effort */ }
  try {
    deps.memoryDb.close();
  } catch { /* best effort */ }
  try {
    await deps.storage.close();
  } catch { /* best effort */ }
}

/** Drain the logger after all services have stopped. */
async function drainLoggerOnShutdown(): Promise<void> {
  try {
    await shutdownLogger();
  } catch { /* best effort */ }
}

/** Attach SIGTERM/SIGINT listeners that trigger graceful shutdown. */
function addSignalListeners(handler: () => void): void {
  try {
    Deno.addSignalListener("SIGTERM", handler);
  } catch { /* not supported on all platforms */ }
  try {
    Deno.addSignalListener("SIGINT", handler);
  } catch { /* not supported on all platforms */ }
}

/** Register SIGTERM/SIGINT handlers for graceful shutdown. */
function registerShutdownHandlers(deps: ShutdownDeps): void {
  let shuttingDown = false;
  const handleShutdown = async () => {
    if (shuttingDown) return;
    shuttingDown = true;
    deps.log.info("Shutting down...");
    stopSignalDaemon(deps);
    await stopAllServices(deps);
    deps.log.info("Shutdown complete");
    await drainLoggerOnShutdown();
    Deno.exit(0);
  };
  addSignalListeners(() => {
    handleShutdown();
  });
}

// ─── Config verification ─────────────────────────────────────────────────────

/** Print Docker-specific help when config is missing. */
function printDockerConfigHelp(configPath: string): void {
  console.error(`No configuration found at ${configPath}\n`);
  console.error("Option 1: Mount your config file:");
  console.error(
    "  docker run -v ./triggerfish.yaml:/data/triggerfish.yaml triggerfish/triggerfish\n",
  );
  console.error("Option 2: Run the setup wizard interactively:");
  console.error(
    "  docker run -it -v triggerfish-data:/data triggerfish/triggerfish dive\n",
  );
}

/** Check config exists, printing environment-appropriate help if missing. */
async function verifyConfigExists(configPath: string): Promise<void> {
  try {
    await Deno.stat(configPath);
  } catch {
    if (isDockerEnvironment()) {
      printDockerConfigHelp(configPath);
    } else {
      console.log("Configuration not found.");
      console.log("Run 'triggerfish dive' to set up your agent.\n");
    }
    Deno.exit(1);
  }
}

/** Create default directories on first run. */
async function ensureBaseDirs(baseDir: string): Promise<void> {
  for (const sub of ["logs", "data", "skills"]) {
    await Deno.mkdir(join(baseDir, sub), { recursive: true });
  }
  if (isDockerEnvironment()) {
    await Deno.mkdir(join(baseDir, "workspace"), { recursive: true });
  }
}

// ─── Filesystem / tool-floor config ──────────────────────────────────────────

/** Parse filesystem path classification config into a Map. */
function buildFilesystemPathMap(
  fsConfig: Record<string, unknown> | undefined,
): {
  fsPathMap: Map<string, ClassificationLevel>;
  fsDefault: ClassificationLevel;
} {
  const fsPathMap = new Map<string, ClassificationLevel>();
  const paths = (fsConfig as { paths?: Record<string, string> })?.paths;
  if (paths) {
    for (const [pattern, level] of Object.entries(paths)) {
      const parsed = parseClassification(level);
      if (parsed.ok) fsPathMap.set(pattern, parsed.value);
    }
  }
  let fsDefault: ClassificationLevel = "CONFIDENTIAL";
  const defaultLevel = (fsConfig as { default?: string })?.default;
  if (defaultLevel) {
    const parsed = parseClassification(defaultLevel);
    if (parsed.ok) fsDefault = parsed.value;
  }
  return { fsPathMap, fsDefault };
}

/** Build tool floor registry from enterprise config overrides. */
function buildToolFloorRegistryFromConfig(
  toolsConfig: Record<string, unknown> | undefined,
) {
  const overrides = new Map<string, ClassificationLevel>();
  const floors = (toolsConfig as { floors?: Record<string, string> })?.floors;
  if (floors) {
    for (const [tool, level] of Object.entries(floors)) {
      const parsed = parseClassification(level);
      if (parsed.ok) overrides.set(tool, parsed.value);
    }
  }
  return createToolFloorRegistry(overrides.size > 0 ? overrides : undefined);
}

// ─── Startup phase helpers ───────────────────────────────────────────────────

/** Initialize structured logger, skipping file writer on Windows services. */
async function initializeStartupLogger(): Promise<
  ReturnType<typeof createFileWriter> extends Promise<infer T> ? T | undefined
    : never
> {
  const isWindowsService = Deno.build.os === "windows" &&
    !Deno.stdout.isTerminal();
  const fileWriter = isWindowsService
    ? undefined
    : await createFileWriter({ logDir: resolveLogDir() });
  initLogger({ level: "INFO", fileWriter, console: true });
  return fileWriter;
}

/** Load config from disk with secret resolution, exit on failure. */
async function loadAndValidateConfig(
  configPath: string,
  log: ReturnType<typeof createLogger>,
): Promise<TriggerFishConfig> {
  const keychainForConfig = createKeychain();
  const configResult = await loadConfigWithSecrets(
    configPath,
    keychainForConfig,
  );
  if (!configResult.ok) {
    log.error("Failed to load configuration:", configResult.error);
    Deno.exit(1);
  }
  return configResult.value;
}

/** Re-initialize logger with YAML-configured level. */
function reinitializeLoggerFromConfig(
  config: TriggerFishConfig,
  fileWriter: Awaited<ReturnType<typeof initializeStartupLogger>>,
): ReturnType<typeof createLogger> {
  const debugCompat = Deno.env.get("TRIGGERFISH_DEBUG") === "1"
    ? "debug"
    : undefined;
  const userLevel = parseUserLogLevel(
    config.logging?.level ?? debugCompat ?? "normal",
  );
  initLogger({
    level: USER_LEVEL_MAP[userLevel],
    fileWriter,
    console: true,
  });
  const log = createLogger("main");
  log.info(`Configuration loaded (log_level=${userLevel})`);
  return log;
}

/** Initialize persistent storage, pairing service, and cron manager. */
async function initializePersistentStorage(
  baseDir: string,
  log: ReturnType<typeof createLogger>,
) {
  const dataDir = join(baseDir, "data");
  const storage = createSqliteStorage(join(dataDir, "triggerfish.db"));
  const pairingService = createPairingService(storage);
  const cronManager = await createPersistentCronManager(storage);
  const existingJobs = cronManager.list();
  if (existingJobs.length > 0) {
    log.info(`Loaded ${existingJobs.length} persistent cron job(s)`);
  }
  return { dataDir, storage, pairingService, cronManager };
}

/** Create session manager, notification service, and trigger store. */
function initializeSessionInfrastructure(
  storage: ReturnType<typeof createSqliteStorage>,
) {
  const baseSessionManager = createSessionManager(storage);
  const enhancedSessionManager = createEnhancedSessionManager(
    baseSessionManager,
  );
  const notificationService = createNotificationService(storage);
  const triggerStore = createTriggerStore(storage);
  return { enhancedSessionManager, notificationService, triggerStore };
}

/** Build LLM provider registry, policy engine, and hook runner. */
function initializeLlmProviders(
  config: TriggerFishConfig,
  log: ReturnType<typeof createLogger>,
) {
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
  return { registry, hookRunner };
}

/** Create main workspace and symlink SPINE.md into it. */
async function initializeMainWorkspace(
  baseDir: string,
) {
  const spinePath = join(baseDir, "SPINE.md");
  const mainWorkspace = await createWorkspace({
    agentId: "main-session",
    basePath: join(baseDir, "workspaces"),
  });
  try {
    const workspaceSpine = join(mainWorkspace.path, "SPINE.md");
    try {
      await Deno.remove(workspaceSpine);
    } catch { /* doesn't exist yet */ }
    await Deno.symlink(spinePath, workspaceSpine);
  } catch { /* SPINE.md may not exist yet — not fatal */ }
  return { spinePath, mainWorkspace };
}

/** Build path classifier for a workspace with filesystem security config. */
function buildMainPathClassifier(
  fsPathMap: Map<string, ClassificationLevel>,
  fsDefault: ClassificationLevel,
  mainWorkspace: Awaited<ReturnType<typeof createWorkspace>>,
) {
  return createPathClassifier(
    { paths: fsPathMap, defaultClassification: fsDefault },
    {
      basePath: mainWorkspace.path,
      internalPath: mainWorkspace.internalPath,
      confidentialPath: mainWorkspace.confidentialPath,
      restrictedPath: mainWorkspace.restrictedPath,
    },
  );
}

/** Initialize memory system with FTS5 search. */
async function initializeMemorySystem(
  dataDir: string,
  storage: ReturnType<typeof createSqliteStorage>,
  session: ReturnType<typeof createSession>,
) {
  const { Database } = await import("@db/sqlite");
  const memoryDb = new Database(join(dataDir, "triggerfish.db"));
  memoryDb.exec("PRAGMA journal_mode=WAL");
  const memorySearchProvider = createFts5SearchProvider(memoryDb);
  const memoryStore = createMemoryStore({
    storage,
    searchProvider: memorySearchProvider,
  });
  const memoryExecutor = createMemoryToolExecutor({
    store: memoryStore,
    searchProvider: memorySearchProvider,
    agentId: "main-session",
    sessionTaint: session.taint,
    sourceSessionId: session.id,
  });
  return { memoryDb, memoryExecutor };
}

/** Build browser domain policy from web config. */
function buildBrowserDomainPolicyFromConfig(config: TriggerFishConfig) {
  return createBrowserDomainPolicy({
    allowList: (config.web?.domains?.allowlist ?? []) as string[],
    denyList: (config.web?.domains?.denylist ?? []) as string[],
    classifications: Object.fromEntries(
      (config.web?.domains?.classifications ?? []).map((
        c,
      ) => [c.pattern, c.classification]),
    ),
  });
}

/** Create auto-launch browser executor with domain policy. */
function initializeBrowserExecutor(
  config: TriggerFishConfig,
  dataDir: string,
  storage: ReturnType<typeof createSqliteStorage>,
  getSessionTaint: () => ClassificationLevel,
  visionProvider: ReturnType<typeof resolveVisionProvider>,
  primaryProvider: ReturnType<
    ReturnType<typeof createProviderRegistry>["getDefault"]
  >,
) {
  const browserDomainPolicy = buildBrowserDomainPolicyFromConfig(config);
  return createAutoLaunchBrowserExecutor({
    manager: createBrowserManager({
      profileBaseDir: join(dataDir, "browser-profiles"),
      domainPolicy: browserDomainPolicy,
      storage,
      headless: false,
    }),
    agentId: "main-session",
    getSessionTaint,
    visionProvider,
    primaryProvider,
  });
}

/** Build GitHub client configuration from config. */
function buildGitHubClientConfig(
  config: TriggerFishConfig,
  token: string,
) {
  return {
    token,
    baseUrl: config.github?.base_url,
    classificationConfig: config.github?.classification_overrides
      ? {
        overrides: config.github.classification_overrides as Readonly<
          Record<string, ClassificationLevel>
        >,
      }
      : undefined,
  };
}

/** Resolve GitHub token and create the executor. */
async function buildGitHubExecutor(
  config: TriggerFishConfig,
  session: ReturnType<typeof createSession>,
) {
  const keychain = createKeychain();
  const tokenResult = await resolveGitHubToken({ secretStore: keychain });
  const executor = createGitHubToolExecutor(
    tokenResult.ok
      ? {
        client: createGitHubClient(
          buildGitHubClientConfig(config, tokenResult.value),
        ),
        sessionTaint: session.taint,
        sourceSessionId: session.id,
      }
      : undefined,
  );
  return { executor, keychain };
}

/** Connect MCP servers if configured (non-blocking background connection). */
function initializeMcpServers(
  config: TriggerFishConfig,
  hookRunner: ReturnType<typeof createHookRunner>,
  getSession: () => ReturnType<typeof createSession>,
  toolClassifications: Map<string, ClassificationLevel>,
  mcpBroadcastRefs: McpBroadcastRefs,
  keychain: ReturnType<typeof createKeychain>,
) {
  if (!config.mcp_servers || Object.keys(config.mcp_servers).length === 0) {
    return { mcpExecutor: undefined, mcpWiring: null };
  }
  const mcpWiring = wireMcpServers(
    config.mcp_servers,
    hookRunner,
    getSession,
    toolClassifications,
    mcpBroadcastRefs,
    keychain,
  );
  return { mcpExecutor: mcpWiring.executor, mcpWiring };
}

/** Build explore executor with LLM summarization callback. */
function buildExploreExecutor(
  subagentFactory: ReturnType<typeof buildSubagentFactory>,
  registry: ReturnType<typeof createProviderRegistry>,
) {
  return createExploreToolExecutor(
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
}

/** Mutable state bag for the main daemon session. */
interface MainSessionState {
  session: ReturnType<typeof createSession>;
  activeSecretPrompt: SecretPromptCallback;
}

/** Build LLM-powered auxiliary executors (task, summarize, healthcheck). */
function buildAuxiliaryExecutors(
  registry: ReturnType<typeof createProviderRegistry>,
  storage: ReturnType<typeof createSqliteStorage>,
  skillLoader: Awaited<ReturnType<typeof discoverSkills>>["loader"],
) {
  return {
    llmTaskExecutor: registry ? createLlmTaskToolExecutor(registry) : undefined,
    summarizeExecutor: registry
      ? createSummarizeToolExecutor(registry)
      : undefined,
    healthcheckExecutor: createHealthcheckToolExecutor({
      providerRegistry: registry,
      storageProvider: storage,
      skillLoader,
    }),
  };
}

/** Assemble the composite tool executor for the main session. */
function assembleMainToolExecutor(
  deps: {
    readonly execTools: ReturnType<typeof createExecTools>;
    readonly cronManager: Awaited<
      ReturnType<typeof createPersistentCronManager>
    >;
    readonly todoManager: ReturnType<typeof createTodoManager>;
    readonly searchProvider: ReturnType<typeof buildWebTools>["searchProvider"];
    readonly webFetcher: ReturnType<typeof buildWebTools>["webFetcher"];
    readonly memoryExecutor: Awaited<
      ReturnType<typeof initializeMemorySystem>
    >["memoryExecutor"];
    readonly planExecutor: ReturnType<typeof createPlanToolExecutor>;
    readonly browserExecutor: ReturnType<
      typeof createAutoLaunchBrowserExecutor
    >["executor"];
    readonly tidepoolExecutor: ReturnType<typeof createTidepoolToolExecutor>;
    readonly imageExecutor: ReturnType<typeof createImageToolExecutor>;
    readonly sessionExecutor: ReturnType<typeof createSessionToolExecutor>;
    readonly exploreExecutor: ReturnType<typeof createExploreToolExecutor>;
    readonly state: MainSessionState;
    readonly githubExecutor: ReturnType<typeof createGitHubToolExecutor>;
    readonly obsidianExecutor:
      | Awaited<ReturnType<typeof buildObsidianExecutor>>
      | undefined;
    readonly registry: ReturnType<typeof createProviderRegistry>;
    readonly storage: ReturnType<typeof createSqliteStorage>;
    readonly skillLoader: Awaited<ReturnType<typeof discoverSkills>>["loader"];
    readonly claudeExecutor: ReturnType<typeof createClaudeToolExecutor>;
    readonly mcpExecutor:
      | ((
        name: string,
        input: Record<string, unknown>,
      ) => Promise<string | null>)
      | undefined;
    readonly subagentFactory: ReturnType<typeof buildSubagentFactory>;
    readonly secretExecutor: ReturnType<typeof createSecretToolExecutor>;
    readonly triggerExecutor: ReturnType<typeof createTriggerToolExecutor>;
    readonly skillExecutor: ReturnType<typeof createSkillToolExecutor>;
  },
) {
  const aux = buildAuxiliaryExecutors(
    deps.registry,
    deps.storage,
    deps.skillLoader,
  );
  return createToolExecutor({
    ...deps,
    googleExecutor: buildGoogleExecutor(
      () => deps.state.session.taint,
      deps.state.session.id,
    ),
    ...aux,
    providerRegistry: deps.registry,
  });
}

/** Build the dynamic extra tools getter for the chat session. */
function buildExtraToolsGetter(
  mcpWiring: ReturnType<typeof wireMcpServers> | null,
  isTidepoolCallRef: { value: boolean },
  tidepoolToolsRef: {
    value: import("../../tools/tidepool/mod.ts").TidePoolTools | undefined;
  },
) {
  return () => [
    ...(mcpWiring ? mcpWiring.getToolDefinitions() : []),
    ...(isTidepoolCallRef.value && tidepoolToolsRef.value
      ? TOOL_GROUPS.tidepool()
      : []),
  ];
}

/** Build the dynamic extra system prompt sections getter. */
function buildExtraSystemPromptGetter(
  mcpWiring: ReturnType<typeof wireMcpServers> | null,
  isTidepoolCallRef: { value: boolean },
) {
  return () => {
    const sections: string[] = [];
    if (mcpWiring) {
      const mcpPrompt = mcpWiring.getSystemPrompt();
      if (mcpPrompt) sections.push(mcpPrompt);
    }
    if (isTidepoolCallRef.value) sections.push(TIDEPOOL_SYSTEM_PROMPT);
    return sections;
  };
}

/** Build session lifecycle callbacks (escalate, reset). */
function buildSessionLifecycleCallbacks(
  state: MainSessionState,
  browserHandle: ReturnType<typeof createAutoLaunchBrowserExecutor>,
  log: ReturnType<typeof createLogger>,
) {
  return {
    getSessionTaint: () => state.session.taint,
    escalateTaint: (level: ClassificationLevel, reason: string) => {
      state.session = updateTaint(state.session, level, reason);
    },
    resetSession: () => {
      state.session = createSession({
        userId: "owner" as UserId,
        channelId: "daemon" as ChannelId,
      });
      browserHandle.close().catch((err: unknown) => {
        log.debug("Browser close failed during session reset", {
          error: err instanceof Error ? err.message : String(err),
        });
      });
    },
  };
}

/** Shared deps shape for assembleChatSession. */
interface ChatSessionDeps {
  readonly hookRunner: ReturnType<typeof createHookRunner>;
  readonly registry: ReturnType<typeof createProviderRegistry>;
  readonly spinePath: string;
  readonly mcpWiring: ReturnType<typeof wireMcpServers> | null;
  readonly isTidepoolCallRef: { value: boolean };
  readonly tidepoolToolsRef: {
    value: import("../../tools/tidepool/mod.ts").TidePoolTools | undefined;
  };
  readonly toolExecutor: ReturnType<typeof createToolExecutor>;
  readonly skillsPrompt: string;
  readonly triggersPrompt: string;
  readonly mainKeychain: ReturnType<typeof createKeychain>;
  readonly state: MainSessionState;
  readonly streamingPref: unknown;
  readonly config: TriggerFishConfig;
  readonly visionProvider: ReturnType<typeof resolveVisionProvider>;
  readonly toolClassifications: Map<string, ClassificationLevel>;
  readonly browserHandle: ReturnType<typeof createAutoLaunchBrowserExecutor>;
  readonly log: ReturnType<typeof createLogger>;
  readonly pairingService: ReturnType<typeof createPairingService>;
  readonly pathClassifier: ReturnType<typeof createPathClassifier>;
  readonly domainClassifier: ReturnType<
    typeof buildWebTools
  >["domainClassifier"];
  readonly toolFloorRegistry: ReturnType<typeof createToolFloorRegistry>;
}

/** Build the dynamic getter and prompt options for the chat session. */
function buildChatSessionDynamicOptions(deps: ChatSessionDeps) {
  return {
    getExtraTools: buildExtraToolsGetter(
      deps.mcpWiring,
      deps.isTidepoolCallRef,
      deps.tidepoolToolsRef,
    ),
    getExtraSystemPromptSections: buildExtraSystemPromptGetter(
      deps.mcpWiring,
      deps.isTidepoolCallRef,
    ),
    systemPromptSections: [
      ...resolvePromptsForProfile("cli"),
      deps.skillsPrompt,
      deps.triggersPrompt,
    ],
    ...(deps.streamingPref !== undefined
      ? { enableStreaming: deps.streamingPref === true }
      : {}),
    debug: deps.config.debug === true ||
      Deno.env.get("TRIGGERFISH_DEBUG") === "1",
  };
}

/** Create the main chat session with all orchestrator config. */
function assembleChatSession(deps: ChatSessionDeps) {
  const lifecycle = buildSessionLifecycleCallbacks(
    deps.state,
    deps.browserHandle,
    deps.log,
  );
  return createChatSession({
    hookRunner: deps.hookRunner,
    providerRegistry: deps.registry,
    spinePath: deps.spinePath,
    tools: resolveToolsForProfile("cli"),
    ...buildChatSessionDynamicOptions(deps),
    toolExecutor: deps.toolExecutor,
    secretStore: deps.mainKeychain,
    session: deps.state.session,
    getSession: () => deps.state.session,
    visionProvider: deps.visionProvider,
    toolClassifications: deps.toolClassifications,
    ...lifecycle,
    pairingService: deps.pairingService,
    pathClassifier: deps.pathClassifier,
    domainClassifier: deps.domainClassifier,
    toolFloorRegistry: deps.toolFloorRegistry,
    primaryModelName: deps.config.models.primary.model,
  });
}

/** Wrap chat session for Tidepool with secret prompt and tidepool call flag. */
function wrapChatSessionForTidepool(
  chatSession: ReturnType<typeof createChatSession>,
  isTidepoolCallRef: { value: boolean },
  state: MainSessionState,
  cliSecretPrompt: SecretPromptCallback,
) {
  return {
    ...chatSession,
    executeAgentTurn: (
      content: Parameters<typeof chatSession.executeAgentTurn>[0],
      sendEvent: Parameters<typeof chatSession.executeAgentTurn>[1],
      signal?: Parameters<typeof chatSession.executeAgentTurn>[2],
    ) => {
      isTidepoolCallRef.value = true;
      state.activeSecretPrompt = chatSession.createTidepoolSecretPrompt(
        sendEvent,
      );
      return chatSession.executeAgentTurn(content, sendEvent, signal).finally(
        () => {
          isTidepoolCallRef.value = false;
          state.activeSecretPrompt = cliSecretPrompt;
        },
      );
    },
  };
}

/** Start Tidepool host and register notification channel. */
async function startTidepoolHost(
  tidepoolChatSession: ReturnType<typeof wrapChatSessionForTidepool>,
  notificationService: ReturnType<typeof createNotificationService>,
  log: ReturnType<typeof createLogger>,
) {
  const tidepoolHost = createA2UIHost({ chatSession: tidepoolChatSession });
  await tidepoolHost.start(TIDEPOOL_PORT);
  log.info(`Tidepool listening on http://127.0.0.1:${TIDEPOOL_PORT}`);
  console.log(`  Tidepool: http://127.0.0.1:${TIDEPOOL_PORT}`);
  notificationService.registerChannel({
    name: "tidepool",
    // deno-lint-ignore require-await
    send: async (msg) => {
      tidepoolHost.broadcastNotification(msg);
    },
  });
  return tidepoolHost;
}

/** Wrap chat session for CLI WebSocket gateway clients. */
function wrapChatSessionForGateway(
  chatSession: ReturnType<typeof createChatSession>,
  state: MainSessionState,
  cliSecretPrompt: SecretPromptCallback,
) {
  return {
    ...chatSession,
    executeAgentTurn: (
      content: Parameters<typeof chatSession.executeAgentTurn>[0],
      sendEvent: Parameters<typeof chatSession.executeAgentTurn>[1],
      signal?: Parameters<typeof chatSession.executeAgentTurn>[2],
    ) => {
      state.activeSecretPrompt = chatSession.createTidepoolSecretPrompt(
        sendEvent,
      );
      return chatSession.executeAgentTurn(content, sendEvent, signal).finally(
        () => {
          state.activeSecretPrompt = cliSecretPrompt;
        },
      );
    },
  };
}

/** Start the gateway WebSocket server and register notification channel. */
async function startGatewayServer(
  gatewayChatSession: ReturnType<typeof wrapChatSessionForGateway>,
  schedulerService: ReturnType<typeof createSchedulerService>,
  enhancedSessionManager: ReturnType<typeof createEnhancedSessionManager>,
  notificationService: ReturnType<typeof createNotificationService>,
  log: ReturnType<typeof createLogger>,
) {
  const server = createGatewayServer({
    port: 18789,
    schedulerService,
    chatSession: gatewayChatSession,
    sessionManager: enhancedSessionManager,
    notificationService,
  });
  const addr = await server.start();
  log.info(`Gateway listening on ${addr.hostname}:${addr.port}`);
  notificationService.registerChannel({
    name: "cli-websocket",
    // deno-lint-ignore require-await
    send: async (msg) => {
      server.broadcastNotification(msg);
    },
  });
  return server;
}

/** Wire configured messaging channels (Telegram, Discord, Signal). */
async function wireMessageChannels(
  config: TriggerFishConfig,
  chatSession: ReturnType<typeof createChatSession>,
  notificationService: ReturnType<typeof createNotificationService>,
  channelAdapters: Map<string, RegisteredChannel>,
) {
  const channelDeps = { chatSession, notificationService, channelAdapters };
  const telegramConfig = config.channels?.telegram as
    | TelegramChannelConfig
    | undefined;
  if (telegramConfig?.botToken) {
    await wireTelegramChannel(telegramConfig, channelDeps);
  }
  const discordConfig = config.channels?.discord as
    | DiscordChannelConfig
    | undefined;
  if (discordConfig) {
    await wireDiscordChannel(discordConfig, channelDeps);
  }
  const signalConfig = config.channels?.signal as
    | SignalChannelConfig
    | undefined;
  return signalConfig
    ? wireSignalChannel(signalConfig, channelDeps)
    : { handle: null };
}

/** Log scheduler start status and trigger interval. */
function logSchedulerStart(
  schedulerService: ReturnType<typeof createSchedulerService>,
  schedulerConfig: ReturnType<typeof buildSchedulerConfig>,
  log: ReturnType<typeof createLogger>,
): void {
  schedulerService.start();
  log.info("Scheduler started");
  if (schedulerConfig.trigger.enabled) {
    log.info(`Trigger: every ${schedulerConfig.trigger.intervalMinutes}m`);
  }
  log.info("Triggerfish is running!");
}

// ─── Bootstrap phase ─────────────────────────────────────────────────────────

/** Result of the bootstrap phase: config loaded and logger ready. */
interface BootstrapResult {
  readonly baseDir: string;
  readonly config: TriggerFishConfig;
  readonly log: ReturnType<typeof createLogger>;
}

/** Load config, initialize logging, and return bootstrap context. */
async function bootstrapConfigAndLogging(): Promise<BootstrapResult> {
  console.log("Starting Triggerfish gateway...\n");
  const baseDir = resolveBaseDir();
  const configPath = resolveConfigPath(baseDir);
  await verifyConfigExists(configPath);
  await ensureBaseDirs(baseDir);

  const fileWriter = await initializeStartupLogger();
  const log = createLogger("main");
  const config = await loadAndValidateConfig(configPath, log);
  const finalLog = reinitializeLoggerFromConfig(config, fileWriter);
  return { baseDir, config, log: finalLog };
}

// ─── Core infrastructure phase ───────────────────────────────────────────────

/** Result of core infrastructure initialization. */
interface CoreInfraResult {
  readonly dataDir: string;
  readonly storage: ReturnType<typeof createSqliteStorage>;
  readonly pairingService: ReturnType<typeof createPairingService>;
  readonly cronManager: Awaited<ReturnType<typeof createPersistentCronManager>>;
  readonly enhancedSessionManager: ReturnType<
    typeof createEnhancedSessionManager
  >;
  readonly notificationService: ReturnType<typeof createNotificationService>;
  readonly triggerStore: ReturnType<typeof createTriggerStore>;
  readonly fsPathMap: Map<string, ClassificationLevel>;
  readonly fsDefault: ClassificationLevel;
  readonly toolFloorRegistry: ReturnType<typeof createToolFloorRegistry>;
  readonly schedulerConfig: ReturnType<typeof buildSchedulerConfig>;
  readonly schedulerService: ReturnType<typeof createSchedulerService>;
  readonly factory: ReturnType<typeof createOrchestratorFactory>;
}

/** Warn if filesystem default is PUBLIC. */
function warnPublicFilesystemDefault(
  fsDefault: ClassificationLevel,
  log: ReturnType<typeof createLogger>,
): void {
  if (fsDefault === "PUBLIC") {
    log.warn(
      "filesystem.default is set to PUBLIC — all unmapped paths are accessible at PUBLIC level",
    );
  }
}

/** Build orchestrator factory and scheduler service. */
function buildSchedulerInfrastructure(
  config: TriggerFishConfig,
  baseDir: string,
  coreInfra: {
    cronManager: CoreInfraResult["cronManager"];
    storage: CoreInfraResult["storage"];
    enhancedSessionManager: CoreInfraResult["enhancedSessionManager"];
    notificationService: CoreInfraResult["notificationService"];
    triggerStore: CoreInfraResult["triggerStore"];
    fsPathMap: Map<string, ClassificationLevel>;
    fsDefault: ClassificationLevel;
    toolFloorRegistry: CoreInfraResult["toolFloorRegistry"];
  },
) {
  const factory = createOrchestratorFactory(
    config,
    baseDir,
    coreInfra.cronManager,
    coreInfra.storage,
    coreInfra.enhancedSessionManager,
    coreInfra.fsPathMap,
    coreInfra.fsDefault,
    coreInfra.toolFloorRegistry,
  );
  const schedulerConfig = buildSchedulerConfig(config, baseDir, factory);
  const schedulerService = createSchedulerService({
    ...schedulerConfig,
    cronManager: coreInfra.cronManager,
    notificationService: coreInfra.notificationService,
    ownerId: "owner" as UserId,
    triggerStore: coreInfra.triggerStore,
  });
  return { factory, schedulerConfig, schedulerService };
}

/** Build filesystem and tool-floor security config from YAML. */
function buildSecurityConfig(
  config: TriggerFishConfig,
  log: ReturnType<typeof createLogger>,
) {
  const { fsPathMap, fsDefault } = buildFilesystemPathMap(
    config.filesystem as Record<string, unknown> | undefined,
  );
  warnPublicFilesystemDefault(fsDefault, log);
  const toolFloorRegistry = buildToolFloorRegistryFromConfig(
    config.tools as Record<string, unknown> | undefined,
  );
  return { fsPathMap, fsDefault, toolFloorRegistry };
}

/** Initialize storage, sessions, security config, and scheduler. */
async function initializeCoreInfrastructure(
  bootstrap: BootstrapResult,
): Promise<CoreInfraResult> {
  const { baseDir, config, log } = bootstrap;
  const persisted = await initializePersistentStorage(baseDir, log);
  const sessions = initializeSessionInfrastructure(persisted.storage);
  const security = buildSecurityConfig(config, log);
  const scheduler = buildSchedulerInfrastructure(config, baseDir, {
    ...persisted,
    ...sessions,
    ...security,
  });
  return { ...persisted, ...sessions, ...security, ...scheduler };
}

// ─── Tool infrastructure phase ───────────────────────────────────────────────

/** Mutable ref to tidepool tools, set after host starts. */
type TidepoolToolsRef = {
  value: import("../../tools/tidepool/mod.ts").TidePoolTools | undefined;
};

/** Result of tool infrastructure initialization. */
interface ToolInfraResult {
  readonly registry: ReturnType<typeof createProviderRegistry>;
  readonly hookRunner: ReturnType<typeof createHookRunner>;
  readonly spinePath: string;
  readonly mainWorkspace: Awaited<ReturnType<typeof createWorkspace>>;
  readonly pathClassifier: ReturnType<typeof createPathClassifier>;
  readonly visionProvider: ReturnType<typeof resolveVisionProvider>;
  readonly state: MainSessionState;
  readonly cliSecretPrompt: SecretPromptCallback;
  readonly memoryDb: Awaited<
    ReturnType<typeof initializeMemorySystem>
  >["memoryDb"];
  readonly browserHandle: ReturnType<typeof initializeBrowserExecutor>;
  readonly channelAdapters: Map<string, RegisteredChannel>;
  readonly toolClassifications: Map<string, ClassificationLevel>;
  readonly keychain: ReturnType<typeof createKeychain>;
  readonly mcpBroadcastRefs: McpBroadcastRefs;
  readonly mcpWiring: ReturnType<typeof wireMcpServers> | null;
  readonly toolExecutor: ReturnType<typeof createToolExecutor>;
  readonly skillsPrompt: string;
  readonly triggersPrompt: string;
  readonly mainKeychain: ReturnType<typeof createKeychain>;
  readonly domainClassifier: ReturnType<
    typeof buildWebTools
  >["domainClassifier"];
  readonly toolFloorRegistry: ReturnType<typeof createToolFloorRegistry>;
  readonly tidepoolToolsRef: TidepoolToolsRef;
}

/** Create the main session state and core session-level executors. */
function initializeMainSessionState(): {
  state: MainSessionState;
  cliSecretPrompt: SecretPromptCallback;
} {
  const state: MainSessionState = {
    session: createSession({
      userId: "owner" as UserId,
      channelId: "daemon" as ChannelId,
    }),
    activeSecretPrompt: createCliSecretPrompt(),
  };
  return { state, cliSecretPrompt: state.activeSecretPrompt };
}

/** Build media-related executors (vision, browser, tidepool, image). */
function buildMediaExecutors(
  config: TriggerFishConfig,
  dataDir: string,
  storage: ReturnType<typeof createSqliteStorage>,
  state: MainSessionState,
  registry: ReturnType<typeof createProviderRegistry>,
) {
  const visionProvider = resolveVisionProvider(config.models as ModelsConfig);
  const browserHandle = initializeBrowserExecutor(
    config,
    dataDir,
    storage,
    () => state.session.taint,
    visionProvider,
    registry.getDefault(),
  );
  // deno-lint-ignore prefer-const
  let tidepoolToolsRef: TidepoolToolsRef = { value: undefined };
  const tidepoolExecutor = createTidepoolToolExecutor(
    () => tidepoolToolsRef.value,
  );
  const imageExecutor = createImageToolExecutor(registry, visionProvider);
  return {
    visionProvider,
    browserHandle,
    tidepoolToolsRef,
    tidepoolExecutor,
    imageExecutor,
  };
}

/** Build session and channel management executors. */
function buildSessionChannelExecutors(
  coreInfra: CoreInfraResult,
  state: MainSessionState,
) {
  const channelAdapters = new Map<string, RegisteredChannel>();
  const sessionExecutor = createSessionToolExecutor({
    sessionManager: coreInfra.enhancedSessionManager,
    callerSessionId: state.session.id,
    callerTaint: state.session.taint,
    getCallerTaint: () => state.session.taint,
    channels: channelAdapters,
    pairingService: coreInfra.pairingService,
  });
  return { channelAdapters, sessionExecutor };
}

/** Create session-scoped executors (memory, plan, browser, tidepool, image, session). */
async function buildSessionScopedExecutors(
  bootstrap: BootstrapResult,
  coreInfra: CoreInfraResult,
  toolInfra: {
    registry: ReturnType<typeof createProviderRegistry>;
    mainWorkspace: Awaited<ReturnType<typeof createWorkspace>>;
    state: MainSessionState;
  },
) {
  const { state, mainWorkspace, registry } = toolInfra;
  const { memoryDb, memoryExecutor } = await initializeMemorySystem(
    coreInfra.dataDir,
    coreInfra.storage,
    state.session,
  );
  const mainPlanExecutor = createPlanToolExecutor(
    createPlanManager({ plansDir: `${mainWorkspace.path}/plans` }),
    state.session.id,
  );
  const media = buildMediaExecutors(
    bootstrap.config,
    coreInfra.dataDir,
    coreInfra.storage,
    state,
    registry,
  );
  const channels = buildSessionChannelExecutors(coreInfra, state);
  return { memoryDb, memoryExecutor, mainPlanExecutor, ...media, ...channels };
}

/** Initialize MCP servers and create broadcast refs. */
function initializeMcpInfrastructure(
  config: TriggerFishConfig,
  hookRunner: ReturnType<typeof createHookRunner>,
  state: MainSessionState,
  toolClassifications: Map<string, ClassificationLevel>,
  keychain: ReturnType<typeof createKeychain>,
) {
  const mcpBroadcastRefs: McpBroadcastRefs = {
    chatSession: null,
    gatewayServer: null,
    tidepoolHost: null,
  };
  const { mcpExecutor, mcpWiring } = initializeMcpServers(
    config,
    hookRunner,
    () => state.session,
    toolClassifications,
    mcpBroadcastRefs,
    keychain,
  );
  return { mcpBroadcastRefs, mcpExecutor, mcpWiring };
}

/** Build external service integrations (GitHub, Obsidian, MCP). */
async function buildExternalServiceExecutors(
  config: TriggerFishConfig,
  hookRunner: ReturnType<typeof createHookRunner>,
  state: MainSessionState,
  toolClassifications: Map<string, ClassificationLevel>,
) {
  const { executor: githubExecutor, keychain } = await buildGitHubExecutor(
    config,
    state.session,
  );
  const obsidianExecutor = config.plugins?.obsidian
    ? await buildObsidianExecutor(
      config.plugins.obsidian as ObsidianPluginConfig,
      () => state.session.taint,
      state.session.id,
    )
    : undefined;
  const mcp = initializeMcpInfrastructure(
    config,
    hookRunner,
    state,
    toolClassifications,
    keychain,
  );
  return { githubExecutor, keychain, obsidianExecutor, ...mcp };
}

/** Build trigger executor with session taint escalation. */
function buildMainTriggerExecutor(
  triggerStore: ReturnType<typeof createTriggerStore>,
  state: MainSessionState,
) {
  return createTriggerToolExecutor({
    triggerStore,
    sessionTaint: state.session.taint,
    getSessionTaint: () => state.session.taint,
    escalateTaint: (level: ClassificationLevel) => {
      state.session = updateTaint(
        state.session,
        level,
        "trigger context injection",
      );
    },
  });
}

/** Build agent-local tool executors (claude, secrets, triggers, skills). */
function buildAgentToolExecutors(
  mainWorkspace: Awaited<ReturnType<typeof createWorkspace>>,
  state: MainSessionState,
  triggerStore: ReturnType<typeof createTriggerStore>,
  skillLoader: Awaited<ReturnType<typeof discoverSkills>>["loader"],
) {
  const claudeExecutor = createClaudeToolExecutor(
    createClaudeSessionManager({ workspacePath: mainWorkspace.path }),
  );
  const mainKeychain = createKeychain();
  const secretExecutor = createSecretToolExecutor(
    mainKeychain,
    (name, hint) => state.activeSecretPrompt(name, hint),
  );
  return {
    claudeExecutor,
    mainKeychain,
    secretExecutor,
    triggerExecutor: buildMainTriggerExecutor(triggerStore, state),
    skillExecutor: createSkillToolExecutor({ skillLoader }),
  };
}

/** Discover skills and build agent-local + skill executors. */
async function buildSkillAndAgentExecutors(
  bootstrap: BootstrapResult,
  coreInfra: CoreInfraResult,
  mainWorkspace: Awaited<ReturnType<typeof createWorkspace>>,
  state: MainSessionState,
) {
  const { skills, loader: skillLoader } = await discoverSkills(
    bootstrap.baseDir,
  );
  const agentTools = buildAgentToolExecutors(
    mainWorkspace,
    state,
    coreInfra.triggerStore,
    skillLoader,
  );
  return {
    skillLoader,
    skillsPrompt: buildSkillsSystemPrompt(skills),
    triggersPrompt: buildTriggersSystemPrompt(bootstrap.baseDir),
    ...agentTools,
  };
}

/** Build integration executors (GitHub, Obsidian, MCP, Skills, Secrets, Triggers). */
async function buildIntegrationExecutors(
  bootstrap: BootstrapResult,
  coreInfra: CoreInfraResult,
  toolInfra: {
    hookRunner: ReturnType<typeof createHookRunner>;
    mainWorkspace: Awaited<ReturnType<typeof createWorkspace>>;
    state: MainSessionState;
    factory: ReturnType<typeof createOrchestratorFactory>;
    registry: ReturnType<typeof createProviderRegistry>;
    toolClassifications: Map<string, ClassificationLevel>;
  },
) {
  const { state, factory, registry, mainWorkspace } = toolInfra;
  const subagentFactory = buildSubagentFactory(factory);
  const exploreExecutor = buildExploreExecutor(subagentFactory, registry);
  const external = await buildExternalServiceExecutors(
    bootstrap.config,
    toolInfra.hookRunner,
    state,
    toolInfra.toolClassifications,
  );
  const skillAndAgent = await buildSkillAndAgentExecutors(
    bootstrap,
    coreInfra,
    mainWorkspace,
    state,
  );
  return { subagentFactory, exploreExecutor, ...external, ...skillAndAgent };
}

/** Build LLM, workspace, and path classifier foundation. */
async function buildLlmAndWorkspaceFoundation(
  bootstrap: BootstrapResult,
  coreInfra: CoreInfraResult,
) {
  const { registry, hookRunner } = initializeLlmProviders(
    bootstrap.config,
    bootstrap.log,
  );
  const { spinePath, mainWorkspace } = await initializeMainWorkspace(
    bootstrap.baseDir,
  );
  const pathClassifier = buildMainPathClassifier(
    coreInfra.fsPathMap,
    coreInfra.fsDefault,
    mainWorkspace,
  );
  return { registry, hookRunner, spinePath, mainWorkspace, pathClassifier };
}

/** Initialize LLM providers, workspace, and base tool dependencies. */
async function initializeBaseToolDeps(
  bootstrap: BootstrapResult,
  coreInfra: CoreInfraResult,
) {
  const foundation = await buildLlmAndWorkspaceFoundation(bootstrap, coreInfra);
  const execTools = createExecTools(foundation.mainWorkspace);
  const todoManager = createTodoManager({
    storage: coreInfra.storage,
    agentId: "main-session",
  });
  const { state, cliSecretPrompt } = initializeMainSessionState();
  return {
    ...foundation,
    execTools,
    todoManager,
    ...buildWebTools(bootstrap.config),
    state,
    cliSecretPrompt,
    toolClassifications: mapToolPrefixClassifications(bootstrap.config),
  };
}

/** Combine all executor outputs into the composite tool executor. */
function buildCompositeToolExecutor(
  baseDeps: Awaited<ReturnType<typeof initializeBaseToolDeps>>,
  coreInfra: CoreInfraResult,
  sessionExecs: Awaited<ReturnType<typeof buildSessionScopedExecutors>>,
  integrations: Awaited<ReturnType<typeof buildIntegrationExecutors>>,
) {
  return assembleMainToolExecutor({
    execTools: baseDeps.execTools,
    cronManager: coreInfra.cronManager,
    todoManager: baseDeps.todoManager,
    searchProvider: baseDeps.searchProvider,
    webFetcher: baseDeps.webFetcher,
    memoryExecutor: sessionExecs.memoryExecutor,
    planExecutor: sessionExecs.mainPlanExecutor,
    browserExecutor: sessionExecs.browserHandle.executor,
    tidepoolExecutor: sessionExecs.tidepoolExecutor,
    imageExecutor: sessionExecs.imageExecutor,
    sessionExecutor: sessionExecs.sessionExecutor,
    exploreExecutor: integrations.exploreExecutor,
    state: baseDeps.state,
    githubExecutor: integrations.githubExecutor,
    obsidianExecutor: integrations.obsidianExecutor,
    registry: baseDeps.registry,
    storage: coreInfra.storage,
    skillLoader: integrations.skillLoader,
    claudeExecutor: integrations.claudeExecutor,
    mcpExecutor: integrations.mcpExecutor,
    subagentFactory: integrations.subagentFactory,
    secretExecutor: integrations.secretExecutor,
    triggerExecutor: integrations.triggerExecutor,
    skillExecutor: integrations.skillExecutor,
  });
}

/** Assemble the final ToolInfraResult from sub-phase outputs. */
function assembleToolInfraResult(
  baseDeps: Awaited<ReturnType<typeof initializeBaseToolDeps>>,
  coreInfra: CoreInfraResult,
  sessionExecs: Awaited<ReturnType<typeof buildSessionScopedExecutors>>,
  integrations: Awaited<ReturnType<typeof buildIntegrationExecutors>>,
  toolExecutor: ReturnType<typeof createToolExecutor>,
): ToolInfraResult {
  return {
    registry: baseDeps.registry,
    hookRunner: baseDeps.hookRunner,
    spinePath: baseDeps.spinePath,
    mainWorkspace: baseDeps.mainWorkspace,
    pathClassifier: baseDeps.pathClassifier,
    visionProvider: sessionExecs.visionProvider,
    state: baseDeps.state,
    cliSecretPrompt: baseDeps.cliSecretPrompt,
    memoryDb: sessionExecs.memoryDb,
    browserHandle: sessionExecs.browserHandle,
    channelAdapters: sessionExecs.channelAdapters,
    toolClassifications: baseDeps.toolClassifications,
    keychain: integrations.keychain,
    mcpBroadcastRefs: integrations.mcpBroadcastRefs,
    mcpWiring: integrations.mcpWiring,
    toolExecutor,
    skillsPrompt: integrations.skillsPrompt,
    triggersPrompt: integrations.triggersPrompt,
    mainKeychain: integrations.mainKeychain,
    domainClassifier: baseDeps.domainClassifier,
    toolFloorRegistry: coreInfra.toolFloorRegistry,
    tidepoolToolsRef: sessionExecs.tidepoolToolsRef,
  };
}

/** Wire all tool infrastructure: LLM providers, executors, integrations. */
async function initializeToolInfrastructure(
  bootstrap: BootstrapResult,
  coreInfra: CoreInfraResult,
): Promise<ToolInfraResult> {
  const baseDeps = await initializeBaseToolDeps(bootstrap, coreInfra);
  const sessionExecs = await buildSessionScopedExecutors(
    bootstrap,
    coreInfra,
    baseDeps,
  );
  const integrations = await buildIntegrationExecutors(
    bootstrap,
    coreInfra,
    { ...baseDeps, factory: coreInfra.factory },
  );
  const toolExecutor = buildCompositeToolExecutor(
    baseDeps,
    coreInfra,
    sessionExecs,
    integrations,
  );
  return assembleToolInfraResult(
    baseDeps,
    coreInfra,
    sessionExecs,
    integrations,
    toolExecutor,
  );
}

// ─── Service startup phase ───────────────────────────────────────────────────

/** Create the main chat session from assembled infrastructure. */
function buildMainChatSession(
  bootstrap: BootstrapResult,
  coreInfra: CoreInfraResult,
  toolInfra: ToolInfraResult,
  isTidepoolCallRef: { value: boolean },
) {
  const modelsConfig = bootstrap.config.models as
    | Record<string, unknown>
    | undefined;
  return assembleChatSession({
    hookRunner: toolInfra.hookRunner,
    registry: toolInfra.registry,
    spinePath: toolInfra.spinePath,
    mcpWiring: toolInfra.mcpWiring,
    isTidepoolCallRef,
    tidepoolToolsRef: toolInfra.tidepoolToolsRef,
    toolExecutor: toolInfra.toolExecutor,
    skillsPrompt: toolInfra.skillsPrompt,
    triggersPrompt: toolInfra.triggersPrompt,
    mainKeychain: toolInfra.mainKeychain,
    state: toolInfra.state,
    streamingPref: modelsConfig?.streaming,
    config: bootstrap.config,
    visionProvider: toolInfra.visionProvider,
    toolClassifications: toolInfra.toolClassifications,
    browserHandle: toolInfra.browserHandle,
    log: bootstrap.log,
    pairingService: coreInfra.pairingService,
    pathClassifier: toolInfra.pathClassifier,
    domainClassifier: toolInfra.domainClassifier,
    toolFloorRegistry: toolInfra.toolFloorRegistry,
  });
}

/** Start the Tidepool host and wire tool references. */
async function launchTidepoolService(
  toolInfra: ToolInfraResult,
  chatSession: ReturnType<typeof createChatSession>,
  isTidepoolCallRef: { value: boolean },
  notificationService: CoreInfraResult["notificationService"],
  log: BootstrapResult["log"],
) {
  const tidepoolChatSession = wrapChatSessionForTidepool(
    chatSession,
    isTidepoolCallRef,
    toolInfra.state,
    toolInfra.cliSecretPrompt,
  );
  const tidepoolHost = await startTidepoolHost(
    tidepoolChatSession,
    notificationService,
    log,
  );
  toolInfra.tidepoolToolsRef.value = createTidePoolTools(tidepoolHost);
  toolInfra.mcpBroadcastRefs.tidepoolHost = tidepoolHost;
  return tidepoolHost;
}

/** Start the Gateway WebSocket service. */
async function launchGatewayService(
  toolInfra: ToolInfraResult,
  chatSession: ReturnType<typeof createChatSession>,
  coreInfra: CoreInfraResult,
  log: BootstrapResult["log"],
) {
  const gatewayChatSession = wrapChatSessionForGateway(
    chatSession,
    toolInfra.state,
    toolInfra.cliSecretPrompt,
  );
  const server = await startGatewayServer(
    gatewayChatSession,
    coreInfra.schedulerService,
    coreInfra.enhancedSessionManager,
    coreInfra.notificationService,
    log,
  );
  toolInfra.mcpBroadcastRefs.gatewayServer = server;
  return server;
}

/** Start Tidepool and Gateway servers, returning handles for shutdown. */
async function startNetworkServices(
  bootstrap: BootstrapResult,
  coreInfra: CoreInfraResult,
  toolInfra: ToolInfraResult,
  chatSession: ReturnType<typeof createChatSession>,
  isTidepoolCallRef: { value: boolean },
) {
  const tidepoolHost = await launchTidepoolService(
    toolInfra,
    chatSession,
    isTidepoolCallRef,
    coreInfra.notificationService,
    bootstrap.log,
  );
  const server = await launchGatewayService(
    toolInfra,
    chatSession,
    coreInfra,
    bootstrap.log,
  );
  return { tidepoolHost, server };
}

/** Build chat session and start Tidepool + Gateway servers. */
async function startServicesAndChannels(
  bootstrap: BootstrapResult,
  coreInfra: CoreInfraResult,
  toolInfra: ToolInfraResult,
): Promise<ShutdownDeps> {
  const isTidepoolCallRef = { value: false };
  const chatSession = buildMainChatSession(
    bootstrap,
    coreInfra,
    toolInfra,
    isTidepoolCallRef,
  );
  bootstrap.log.info("Main session created");
  toolInfra.mcpBroadcastRefs.chatSession = chatSession;

  const { tidepoolHost, server } = await startNetworkServices(
    bootstrap,
    coreInfra,
    toolInfra,
    chatSession,
    isTidepoolCallRef,
  );
  const signalDaemonState = await wireMessageChannels(
    bootstrap.config,
    chatSession,
    coreInfra.notificationService,
    toolInfra.channelAdapters,
  );
  logSchedulerStart(
    coreInfra.schedulerService,
    coreInfra.schedulerConfig,
    bootstrap.log,
  );
  return assembleShutdownDeps(
    coreInfra,
    toolInfra,
    bootstrap.log,
    signalDaemonState,
    server,
    tidepoolHost,
  );
}

/** Assemble shutdown dependency bag from service handles. */
function assembleShutdownDeps(
  coreInfra: CoreInfraResult,
  toolInfra: ToolInfraResult,
  log: ReturnType<typeof createLogger>,
  signalDaemonState: Awaited<ReturnType<typeof wireMessageChannels>>,
  server: Awaited<ReturnType<typeof startGatewayServer>>,
  tidepoolHost: Awaited<ReturnType<typeof startTidepoolHost>>,
): ShutdownDeps {
  return {
    signalDaemonState,
    schedulerService: coreInfra.schedulerService,
    server,
    tidepoolHost,
    memoryDb: toolInfra.memoryDb,
    storage: coreInfra.storage,
    log,
  };
}

// ─── Main entry point ────────────────────────────────────────────────────────

/**
 * Start the gateway server with scheduler and persistent cron storage.
 */
export async function runStart(): Promise<void> {
  const bootstrap = await bootstrapConfigAndLogging();
  const coreInfra = await initializeCoreInfrastructure(bootstrap);
  const toolInfra = await initializeToolInfrastructure(bootstrap, coreInfra);
  const shutdownDeps = await startServicesAndChannels(
    bootstrap,
    coreInfra,
    toolInfra,
  );
  registerShutdownHandlers(shutdownDeps);
  // Keep running until interrupted
  await new Promise(() => {}); // Never resolves — signal handler calls Deno.exit()
}
