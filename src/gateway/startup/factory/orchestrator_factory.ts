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
import {
  createSession,
  OWNER_MEMORY_AGENT_ID,
  updateTaint,
} from "../../../core/types/session.ts";
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
import {
  createGatedKeychain,
  createSecretAccessGate,
  createSecretClassifier,
} from "../../../core/secrets/classification/mod.ts";
import type { SecretClassifier } from "../../../core/secrets/classification/mod.ts";
import {
  createDefaultSecretAccessRules,
  evaluateSecretAccessPolicy,
} from "../../../core/policy/hooks/secret_access_hook.ts";
import type { SecretAccessPolicyRule } from "../../../core/policy/hooks/secret_access_hook.ts";
import type { ClassificationMapping } from "../../../core/secrets/classification/secret_classifier.ts";
import { TRIGGER_SESSION_SYSTEM_PROMPT } from "../../tools/trigger/trigger_tools.ts";
import {
  buildWorkspacePrompt,
  resolveWorkspacePathForTaint,
} from "../tools/tool_executor.ts";
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
import {
  filterProfileByAvailability,
  TOOL_PROFILES,
} from "../../tools/defs/tool_profiles.ts";
import { TOOL_BEHAVIOR_PROMPT } from "../../../agent/orchestrator/tool_behavior_prompt.ts";
import type { ServiceAvailability } from "../../tools/defs/tool_profiles.ts";
import { detectServiceAvailability } from "../tools/tool_infra.ts";
import { buildWebTools } from "./web_tools.ts";
import type { FactoryInfra } from "../tools/scheduler_tool_assembly.ts";
import {
  assembleSchedulerToolExecutor,
  buildSchedulerGitHubExecutor,
  buildSchedulerPathClassifier,
  buildSchedulerSkillLoader,
} from "../tools/scheduler_tool_assembly.ts";
import { createSkillContextTracker } from "../../../tools/skills/mod.ts";
import { createLogger } from "../../../core/logger/logger.ts";

const log = createLogger("orchestrator-factory");

/** Symlink SPINE.md into a workspace directory. */
async function symlinkSpineToWorkspace(
  spinePath: string,
  workspacePath: string,
): Promise<void> {
  try {
    const workspaceSpine = join(workspacePath, "SPINE.md");
    try {
      await Deno.remove(workspaceSpine);
    } catch (err: unknown) {
      log.debug("Workspace SPINE.md symlink not present for removal", {
        operation: "symlinkSpineToWorkspace",
        workspacePath,
        err,
      });
    }
    await Deno.symlink(spinePath, workspaceSpine);
  } catch (err: unknown) {
    log.debug("SPINE.md symlink to workspace skipped", {
      operation: "symlinkSpineToWorkspace",
      spinePath,
      workspacePath,
      err,
    });
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
  } catch (err: unknown) {
    log.warn("Skill discovery failed during orchestrator creation", {
      operation: "discoverSkillsOnce",
      err,
    });
  }
}

/** Build a SecretClassifier from YAML config. */
function buildSecretClassifier(
  config: TriggerFishConfig,
): SecretClassifier {
  const classificationConfig = config.secrets?.classification;
  const mappings: ClassificationMapping[] =
    (classificationConfig?.mappings ?? []).map((m) => ({
      path: m.path,
      level: m.level as ClassificationLevel,
    }));
  const defaultLevel =
    (classificationConfig?.default_level as ClassificationLevel) ?? "INTERNAL";
  return createSecretClassifier({ mappings, defaultLevel });
}

/** Initialize shared factory infrastructure from config. */
function initializeFactoryInfra(
  config: TriggerFishConfig,
  baseDir: string,
): FactoryInfra & {
  readonly hookRunner: ReturnType<typeof createHookRunner>;
  readonly spinePath: string;
  readonly secretClassifier: SecretClassifier;
  readonly secretAccessRules: readonly SecretAccessPolicyRule[];
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

  const secretClassifier = buildSecretClassifier(config);
  const secretAccessRules = createDefaultSecretAccessRules();

  return {
    registry,
    hookRunner: createHookRunner(engine),
    spinePath: join(baseDir, "SPINE.md"),
    searchProvider,
    webFetcher,
    domainClassifier,
    keychain: createKeychain(),
    secretClassifier,
    secretAccessRules,
    ...(() => {
      const { all, integrations } = mapToolPrefixClassifications(config);
      return {
        toolClassifications: all,
        integrationClassifications: integrations,
      };
    })(),
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
  serviceAvailability?: ServiceAvailability,
): OrchestratorFactory {
  const infra = initializeFactoryInfra(config, baseDir);
  const skillState = { discovered: false, prompt: "" };
  let cachedAvailability: ServiceAvailability | undefined = serviceAvailability;

  return {
    async create(channelId: string, options?: OrchestratorCreateOptions) {
      await discoverSkillsOnce(infra.skillLoader, skillState);
      if (!cachedAvailability) {
        cachedAvailability = await detectServiceAvailability(
          config,
          infra.keychain,
        );
      }

      const isTrigger = options?.isTrigger ?? false;
      const triggerCeiling = options?.ceiling ?? null;
      const agentId = `scheduler-${channelId}-${Date.now()}`;

      const workspace = options?.workspace ?? await createWorkspace({
        agentId,
        basePath: join(baseDir, "workspaces"),
      });
      if (!options?.workspace) {
        await symlinkSpineToWorkspace(infra.spinePath, workspace.path);
      }

      let session = createSession({
        userId: "owner" as UserId,
        channelId: channelId as ChannelId,
      });

      const secretAccessGate = createSecretAccessGate({
        classifier: infra.secretClassifier,
        hookDispatcher: (input) =>
          Promise.resolve(
            evaluateSecretAccessPolicy(
              input,
              infra.secretAccessRules,
              isTrigger,
            ),
          ),
      });

      const gatedKeychain = createGatedKeychain({
        inner: infra.keychain,
        gate: secretAccessGate,
        provider: "keychain",
        getSessionTaint: () => session.taint,
        getIsBackground: () => isTrigger,
        onEscalate: (level) => {
          session = updateTaint(
            session,
            level,
            `Secret access required taint escalation to ${level}`,
          );
        },
      });

      log.info("Secret access gate wired for session", {
        operation: "createOrchestratorFactory",
        channelId,
        isTrigger,
        agentId,
      });

      const githubExecutor = await buildSchedulerGitHubExecutor({
        keychain: gatedKeychain,
        config,
        sessionTaint: session.taint,
        sourceSessionId: session.id,
        workspacePath: workspace.path,
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
        getSessionTaint: () => session.taint,
        memoryAgentId: isTrigger ? OWNER_MEMORY_AGENT_ID : undefined,
      });

      const baseProfileName = isTrigger ? "triggerSession" : "cronJob";
      const toolProfile = filterProfileByAvailability(
        TOOL_PROFILES[baseProfileName],
        cachedAvailability,
      );

      const workspacePaths = {
        publicPath: workspace.publicPath,
        internalPath: workspace.internalPath,
        confidentialPath: workspace.confidentialPath,
        restrictedPath: workspace.restrictedPath,
      };

      const orchestrator = createOrchestrator({
        hookRunner: infra.hookRunner,
        providerRegistry: infra.registry,
        spinePath: infra.spinePath,
        maxIterations: options?.maxIterations,
        maxToolResponseChars: isTrigger ? 8_000 : undefined,
        tools: resolveToolsForProfile(toolProfile),
        toolExecutor,
        systemPromptSections: [
          TOOL_BEHAVIOR_PROMPT,
          ...resolvePromptsForProfile(toolProfile),
          skillState.prompt,
          ...(isTrigger ? [TRIGGER_SESSION_SYSTEM_PROMPT] : []),
        ],
        getExtraSystemPromptSections: () => [
          buildWorkspacePrompt(session.taint, workspacePaths),
        ],
        visionProvider: infra.visionProvider,
        toolClassifications: infra.toolClassifications,
        integrationClassifications: infra.integrationClassifications,
        getSessionTaint: () => session.taint,
        escalateTaint: (level: ClassificationLevel, reason: string) => {
          session = updateTaint(session, level, reason);
        },
        pathClassifier: buildSchedulerPathClassifier(
          fsPathMap,
          fsDefault,
          workspace,
          {
            resolveCwd: () =>
              resolveWorkspacePathForTaint(session.taint, workspacePaths),
          },
        ),
        getWorkspacePath: () =>
          resolveWorkspacePathForTaint(session.taint, workspacePaths),
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

      return { orchestrator, session, toolExecutor };
    },
  };
}
