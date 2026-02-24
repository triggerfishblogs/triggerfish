/**
 * Main session tool executor assembly.
 *
 * Combines all individual tool executors into the composite executor
 * used by the main daemon session, including auxiliary LLM-powered
 * executors and dynamic tool/prompt getters.
 *
 * @module
 */

import type { createSession } from "../../../core/types/session.ts";
import type { createProviderRegistry } from "../../../agent/llm.ts";
import type { createSqliteStorage } from "../../../core/storage/sqlite.ts";
import type {
  SecretPromptCallback,
  CredentialPromptCallback,
} from "../../../tools/secrets.ts";
import type { createExecTools } from "../../../exec/tools.ts";
import type { createPersistentCronManager } from "../../../scheduler/cron/cron.ts";
import type { createTodoManager } from "../../../tools/mod.ts";
import {
  createHealthcheckToolExecutor,
  createLlmTaskToolExecutor,
  createReleaseNotesToolExecutor,
  createSummarizeToolExecutor,
} from "../../../tools/mod.ts";
import { fetchChangelogRange } from "../../../cli/daemon/updater/changelog.ts";
import { VERSION } from "../../../cli/version.ts";
import type { createAutoLaunchBrowserExecutor } from "../../../tools/browser/mod.ts";
import type { createTidepoolToolExecutor } from "../../../tools/tidepool/mod.ts";
import { TIDEPOOL_SYSTEM_PROMPT } from "../../../tools/tidepool/mod.ts";
import type { createImageToolExecutor } from "../../../tools/image/mod.ts";
import type { createExploreToolExecutor } from "../../../tools/explore/mod.ts";
import type { createSessionToolExecutor } from "../../tools/session/session_tools.ts";
import type { createGitHubToolExecutor } from "../../../integrations/github/mod.ts";
import type { createCalDavToolExecutor } from "../../../integrations/caldav/mod.ts";
import type { createClaudeToolExecutor } from "../../../exec/claude.ts";
import type { createSecretToolExecutor } from "../../../tools/secrets.ts";
import type { createTriggerToolExecutor } from "../../tools/trigger/trigger_tools.ts";
import type { createSkillToolExecutor } from "../../../tools/skills/mod.ts";
import type { SkillContextTracker } from "../../../tools/skills/mod.ts";
import type { createPlanToolExecutor } from "../../../agent/plan/plan.ts";
import type { createMemoryToolExecutor } from "../../../tools/memory/mod.ts";
import type { buildWebTools } from "../factory/web_tools.ts";
import type { buildSubagentFactory } from "../factory/subagent.ts";
import type { buildObsidianExecutor, discoverSkills } from "../infra/subsystems.ts";
import { buildGoogleExecutor } from "../factory/google_executor.ts";
import { createToolExecutor, TOOL_GROUPS } from "../../tools/agent_tools.ts";
import type { wireMcpServers } from "../infra/mcp.ts";

/** Mutable state bag for the main daemon session. */
export interface MainSessionState {
  session: ReturnType<typeof createSession>;
  activeSecretPrompt: SecretPromptCallback;
  activeCredentialPrompt: CredentialPromptCallback;
}

/** Build LLM-powered auxiliary executors (task, summarize, healthcheck, release notes). */
export function buildAuxiliaryExecutors(
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
    releaseNotesExecutor: createReleaseNotesToolExecutor(
      fetchChangelogRange,
      VERSION,
    ),
  };
}

/** Assemble the composite tool executor for the main session. */
export function assembleMainToolExecutor(
  deps: {
    readonly execTools: ReturnType<typeof createExecTools>;
    readonly cronManager: Awaited<
      ReturnType<typeof createPersistentCronManager>
    >;
    readonly todoManager: ReturnType<typeof createTodoManager>;
    readonly searchProvider: ReturnType<typeof buildWebTools>["searchProvider"];
    readonly webFetcher: ReturnType<typeof buildWebTools>["webFetcher"];
    readonly memoryExecutor: ReturnType<typeof createMemoryToolExecutor>;
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
    readonly caldavExecutor?: ReturnType<typeof createCalDavToolExecutor>;
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
    readonly skillContextTracker?: SkillContextTracker;
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
export function buildExtraToolsGetter(
  mcpWiring: ReturnType<typeof wireMcpServers> | null,
  isTidepoolCallRef: { value: boolean },
  tidepoolToolsRef: {
    value: import("../../../tools/tidepool/mod.ts").TidePoolTools | undefined;
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
export function buildExtraSystemPromptGetter(
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
