/**
 * Subagent factory builder.
 *
 * Wraps an OrchestratorFactory to spawn isolated agents that process
 * a task prompt and return the agent's text response.
 * @module
 */

import type { OrchestratorFactory } from "../../../scheduler/service_types.ts";

/** Options for building a subagent factory. */
export interface SubagentFactoryOptions {
  /** Maximum agent loop iterations per subagent. Defaults to global MAX_TOOL_ITERATIONS. */
  readonly maxIterations?: number;
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
