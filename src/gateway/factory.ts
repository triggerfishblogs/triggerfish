/**
 * Factory functions for building orchestrators, schedulers, and Google tools.
 *
 * Contains buildWebTools, buildSubagentFactory, createOrchestratorFactory,
 * buildSchedulerConfig, GOOGLE_SCOPES, and buildGoogleExecutor.
 * @module
 */

import { join } from "@std/path";
import type { TriggerFishConfig } from "../core/config.ts";
import type { ClassificationLevel } from "../core/types/classification.ts";
import type { SessionId } from "../core/types/session.ts";
import { createSession, updateTaint } from "../core/types/session.ts";
import type { ChannelId, UserId } from "../core/types/session.ts";
import { createProviderRegistry } from "../agent/llm.ts";
import {
  loadProvidersFromConfig,
  resolveVisionProvider,
} from "../agent/providers/config.ts";
import type { ModelsConfig } from "../agent/providers/config.ts";
import {
  buildToolClassifications,
  createOrchestrator,
} from "../agent/orchestrator.ts";
// OrchestratorFactory is imported below with other scheduler types
import { createPolicyEngine } from "../core/policy/engine.ts";
import { createDefaultRules, createHookRunner } from "../core/policy/hooks.ts";
import { createWorkspace } from "../exec/workspace.ts";
import { createExecTools } from "../exec/tools.ts";
import { createPathClassifier } from "../core/security/path_classification.ts";
import type { ToolFloorRegistry } from "../core/security/tool_floors.ts";
import {
  createLlmTaskToolExecutor,
  createSummarizeToolExecutor,
  createTodoManager,
  getLlmTaskToolDefinitions,
  getSummarizeToolDefinitions,
  getTodoToolDefinitions,
  createHealthcheckToolExecutor,
  getHealthcheckToolDefinitions,
} from "../tools/mod.ts";
import type { TodoManager } from "../tools/mod.ts";
import {
  createMemoryStore,
  createMemoryToolExecutor,
  getMemoryToolDefinitions,
} from "../memory/mod.ts";
import {
  createBraveSearchProvider,
  createDomainClassifier,
  createDomainPolicy,
  createRateLimitedSearchProvider,
  createWebFetcher,
  getWebToolDefinitions,
} from "../web/mod.ts";
import type {
  DomainClassifier,
  DomainSecurityConfig,
  SearchProvider,
  WebFetcher,
} from "../web/mod.ts";
import { createPlanManager, createPlanToolExecutor } from "../agent/plan.ts";
import {
  getPlanToolDefinitions,
} from "../agent/plan_tools.ts";
import {
  createCalendarService,
  createDriveService,
  createGmailService,
  createGoogleApiClient,
  createGoogleAuthManager,
  createGoogleToolExecutor,
  createSheetsService,
  createTasksService,
} from "../integrations/google/mod.ts";
import {
  createGitHubClient,
  createGitHubToolExecutor,
  resolveGitHubToken,
} from "../integrations/github/mod.ts";
import { createKeychain } from "../secrets/keychain.ts";
import {
  createSessionToolExecutor,
} from "./tools.ts";
import {
  createTriggerClassificationToolExecutor,
  TRIGGER_SESSION_SYSTEM_PROMPT,
} from "./trigger_tools.ts";
import type { EnhancedSessionManager } from "./sessions.ts";
import type { CronManager } from "../scheduler/cron.ts";
import type { StorageProvider } from "../core/storage/provider.ts";
import type {
  OrchestratorFactory,
  OrchestratorCreateOptions,
  SchedulerServiceConfig,
  WebhookSourceConfig,
} from "../scheduler/service.ts";
import { createSkillLoader } from "../skills/loader.ts";
import { buildSkillsSystemPrompt } from "../skills/prompts.ts";
import { createSkillToolExecutor } from "../skills/mod.ts";
import { getToolsForProfile, getPromptsForProfile, createToolExecutor } from "./agent_tools.ts";

/**
 * Build web search/fetch infrastructure from config.
 *
 * Returns a SearchProvider (if configured) and a WebFetcher.
 */
export function buildWebTools(
  config: TriggerFishConfig,
): { searchProvider: SearchProvider | undefined; webFetcher: WebFetcher; domainClassifier: DomainClassifier } {
  const webConfig = config.web;

  // Build domain security config
  const domainSecConfig: DomainSecurityConfig = {
    allowlist: webConfig?.domains?.allowlist ?? [],
    denylist: webConfig?.domains?.denylist ?? [],
    classificationMap: (webConfig?.domains?.classifications ?? []).map((c) => ({
      pattern: c.pattern,
      classification: c.classification as ClassificationLevel,
    })),
  };

  const domainPolicy = createDomainPolicy(domainSecConfig);
  const domainClassifier = createDomainClassifier(domainPolicy);
  const webFetcher = createWebFetcher(domainPolicy);

  // Build search provider
  let searchProvider: SearchProvider | undefined;
  const searchConfig = webConfig?.search;

  if (searchConfig?.provider === "brave" && searchConfig.api_key) {
    searchProvider = createBraveSearchProvider({
      apiKey: searchConfig.api_key,
    });
  } else if (searchConfig?.api_key) {
    // Default to Brave if an API key is provided without explicit provider
    searchProvider = createBraveSearchProvider({
      apiKey: searchConfig.api_key,
    });
  }

  if (searchProvider && searchConfig?.rate_limit) {
    searchProvider = createRateLimitedSearchProvider(
      searchProvider,
      searchConfig.rate_limit,
    );
  }

  return { searchProvider, webFetcher, domainClassifier };
}

/**
 * Build a subagent factory that uses OrchestratorFactory to spawn isolated agents.
 *
 * Each call creates a fresh orchestrator + session and processes the task prompt,
 * returning the agent's text response.
 */
export function buildSubagentFactory(
  orchFactory: OrchestratorFactory,
): (task: string, tools?: string) => Promise<string> {
  return async (task: string, _tools?: string): Promise<string> => {
    const { orchestrator, session } = await orchFactory.create("subagent");
    const result = await orchestrator.processMessage({
      session,
      message: task,
      targetClassification: session.taint,
    });
    if (!result.ok) return `Sub-agent error: ${result.error}`;
    return result.value.response;
  };
}

/**
 * Create an OrchestratorFactory from config.
 *
 * The factory captures shared infrastructure (provider registry, policy
 * engine, hook runner, tool definitions) and creates a fresh workspace,
 * session, and orchestrator per call for execution isolation.
 */
export function createOrchestratorFactory(
  config: TriggerFishConfig,
  baseDir: string,
  cronManager?: CronManager,
  storage?: StorageProvider,
  enhancedSessionManager?: EnhancedSessionManager,
  fsPathMap?: ReadonlyMap<string, ClassificationLevel>,
  fsDefault?: ClassificationLevel,
  schedulerToolFloorRegistry?: ToolFloorRegistry,
): OrchestratorFactory {
  const registry = createProviderRegistry();
  loadProvidersFromConfig(config.models as ModelsConfig, registry);
  const schedulerVisionProvider = resolveVisionProvider(
    config.models as ModelsConfig,
  );

  const engine = createPolicyEngine();
  for (const rule of createDefaultRules()) {
    engine.addRule(rule);
  }
  const hookRunner = createHookRunner(engine);

  const spinePath = join(baseDir, "SPINE.md");
  const { searchProvider, webFetcher, domainClassifier: schedulerDomainClassifier } = buildWebTools(config);
  const schedulerKeychain = createKeychain();

  // Shared by all scheduler orchestrators — same config-driven map
  const schedulerToolClassifications = buildToolClassifications(config);

  // Discover skills for scheduler agents (same directories as main session)
  const factoryBundledSkillsDir = join(
    import.meta.dirname ?? ".",
    "..",
    "..",
    "skills",
    "bundled",
  );
  const factoryManagedSkillsDir = join(baseDir, "skills");
  const factoryWorkspaceSkillsDir = join(
    baseDir,
    "workspaces",
    "main",
    "skills",
  );
  const factorySkillLoader = createSkillLoader({
    directories: [
      factoryBundledSkillsDir,
      factoryManagedSkillsDir,
      factoryWorkspaceSkillsDir,
    ],
    dirTypes: {
      [factoryBundledSkillsDir]: "bundled",
      [factoryManagedSkillsDir]: "managed",
      [factoryWorkspaceSkillsDir]: "workspace",
    },
  });
  let factorySkillsPrompt = "";
  // Discover is async — do it lazily on first create()
  let factorySkillsDiscovered = false;

  return {
    async create(channelId: string, options?: OrchestratorCreateOptions) {
      if (!factorySkillsDiscovered) {
        factorySkillsDiscovered = true;
        try {
          const skills = await factorySkillLoader.discover();
          factorySkillsPrompt = buildSkillsSystemPrompt(skills);
        } catch {
          // Non-fatal
        }
      }
      const isTrigger = options?.isTrigger ?? false;
      const triggerCeiling = options?.ceiling ?? null;
      const agentId = `scheduler-${channelId}-${Date.now()}`;
      const workspace = await createWorkspace({
        agentId,
        basePath: join(baseDir, "workspaces"),
      });

      // Symlink SPINE.md into workspace so the agent can read AND edit its identity
      try {
        const workspaceSpine = join(workspace.path, "SPINE.md");
        try {
          await Deno.remove(workspaceSpine);
        } catch { /* doesn't exist yet */ }
        await Deno.symlink(spinePath, workspaceSpine);
      } catch {
        // SPINE.md may not exist yet — not fatal
      }

      const execTools = createExecTools(workspace);
      const todoManager = storage
        ? createTodoManager({ storage, agentId })
        : undefined;
      let session = createSession({
        userId: "owner" as UserId,
        channelId: channelId as ChannelId,
      });

      // Memory for scheduler agents (uses storage-backed store, no FTS5)
      let schedulerMemoryExecutor:
        | ((
          name: string,
          input: Record<string, unknown>,
        ) => Promise<string | null>)
        | undefined;
      if (storage) {
        const schedulerMemoryStore = createMemoryStore({ storage });
        schedulerMemoryExecutor = createMemoryToolExecutor({
          store: schedulerMemoryStore,
          agentId,
          sessionTaint: session.taint,
          sourceSessionId: session.id,
        });
      }

      // Plan manager for scheduler agents
      const planManager = createPlanManager({
        plansDir: `${workspace.path}/plans`,
      });
      const planExecutor = createPlanToolExecutor(planManager, session.id);

      // Session tools for scheduler agents (if session manager is available)
      const sessionExecutor = enhancedSessionManager
        ? createSessionToolExecutor({
          sessionManager: enhancedSessionManager,
          callerSessionId: session.id,
          callerTaint: session.taint,
        })
        : undefined;

      // GitHub tools for scheduler agents
      const schedulerGithubTokenResult = await resolveGitHubToken({
        secretStore: schedulerKeychain,
      });
      const schedulerGithubExecutor = createGitHubToolExecutor(
        schedulerGithubTokenResult.ok
          ? {
            client: createGitHubClient({
              token: schedulerGithubTokenResult.value,
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

      const factorySkillExecutor = createSkillToolExecutor({
        skillLoader: factorySkillLoader,
      });

      const toolExecutor = createToolExecutor({
        execTools,
        cronManager,
        todoManager,
        searchProvider,
        webFetcher,
        memoryExecutor: schedulerMemoryExecutor,
        planExecutor,
        sessionExecutor,
        googleExecutor: buildGoogleExecutor(() => session.taint, session.id),
        githubExecutor: schedulerGithubExecutor,
        llmTaskExecutor: registry
          ? createLlmTaskToolExecutor(registry)
          : undefined,
        summarizeExecutor: registry
          ? createSummarizeToolExecutor(registry)
          : undefined,
        healthcheckExecutor: createHealthcheckToolExecutor({
          providerRegistry: registry,
          storageProvider: storage,
          skillLoader: factorySkillLoader,
        }),
        skillExecutor: factorySkillExecutor,
        providerRegistry: registry,
        // Trigger classification tool: available in all scheduler sessions,
        // but only instructed to use in trigger sessions via system prompt.
        triggerClassificationExecutor: createTriggerClassificationToolExecutor(
          schedulerToolClassifications,
        ),
      });
      // Build path classifier for scheduler workspace
      const schedulerPathClassifier = fsPathMap ? createPathClassifier(
        { paths: fsPathMap, defaultClassification: fsDefault ?? "CONFIDENTIAL" },
        {
          basePath: workspace.path,
          internalPath: workspace.internalPath,
          confidentialPath: workspace.confidentialPath,
          restrictedPath: workspace.restrictedPath,
        },
      ) : undefined;

      // Select tool profile based on session type — triggers/cron/subagents
      // each get only the tools they have wired executors for.
      const toolProfile = isTrigger ? "triggerSession" : "cronJob";

      const orchestrator = createOrchestrator({
        hookRunner,
        providerRegistry: registry,
        spinePath,
        tools: getToolsForProfile(toolProfile),
        toolExecutor,
        systemPromptSections: [
          ...getPromptsForProfile(toolProfile),
          factorySkillsPrompt,
          // Inject trigger-specific classification ordering instructions when
          // this session is a trigger session. Cron jobs and subagents do not
          // get this section — it is only relevant for trigger sessions.
          ...(isTrigger ? [TRIGGER_SESSION_SYSTEM_PROMPT] : []),
        ],
        visionProvider: schedulerVisionProvider,
        toolClassifications: schedulerToolClassifications,
        getSessionTaint: () => session.taint,
        escalateTaint: (level: ClassificationLevel, reason: string) => {
          session = updateTaint(session, level, reason);
        },
        pathClassifier: schedulerPathClassifier,
        domainClassifier: schedulerDomainClassifier,
        toolFloorRegistry: schedulerToolFloorRegistry,
        // Trigger sessions are not owner sessions but get built-in tool access
        // and integration tools classified at or below their ceiling.
        // isTriggerSession undefined is always false — must be explicitly set.
        ...(isTrigger
          ? {
            isTriggerSession: () => true,
            getNonOwnerCeiling: () => triggerCeiling,
          }
          : {}),
      });

      return { orchestrator, session };
    },
  };
}

/**
 * Build a SchedulerServiceConfig from the YAML config with defaults.
 */
export function buildSchedulerConfig(
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
    triggerMdPath: join(baseDir, "TRIGGER.md"),
    trigger: {
      // interval_minutes: 0 disables triggers without requiring the enabled flag
      enabled: (sched?.trigger?.enabled ?? true) && (sched?.trigger?.interval_minutes ?? 30) !== 0,
      intervalMinutes: sched?.trigger?.interval_minutes ?? 30,
      quietHours: sched?.trigger?.quiet_hours
        ? {
          start: sched.trigger.quiet_hours.start ?? 22,
          end: sched.trigger.quiet_hours.end ?? 7,
        }
        : { start: 22, end: 7 },
      classificationCeiling: (sched?.trigger?.classification_ceiling ?? "CONFIDENTIAL") as ClassificationLevel,
    },
    webhooks: {
      enabled: sched?.webhooks?.enabled ?? false,
      sources,
    },
  };
}

/**
 * Build Google Workspace tool executor.
 *
 * Creates the full auth → client → services → executor chain.
 * Auth failures are lazy — if tokens don't exist, the user gets a
 * clear error at tool-call time, not at startup.
 */
export function buildGoogleExecutor(
  getSessionTaint: () => ClassificationLevel,
  sourceSessionId: SessionId,
):
  | ((name: string, input: Record<string, unknown>) => Promise<string | null>)
  | undefined {
  try {
    const secretStore = createKeychain();
    const authManager = createGoogleAuthManager(secretStore);
    const apiClient = createGoogleApiClient(authManager);
    return createGoogleToolExecutor({
      gmail: createGmailService(apiClient),
      calendar: createCalendarService(apiClient),
      tasks: createTasksService(apiClient),
      drive: createDriveService(apiClient),
      sheets: createSheetsService(apiClient),
      sessionTaint: getSessionTaint,
      sourceSessionId,
    });
  } catch {
    return undefined;
  }
}
