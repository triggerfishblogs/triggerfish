/**
 * Tool infrastructure initialization phase.
 *
 * Wires all tool executors: LLM providers, workspace, memory, browser,
 * tidepool, GitHub, Obsidian, MCP, skills, secrets, triggers, and
 * assembles them into the composite tool executor.
 *
 * @module
 */

import type { ClassificationLevel } from "../../../core/types/classification.ts";
import { createSession } from "../../../core/types/session.ts";
import type { ChannelId, UserId } from "../../../core/types/session.ts";
import type { TriggerFishConfig } from "../../../core/config.ts";
import { createProviderRegistry } from "../../../agent/llm.ts";
import {
  resolveVisionProvider,
} from "../../../agent/providers/config.ts";
import type { ModelsConfig } from "../../../agent/providers/config.ts";
import type { createHookRunner } from "../../../core/policy/hooks/hooks.ts";
import { createExecTools } from "../../../exec/tools.ts";
import type { createSqliteStorage } from "../../../core/storage/sqlite.ts";
import type { SecretPromptCallback } from "../../../tools/secrets.ts";
import { createTodoManager } from "../../../tools/mod.ts";
import { createImageToolExecutor } from "../../../tools/image/mod.ts";
import { createTidepoolToolExecutor } from "../../../tools/tidepool/mod.ts";
import { createPlanManager, createPlanToolExecutor } from "../../../agent/plan/plan.ts";
import { mapToolPrefixClassifications } from "../../../agent/orchestrator/orchestrator_types.ts";
import type { createWorkspace } from "../../../exec/workspace.ts";
import type { createPathClassifier } from "../../../core/security/path_classification.ts";
import type { createAutoLaunchBrowserExecutor } from "../../../tools/browser/mod.ts";
import type { RegisteredChannel } from "../../tools/session/session_tools.ts";
import { createSessionToolExecutor } from "../../tools/session/session_tools.ts";
import type { McpBroadcastRefs } from "../infra/mcp.ts";
import type { wireMcpServers } from "../infra/mcp.ts";
import type { createToolExecutor } from "../../tools/agent_tools.ts";
import type { buildWebTools } from "../factory/web_tools.ts";
import { buildWebTools as buildWebToolsFn } from "../factory/web_tools.ts";
import { createOrchestratorFactory } from "../factory/orchestrator_factory.ts";
import {
  createCliSecretPrompt,
} from "../infra/subsystems.ts";
import type { BootstrapResult } from "../bootstrap.ts";
import type { CoreInfraResult } from "../infra/core_infra.ts";
import {
  initializeLlmProviders,
} from "../infra/storage.ts";
import {
  initializeMainWorkspace,
  buildMainPathClassifier,
  initializeMemorySystem,
} from "../infra/workspace_init.ts";
import {
  initializeBrowserExecutor,
} from "../services/browser_init.ts";
import type { MainSessionState } from "./tool_executor.ts";
import { assembleMainToolExecutor } from "./tool_executor.ts";
import {
  buildIntegrationExecutors,
} from "../services/integration_init.ts";

/** Mutable ref to tidepool tools, set after host starts. */
export type TidepoolToolsRef = {
  value: import("../../../tools/tidepool/mod.ts").TidePoolTools | undefined;
};

/** Result of tool infrastructure initialization. */
export interface ToolInfraResult {
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
  readonly keychain: ReturnType<typeof import("../../../core/secrets/keychain/keychain.ts").createKeychain>;
  readonly mcpBroadcastRefs: McpBroadcastRefs;
  readonly mcpWiring: ReturnType<typeof wireMcpServers> | null;
  readonly toolExecutor: ReturnType<typeof createToolExecutor>;
  readonly skillsPrompt: string;
  readonly triggersPrompt: string;
  readonly mainKeychain: ReturnType<typeof import("../../../core/secrets/keychain/keychain.ts").createKeychain>;
  readonly domainClassifier: ReturnType<
    typeof buildWebTools
  >["domainClassifier"];
  readonly toolFloorRegistry: CoreInfraResult["toolFloorRegistry"];
  readonly tidepoolToolsRef: TidepoolToolsRef;
}

/** Create the main session state and core session-level executors. */
export function initializeMainSessionState(): {
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
export function buildMediaExecutors(
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
export function buildSessionChannelExecutors(
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
export async function buildSessionScopedExecutors(
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

/** Build LLM, workspace, and path classifier foundation. */
export async function buildLlmAndWorkspaceFoundation(
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
export async function initializeBaseToolDeps(
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
    ...buildWebToolsFn(bootstrap.config),
    state,
    cliSecretPrompt,
    toolClassifications: mapToolPrefixClassifications(bootstrap.config),
  };
}

/** Combine all executor outputs into the composite tool executor. */
export function buildCompositeToolExecutor(
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
export function assembleToolInfraResult(
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
export async function initializeToolInfrastructure(
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
