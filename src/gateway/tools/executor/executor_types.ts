/**
 * Type definitions and options for tool executor dispatch.
 *
 * @module
 */

import { createExecTools } from "../../../exec/tools.ts";
import type { FilesystemSandbox } from "../../../exec/sandbox/mod.ts";
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
  /**
   * Sandboxed Deno subprocess for filesystem operations.
   * When provided, read/write/list/search/edit are routed through the
   * subprocess (OS-level permission enforcement). When absent, handlers
   * fall back to direct Deno API calls (backward compat for tests).
   */
  readonly filesystemSandbox?: FilesystemSandbox;
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
  readonly notionExecutor?: SubsystemExecutor;
  readonly obsidianExecutor?: SubsystemExecutor;
  readonly llmTaskExecutor?: SubsystemExecutor;
  readonly summarizeExecutor?: SubsystemExecutor;
  readonly healthcheckExecutor?: SubsystemExecutor;
  readonly mcpExecutor?: SubsystemExecutor;
  readonly claudeExecutor?: SubsystemExecutor;
  readonly subagentFactory?: (
    task: string,
    tools?: string,
    spawnOpts?: { readonly maxIterations?: number },
  ) => Promise<string>;
  readonly secretExecutor?: SubsystemExecutor;
  readonly triggerExecutor?: SubsystemExecutor;
  readonly triggerManageExecutor?: SubsystemExecutor;
  readonly skillExecutor?: SubsystemExecutor;
  readonly releaseNotesExecutor?: SubsystemExecutor;
  /** Executor for `simulate_tool_call` — dry-run security pipeline simulation. */
  readonly simulateExecutor?: SubsystemExecutor;
  /**
   * Skill context tracker for the session. When provided, web_fetch domain
   * restrictions are enforced per the active skill's networkDomains declaration.
   */
  readonly skillContextTracker?: SkillContextTracker;
}
