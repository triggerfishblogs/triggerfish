/**
 * Type definitions and options for tool executor dispatch.
 *
 * @module
 */

import { createExecTools } from "../../../exec/tools.ts";
import type { TodoManager } from "../../../tools/mod.ts";
import type { SearchProvider, WebFetcher } from "../../../tools/web/mod.ts";
import type { LlmProviderRegistry } from "../../../core/types/llm.ts";
import type { CronManager } from "../../../scheduler/cron/parser.ts";
import type { SkillContextTracker } from "../../../tools/skills/mod.ts";

/** Generic executor signature used by optional subsystem executors. */
export type SubsystemExecutor = (
  name: string,
  input: Record<string, unknown>,
) => Promise<string | null>;

/** Options for creating a tool executor. */
export interface ToolExecutorOptions {
  readonly execTools: ReturnType<typeof createExecTools>;
  readonly cronManager?: CronManager;
  readonly todoManager?: TodoManager;
  readonly searchProvider?: SearchProvider;
  readonly webFetcher?: WebFetcher;
  readonly memoryExecutor?: SubsystemExecutor;
  readonly planExecutor?: SubsystemExecutor;
  readonly browserExecutor?: SubsystemExecutor;
  readonly tidepoolExecutor?: SubsystemExecutor;
  readonly providerRegistry?: LlmProviderRegistry;
  readonly sessionExecutor?: SubsystemExecutor;
  readonly imageExecutor?: SubsystemExecutor;
  readonly exploreExecutor?: SubsystemExecutor;
  readonly googleExecutor?: SubsystemExecutor;
  readonly githubExecutor?: SubsystemExecutor;
  readonly caldavExecutor?: SubsystemExecutor;
  readonly obsidianExecutor?: SubsystemExecutor;
  readonly llmTaskExecutor?: SubsystemExecutor;
  readonly summarizeExecutor?: SubsystemExecutor;
  readonly healthcheckExecutor?: SubsystemExecutor;
  readonly mcpExecutor?: SubsystemExecutor;
  readonly claudeExecutor?: SubsystemExecutor;
  readonly subagentFactory?: (task: string, tools?: string) => Promise<string>;
  readonly secretExecutor?: SubsystemExecutor;
  readonly triggerExecutor?: SubsystemExecutor;
  /**
   * Executor for `get_tool_classification` — available in trigger sessions
   * so the agent can look up tool classifications and order its work from
   * lowest to highest classification before calling any integration tools.
   */
  readonly triggerClassificationExecutor?: SubsystemExecutor;
  readonly skillExecutor?: SubsystemExecutor;
  readonly releaseNotesExecutor?: SubsystemExecutor;
  /**
   * Skill context tracker for the session. When provided, web_fetch domain
   * restrictions are enforced per the active skill's networkDomains declaration.
   */
  readonly skillContextTracker?: SkillContextTracker;
}
