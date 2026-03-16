/**
 * Tool infrastructure initialization phase.
 *
 * Wires all tool executors: LLM providers, workspace, memory, browser,
 * tidepool, GitHub, Obsidian, MCP, skills, secrets, triggers, and
 * assembles them into the composite tool executor.
 *
 * @module
 */

import { join } from "@std/path";
import { createLogger } from "../../../core/logger/logger.ts";
import type { ClassificationLevel } from "../../../core/types/classification.ts";
import type { TriggerFishConfig } from "../../../core/config.ts";
import { createExecTools } from "../../../exec/tools.ts";
import { createTodoManager } from "../../../tools/mod.ts";
import { mapToolPrefixClassifications } from "../../../agent/orchestrator/orchestrator_types.ts";
import { createFilesystemSandbox } from "../../../exec/sandbox/mod.ts";
import type { BootstrapResult } from "../bootstrap.ts";
import type { CoreInfraResult } from "../infra/core_infra.ts";
import { initializeLlmProviders } from "../infra/storage.ts";
import {
  buildMainPathClassifier,
  initializeMainWorkspace,
} from "../infra/workspace_init.ts";
import { buildIntegrationExecutors } from "../services/integration_init.ts";
import type { WorkspacePaths } from "./tool_executor.ts";
import {
  assembleMainToolExecutor,
  resolveWorkspacePathForTaint,
} from "./tool_executor.ts";
import { buildWebTools as buildWebToolsFn } from "../factory/web_tools.ts";
import { createSimulateToolExecutor } from "../../tools/simulate/mod.ts";
import { createTriggerManageExecutor } from "../../tools/trigger/trigger_manage_executor.ts";
import type { ServiceAvailability } from "../../tools/defs/tool_profiles.ts";
import { buildTeamExecutor } from "../factory/team_executor.ts";
import {
  createWorkflowRunRegistry,
  type WorkflowRunRegistry,
} from "../../../workflow/mod.ts";
import {
  createPluginExecutor,
  createPluginRegistry,
  createPluginScanner,
  createPluginToolExecutor,
  initializePluginExecutor,
  loadPluginsFromDirectory,
  namespaceToolDefinitions,
  resolveEffectiveTrust,
  scanPluginDirectory,
} from "../../../plugin/mod.ts";
import type {
  PluginContext,
  PluginRegistry,
  PluginTrustLevel,
} from "../../../plugin/mod.ts";
import type { createToolExecutor } from "../../tools/agent_tools.ts";

// Re-export types and functions from sub-modules
export type { TidepoolToolsRef, ToolInfraResult } from "./tool_infra_types.ts";
export { detectServiceAvailability } from "./tool_infra_types.ts";
export {
  buildMediaExecutors,
  buildSessionChannelExecutors,
  buildSessionScopedExecutors,
  initializeMainSessionState,
} from "./tool_infra_session.ts";

const pluginLog = createLogger("plugin-init");

/** Build LLM, workspace, and path classifier foundation. */
export async function buildLlmAndWorkspaceFoundation(
  bootstrap: BootstrapResult,
) {
  const { registry, hookRunner } = initializeLlmProviders(
    bootstrap.config,
    bootstrap.log,
  );
  const { spinePath, mainWorkspace } = await initializeMainWorkspace(
    bootstrap.baseDir,
  );
  return { registry, hookRunner, spinePath, mainWorkspace };
}

/** Initialize LLM providers, workspace, and base tool dependencies. */
export async function initializeBaseToolDeps(
  bootstrap: BootstrapResult,
  coreInfra: CoreInfraResult,
) {
  const { loadBumpersPreference } = await import("./tool_infra_types.ts");
  const { initializeMainSessionState } = await import(
    "./tool_infra_session.ts"
  );
  const foundation = await buildLlmAndWorkspaceFoundation(bootstrap);
  const bumpersDefault = await loadBumpersPreference(coreInfra.storage);
  const { state, cliSecretPrompt, cliCredentialPrompt } =
    initializeMainSessionState({ bumpersEnabled: bumpersDefault });
  const workspace = foundation.mainWorkspace;
  const workspacePaths: WorkspacePaths = {
    publicPath: workspace.publicPath,
    internalPath: workspace.internalPath,
    confidentialPath: workspace.confidentialPath,
    restrictedPath: workspace.restrictedPath,
  };
  const resolveTaintCwd = () =>
    resolveWorkspacePathForTaint(state.session.taint, workspacePaths);
  const pathClassifier = buildMainPathClassifier(
    coreInfra.fsPathMap,
    coreInfra.fsDefault,
    workspace,
    { resolveCwd: resolveTaintCwd },
  );
  const execTools = createExecTools(workspace, {
    cwdOverride: resolveTaintCwd,
  });
  const filesystemSandbox = createFilesystemSandbox({
    resolveWorkspacePath: resolveTaintCwd,
  });
  const todoManager = createTodoManager({
    storage: coreInfra.storage,
    agentId: "main-session",
  });
  return {
    ...foundation,
    pathClassifier,
    execTools,
    filesystemSandbox,
    todoManager,
    ...buildWebToolsFn(bootstrap.config),
    state,
    cliSecretPrompt,
    cliCredentialPrompt,
    ...(() => {
      const { all, integrations } = mapToolPrefixClassifications(
        bootstrap.config,
      );
      return {
        toolClassifications: all,
        integrationClassifications: integrations,
      };
    })(),
  };
}

/** Combine all executor outputs into the composite tool executor. */
export function buildCompositeToolExecutor(
  bootstrap: BootstrapResult,
  baseDeps: Awaited<ReturnType<typeof initializeBaseToolDeps>>,
  coreInfra: CoreInfraResult,
  sessionExecs: Awaited<
    ReturnType<
      typeof import("./tool_infra_session.ts").buildSessionScopedExecutors
    >
  >,
  integrations: Awaited<ReturnType<typeof buildIntegrationExecutors>>,
  workflowRunRegistry: WorkflowRunRegistry,
  pluginRegistry?: PluginRegistry,
) {
  const simulateExecutor = createSimulateToolExecutor({
    getSessionTaint: () => baseDeps.state.session.taint,
    isOwner: () => true,
    isTrigger: () => false,
    toolClassifications: baseDeps.toolClassifications,
    integrationClassifications: baseDeps.integrationClassifications,
    pathClassifier: baseDeps.pathClassifier,
    domainClassifier: baseDeps.domainClassifier,
    toolFloorRegistry: coreInfra.toolFloorRegistry,
    getWorkspacePath: () => baseDeps.mainWorkspace.path,
  });
  const sched = bootstrap.config.scheduler?.trigger;
  const triggerManageExecutor = createTriggerManageExecutor({
    triggerMdPath: join(bootstrap.baseDir, "TRIGGER.md"),
    triggerConfig: {
      enabled: (sched?.enabled ?? true) &&
        (sched?.interval_minutes ?? 30) !== 0,
      intervalMinutes: sched?.interval_minutes ?? 30,
      classificationCeiling: (sched?.classification_ceiling ??
        "CONFIDENTIAL") as ClassificationLevel,
    },
    triggerStore: coreInfra.triggerStore,
    memoryStore: sessionExecs.memoryStore,
    agentId: "main-session",
    getSessionTaint: () => baseDeps.state.session.taint,
    getSessionId: () => baseDeps.state.session.id,
  });
  return assembleMainToolExecutor({
    execTools: baseDeps.execTools,
    filesystemSandbox: baseDeps.filesystemSandbox,
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
    caldavExecutor: integrations.caldavExecutor,
    notionExecutor: integrations.notionExecutor,
    obsidianExecutor: integrations.obsidianExecutor,
    registry: baseDeps.registry,
    storage: coreInfra.storage,
    skillLoader: integrations.skillLoader,
    claudeExecutor: integrations.claudeExecutor,
    mcpExecutor: integrations.mcpExecutor,
    subagentFactory: integrations.subagentFactory,
    secretExecutor: integrations.secretExecutor,
    triggerExecutor: integrations.triggerExecutor,
    triggerManageExecutor,
    skillExecutor: integrations.skillExecutor,
    skillContextTracker: integrations.skillContextTracker,
    simulateExecutor,
    teamExecutor: coreInfra.factory
      ? buildTeamExecutor({
        storage: coreInfra.storage,
        orchestratorFactory: coreInfra.factory,
        sessionManager: coreInfra.enhancedSessionManager,
        callerSessionId: baseDeps.state.session.id,
        getCallerTaint: () => baseDeps.state.session.taint,
      })
      : undefined,
    workflowRunRegistry,
    pluginExecutor: pluginRegistry
      ? createPluginExecutor(pluginRegistry)
      : undefined,
    pluginToolExecutor: pluginRegistry
      ? createPluginToolExecutor({
        registry: pluginRegistry,
        getSessionTaint: () => baseDeps.state.session.taint,
        pluginsConfig: (bootstrap.config.plugins ?? {}) as Record<
          string,
          | { enabled?: boolean; trust?: PluginTrustLevel; classification?: string }
          | undefined
        >,
        toolClassifications: baseDeps.toolClassifications,
        integrationClassifications: baseDeps.integrationClassifications,
        scanPlugin: createPluginScanner(),
      })
      : undefined,
  });
}

/** Assemble the final ToolInfraResult from sub-phase outputs. */
export function assembleToolInfraResult(
  baseDeps: Awaited<ReturnType<typeof initializeBaseToolDeps>>,
  coreInfra: CoreInfraResult,
  sessionExecs: Awaited<
    ReturnType<
      typeof import("./tool_infra_session.ts").buildSessionScopedExecutors
    >
  >,
  integrations: Awaited<ReturnType<typeof buildIntegrationExecutors>>,
  toolExecutor: ReturnType<typeof createToolExecutor>,
  serviceAvailability: ServiceAvailability,
  workflowRunRegistry: WorkflowRunRegistry,
  pluginRegistry?: PluginRegistry,
): import("./tool_infra_types.ts").ToolInfraResult {
  return {
    registry: baseDeps.registry,
    hookRunner: baseDeps.hookRunner,
    spinePath: baseDeps.spinePath,
    mainWorkspace: baseDeps.mainWorkspace,
    pathClassifier: baseDeps.pathClassifier,
    visionProvider: sessionExecs.visionProvider,
    state: baseDeps.state,
    cliSecretPrompt: baseDeps.cliSecretPrompt,
    cliCredentialPrompt: baseDeps.cliCredentialPrompt,
    memoryDb: sessionExecs.memoryDb,
    memoryStore: sessionExecs.memoryStore,
    memorySearchProvider: sessionExecs.memorySearchProvider,
    browserHandle: sessionExecs.browserHandle,
    channelAdapters: sessionExecs.channelAdapters,
    toolClassifications: baseDeps.toolClassifications,
    integrationClassifications: baseDeps.integrationClassifications,
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
    skillContextTracker: integrations.skillContextTracker,
    serviceAvailability,
    workflowRunRegistry,
    pluginRegistry: pluginRegistry ?? createPluginRegistry(),
  };
}

/**
 * Initialize dynamically loaded plugins from `~/.triggerfish/plugins/`.
 *
 * Scans the plugins directory, filters by config-enabled plugins,
 * enforces trust levels, creates executors, and registers them.
 */
export async function initializePlugins(
  config: TriggerFishConfig,
  getSessionTaint: () => ClassificationLevel,
  toolClassifications: Map<string, ClassificationLevel>,
  integrationClassifications: Map<string, ClassificationLevel>,
): Promise<PluginRegistry> {
  const registry = createPluginRegistry();
  const homeDir = Deno.env.get("HOME") ?? Deno.env.get("USERPROFILE") ?? "";
  const pluginsDir = `${homeDir}/.triggerfish/plugins`;

  const loadResult = await loadPluginsFromDirectory(pluginsDir);
  if (!loadResult.ok) {
    pluginLog.warn("Plugin directory load failed", {
      operation: "initializePlugins",
      error: loadResult.error,
    });
    return registry;
  }

  const loaded = loadResult.value;
  if (loaded.length === 0) return registry;

  const pluginsConfig = (config.plugins ?? {}) as Record<
    string,
    { enabled?: boolean; trust?: PluginTrustLevel; classification?: string } | undefined
  >;

  for (const plugin of loaded) {
    const name = plugin.exports.manifest.name;
    const pluginCfg = pluginsConfig[name];
    if (!pluginCfg?.enabled) {
      pluginLog.info("Plugin skipped: not enabled in config", {
        operation: "initializePlugins",
        plugin: name,
      });
      continue;
    }

    // Security scan before initialization
    const pluginDir = plugin.sourcePath.replace(/\/mod\.ts$/, "");
    const scanResult = await scanPluginDirectory(pluginDir);
    if (!scanResult.ok) {
      pluginLog.warn("Plugin blocked by security scanner", {
        operation: "initializePlugins",
        plugin: name,
        warnings: scanResult.warnings,
      });
      continue;
    }

    const configTrust: PluginTrustLevel = pluginCfg.trust ?? "sandboxed";
    const effectiveTrust = resolveEffectiveTrust(
      plugin.exports.manifest.trust,
      configTrust,
    );

    const context: PluginContext = {
      pluginName: name,
      getSessionTaint,
      escalateTaint: () => {
        // Taint escalation is handled by the hook runner at the gateway layer.
        // Plugins cannot directly escalate taint — this is a no-op placeholder.
      },
      log: {
        debug: (msg, ctx) =>
          pluginLog.debug(msg, { ...ctx, plugin: name }),
        info: (msg, ctx) =>
          pluginLog.info(msg, { ...ctx, plugin: name }),
        warn: (msg, ctx) =>
          pluginLog.warn(msg, { ...ctx, plugin: name }),
        error: (msg, ctx) =>
          pluginLog.error(msg, { ...ctx, plugin: name }),
      },
      config: (pluginCfg as Record<string, unknown>) ?? {},
    };

    try {
      const executor = await initializePluginExecutor(
        plugin,
        context,
        effectiveTrust,
      );
      const namespacedTools = namespaceToolDefinitions(
        name,
        plugin.exports.toolDefinitions,
      );

      registry.registerPlugin({
        loaded: plugin,
        executor,
        namespacedTools,
      });

      // Inject plugin classifications into the mutable maps
      const classification = plugin.exports.manifest.classification;
      const prefix = `plugin_${name}_`;
      toolClassifications.set(prefix, classification);
      integrationClassifications.set(prefix, classification);
    } catch (err) {
      pluginLog.error("Plugin initialization failed", {
        operation: "initializePlugins",
        plugin: name,
        err,
      });
    }
  }

  return registry;
}

/** Wire all tool infrastructure: LLM providers, executors, integrations. */
export async function initializeToolInfrastructure(
  bootstrap: BootstrapResult,
  coreInfra: CoreInfraResult,
): Promise<import("./tool_infra_types.ts").ToolInfraResult> {
  const { detectServiceAvailability: detect } = await import(
    "./tool_infra_types.ts"
  );
  const { buildSessionScopedExecutors } = await import(
    "./tool_infra_session.ts"
  );
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
  const workflowRunRegistry = createWorkflowRunRegistry();
  const pluginRegistry = await initializePlugins(
    bootstrap.config,
    () => baseDeps.state.session.taint,
    baseDeps.toolClassifications,
    baseDeps.integrationClassifications,
  );
  const toolExecutor = buildCompositeToolExecutor(
    bootstrap,
    baseDeps,
    coreInfra,
    sessionExecs,
    integrations,
    workflowRunRegistry,
    pluginRegistry,
  );
  const serviceAvailability = await detect(
    bootstrap.config,
    integrations.keychain,
  );
  return assembleToolInfraResult(
    baseDeps,
    coreInfra,
    sessionExecs,
    integrations,
    toolExecutor,
    serviceAvailability,
    workflowRunRegistry,
    pluginRegistry,
  );
}
