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
import type { ClassificationLevel } from "../../../core/types/classification.ts";
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
  };
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
  const toolExecutor = buildCompositeToolExecutor(
    bootstrap,
    baseDeps,
    coreInfra,
    sessionExecs,
    integrations,
    workflowRunRegistry,
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
  );
}
