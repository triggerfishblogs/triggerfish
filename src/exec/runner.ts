/**
 * Execution runner with command denylist and audit history.
 *
 * Wraps command execution with security checks (denylist matching)
 * and full audit logging of all executions.
 *
 * @module
 */

import type { Result } from "../core/types/classification.ts";
import type { Workspace } from "./workspace.ts";
import type { RunResult } from "./tools.ts";
import { createExecTools } from "./tools.ts";

/** A logged execution history entry. */
export interface ExecHistoryEntry {
  /** The command that was executed (or denied). */
  readonly command: string;
  /** Timestamp of the execution attempt. */
  readonly timestamp: Date;
  /** Whether the command was allowed to execute. */
  readonly allowed: boolean;
  /** Exit code if executed, null if denied. */
  readonly exitCode: number | null;
  /** Execution duration in milliseconds, null if denied. */
  readonly duration: number | null;
}

/** Options for creating an exec runner. */
export interface ExecRunnerOptions {
  /** Commands or patterns to block. A command is blocked if it contains any deny entry. */
  readonly denyList?: readonly string[];
}

/** An execution runner with denylist enforcement and history. */
export interface ExecRunner {
  /** Execute a shell command, subject to denylist checks. */
  executeCommand(command: string): Promise<Result<RunResult, string>>;
  /** Retrieve the full execution history. */
  getHistory(): Promise<readonly ExecHistoryEntry[]>;
}

/**
 * Check whether a command matches any entry in the denylist.
 *
 * A command is denied if it contains any denylist entry as a substring.
 */
function isDenied(command: string, denyList: readonly string[]): boolean {
  return denyList.some((denied) => command.includes(denied));
}

/**
 * Create an execution runner bound to a workspace.
 *
 * The runner enforces a command denylist and logs all execution attempts
 * (both allowed and denied) to an in-memory history.
 */
export function createExecRunner(
  workspace: Workspace,
  options?: ExecRunnerOptions,
): ExecRunner {
  const denyList = options?.denyList ?? [];
  const history: ExecHistoryEntry[] = [];
  const tools = createExecTools(workspace);

  return {
    async executeCommand(command: string): Promise<Result<RunResult, string>> {
      if (isDenied(command, denyList)) {
        history.push({
          command,
          timestamp: new Date(),
          allowed: false,
          exitCode: null,
          duration: null,
        });
        return { ok: false, error: `Command denied by policy: "${command}"` };
      }

      const result = await tools.runCommand(command);

      history.push({
        command,
        timestamp: new Date(),
        allowed: true,
        exitCode: result.ok ? result.value.exitCode : null,
        duration: result.ok ? result.value.duration : null,
      });

      return result;
    },

    // deno-lint-ignore require-await
    async getHistory(): Promise<readonly ExecHistoryEntry[]> {
      return [...history];
    },
  };
}
