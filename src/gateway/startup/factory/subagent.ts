/**
 * Subagent factory builder.
 *
 * Wraps an OrchestratorFactory to spawn isolated agents that process
 * a task prompt and return the agent's text response.
 * @module
 */

import type { Workspace } from "../../../exec/workspace_types.ts";
import type { OrchestratorFactory } from "../../../scheduler/service_types.ts";

/** Options for building a subagent factory. */
export interface SubagentFactoryOptions {
  /** Maximum agent loop iterations per subagent. Defaults to global MAX_TOOL_ITERATIONS. */
  readonly maxIterations?: number;
  /**
   * Parent workspace to reuse for subagent sessions.
   * When provided, the subagent shares the parent's workspace and sandbox
   * boundary instead of creating a fresh isolated workspace.
   */
  readonly workspace?: Workspace;
}

/**
 * Build a subagent factory that uses OrchestratorFactory to spawn isolated agents.
 *
 * Each call creates a fresh orchestrator + session and processes the task prompt,
 * returning the agent's text response.
 */
export function buildSubagentFactory(
  orchFactory: OrchestratorFactory,
  opts?: SubagentFactoryOptions,
): (task: string, tools?: string) => Promise<string> {
  return async (task: string, _tools?: string): Promise<string> => {
    const { orchestrator, session } = await orchFactory.create("subagent", {
      maxIterations: opts?.maxIterations,
      workspace: opts?.workspace,
    });
    const result = await orchestrator.executeAgentTurn({
      session,
      message: task,
      targetClassification: session.taint,
    });
    if (!result.ok) return `Sub-agent error: ${result.error}`;
    return result.value.response;
  };
}
