/**
 * Agent execution environment module.
 *
 * Provides workspace management, execution tools, and a secure
 * command runner for the agent's code development workflow.
 *
 * @module
 */

export { createWorkspace } from "./workspace.ts";
export type {
  ClassifiedPathResult,
  Workspace,
  WorkspaceOptions,
} from "./workspace.ts";

export { createExecTools } from "./tools.ts";
export type {
  ExecTools,
  ExecToolsOptions,
  FileEntry,
  RunResult,
  WriteResult,
} from "./tools.ts";

export { createExecRunner } from "./runner.ts";
export type {
  ExecHistoryEntry,
  ExecRunner,
  ExecRunnerOptions,
} from "./runner.ts";
