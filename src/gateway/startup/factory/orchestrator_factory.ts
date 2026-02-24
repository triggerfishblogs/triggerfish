/**
 * Orchestrator factory for scheduler, trigger, and subagent sessions.
 *
 * Creates a fresh workspace, session, and orchestrator per call,
 * capturing shared infrastructure (provider registry, policy engine,
 * hook runner, tool definitions) for execution isolation.
 * @module
 */

import { join } from "@std/path";
import type { TriggerFishConfig } from "../../../core/config.ts";
import type { ClassificationLevel } from "../../../core/types/classification.ts";
import { createSession, updateTaint } from "../../../core/types/session.ts";
import type { ChannelId, UserId } from "../../../core/types/session.ts";
import { createProviderRegistry } from "../../../agent/llm.ts";
import {
  loadProvidersFromConfig,
  resolveVisionProvider,
} from "../../../agent/providers/config.ts";
import type { ModelsConfig } from "../../../agent/providers/config.ts";
import {
  createOrchestrator,
} from "../../../agent/orchestrator/orchestrator.ts";
import {
  mapToolPrefixClassifications,
} from "../../../agent/orchestrator/orchestrator_types.ts";
import { createPolicyEngine } from "../../../core/policy/engine.ts";
import {
  createDefaultRules,
  createHookRunner,
} from "../../../core/policy/hooks/hooks.ts";
import { createWorkspace } from "../../../exec/workspace.ts";
import type { ToolFloorRegistry } from "../../../core/security/tool_floors.ts";
import { createKeychain } from "../../../core/secrets/keychain/keychain.ts";
import { TRIGGER_SESSION_SYSTEM_PROMPT } from "../../tools/trigger/trigger_tools.ts";
import type { EnhancedSessionManager } from "../../sessions.ts";
import type { CronManager } from "../../../scheduler/cron/parser.ts";
import type { StorageProvider } from "../../../core/storage/provider.ts";
import type {
  OrchestratorCreateOptions,
  OrchestratorFactory,
} from "../../../scheduler/service_types.ts";
import { buildSkillsSystemPrompt } from "../../../tools/skills/prompts.ts";
import {
  resolvePromptsForProfile,
  resolveToolsForProfile,
} from "../../tools/agent_tools.ts";
import { buildWebTools } from "./web_tools.ts";
import type { FactoryInfra } from "../tools/scheduler_tool_assembly.ts";
import {
  assembleSchedulerToolExecutor,
  buildSchedulerGitHubExecutor,
  buildSchedulerPathClassifier,
  buildSchedulerSkillLoader,
} from "../tools/scheduler_tool_assembly.ts";
import { createSkillContextTracker } from "../../../tools/skills/mod.ts";

/** Symlink SPINE.md into a workspace directory. */
async function symlinkSpineToWorkspace(
  spinePath: string,
  workspacePath: string,
): Promise<void> {
  try {
    const workspaceSpine = join(workspacePath, "SPINE.md");
    try {
      await Deno.remove(workspaceSpine);
    } catch { /* doesn't exist yet */ }
    await Deno.symlink(spinePath, workspaceSpine);
  } catch {
    // SPINE.md may not exist yet — not fatal
  }
}

/** Lazily discover skills and build a system prompt from them. */
async function discoverSkillsOnce(
  loader: ReturnType<typeof buildSchedulerSkillLoader>,
  state: { discovered: boolean; prompt: string },
): Promise<void> {
  if (state.discovered) return;
  state.discovered = true;
  try {
    const skills = await loader.discover();
    state.prompt = buildSkillsSystemPrompt(skills);
  } catch {
    // Non-fatal
  }
}

/** Initialize shared factory infrastructure from config. */
function initializeFactoryInfra(
  config: TriggerFishConfig,
  baseDir: string,
): FactoryInfra & {
  readonly hookRunner: ReturnType<typeof createHookRunner>;
  readonly spinePath: string;
} {
  const registry = createProviderRegistry();
  loadProvidersFromConfig(config.models as ModelsConfig, registry);

  const engine = createPolicyEngine();
  for (const rule of createDefaultRules()) {
    engine.addRule(rule);
  }

  const { searchProvider, webFetcher, domainClassifier } = buildWebTools(
    config,
  );

  return {
    registry,
    hookRunner: createHookRunner(engine),
    spinePath: join(baseDir, "SPINE.md"),
    searchProvider,
    webFetcher,
    domainClassifier,
    keychain: createKeychain(),
    toolClassifications: mapToolPrefixClassifications(config),
    visionProvider: resolveVisionProvider(config.models as ModelsConfig),
    skillLoader: buildSchedulerSkillLoader(
      baseDir,
      import.meta.dirname ?? ".",
    ),
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
  const infra = initializeFactoryInfra(config, baseDir);
  const skillState = { discovered: false, prompt: "" };

  return {
    async create(channelId: string, options?: OrchestratorCreateOptions) {
      await discoverSkillsOnce(infra.skillLoader, skillState);

      const isTrigger = options?.isTrigger ?? false;
      const triggerCeiling = options?.ceiling ?? null;
      const agentId = `scheduler-${channelId}-${Date.now()}`;

      const workspace = await createWorkspace({
        agentId,
        basePath: join(baseDir, "workspaces"),
      });
      await symlinkSpineToWorkspace(infra.spinePath, workspace.path);

      let session = createSession({
        userId: "owner" as UserId,
        channelId: channelId as ChannelId,
      });

      const githubExecutor = await buildSchedulerGitHubExecutor({
        keychain: infra.keychain,
        config,
        sessionTaint: session.taint,
        sourceSessionId: session.id,
      });

      const skillContextTracker = createSkillContextTracker();

      const toolExecutor = assembleSchedulerToolExecutor({
        infra,
        session,
        workspace,
        cronManager,
        storage,
        enhancedSessionManager,
        agentId,
        githubExecutor,
        skillContextTracker,
      });

      const toolProfile = isTrigger ? "triggerSession" : "cronJob";

      const orchestrator = createOrchestrator({
        hookRunner: infra.hookRunner,
        providerRegistry: infra.registry,
        spinePath: infra.spinePath,
        tools: resolveToolsForProfile(toolProfile),
        toolExecutor,
        systemPromptSections: [
          ...resolvePromptsForProfile(toolProfile),
          skillState.prompt,
          ...(isTrigger ? [TRIGGER_SESSION_SYSTEM_PROMPT] : []),
        ],
        visionProvider: infra.visionProvider,
        toolClassifications: infra.toolClassifications,
        getSessionTaint: () => session.taint,
        escalateTaint: (level: ClassificationLevel, reason: string) => {
          session = updateTaint(session, level, reason);
        },
        pathClassifier: buildSchedulerPathClassifier(
          fsPathMap,
          fsDefault,
          workspace,
        ),
        domainClassifier: infra.domainClassifier,
        toolFloorRegistry: schedulerToolFloorRegistry,
        getActiveSkillContext: () => skillContextTracker.getActive(),
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
