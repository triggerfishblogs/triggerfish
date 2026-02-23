/**
 * Integration executor initialization — MCP, GitHub, Obsidian, triggers, skills.
 *
 * Builds external service executors, agent-local tool executors, and
 * assembles them into the integration set used by tool infrastructure.
 *
 * @module
 */

import type { ClassificationLevel } from "../../../core/types/classification.ts";
import { updateTaint } from "../../../core/types/session.ts";
import type { TriggerFishConfig } from "../../../core/config.ts";
import { createProviderRegistry } from "../../../agent/llm.ts";
import type { createHookRunner } from "../../../core/policy/hooks/hooks.ts";
import {
  createClaudeSessionManager,
  createClaudeToolExecutor,
} from "../../../exec/claude.ts";
import { createSecretToolExecutor } from "../../../tools/secrets.ts";
import {
  createSkillContextTracker,
  createSkillToolExecutor,
} from "../../../tools/skills/mod.ts";
import type { SkillContextTracker } from "../../../tools/skills/mod.ts";
import {
  buildSkillsSystemPrompt,
  buildTriggersSystemPrompt,
} from "../../../tools/skills/prompts.ts";
import { createKeychain } from "../../../core/secrets/keychain/keychain.ts";
import type { createWorkspace } from "../../../exec/workspace.ts";
import { createTriggerToolExecutor } from "../../tools/trigger/trigger_tools.ts";
import { createTriggerStore } from "../../../scheduler/triggers/store.ts";
import type { McpBroadcastRefs } from "../infra/mcp.ts";
import { buildSubagentFactory } from "../factory/subagent.ts";
import { createOrchestratorFactory } from "../factory/orchestrator_factory.ts";
import {
  buildObsidianExecutor,
  discoverSkills,
} from "../infra/subsystems.ts";
import type { ObsidianPluginConfig } from "../infra/subsystems.ts";
import type { BootstrapResult } from "../bootstrap.ts";
import type { CoreInfraResult } from "../infra/core_infra.ts";
import type { MainSessionState } from "../tools/tool_executor.ts";
import {
  buildGitHubExecutor,
  buildExploreExecutor,
  initializeMcpServers,
} from "./browser_init.ts";

/** Initialize MCP servers and create broadcast refs. */
export function initializeMcpInfrastructure(
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
export async function buildExternalServiceExecutors(
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
export function buildMainTriggerExecutor(
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
export function buildAgentToolExecutors(
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
  const skillContextTracker = createSkillContextTracker();
  return {
    claudeExecutor,
    mainKeychain,
    secretExecutor,
    triggerExecutor: buildMainTriggerExecutor(triggerStore, state),
    skillExecutor: createSkillToolExecutor({
      skillLoader,
      skillContextTracker,
      getSessionTaint: () => state.session.taint,
    }),
    skillContextTracker,
  };
}

/** Discover skills and build agent-local + skill executors. */
export async function buildSkillAndAgentExecutors(
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
export async function buildIntegrationExecutors(
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
