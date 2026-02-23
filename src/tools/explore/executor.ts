/**
 * Explore tool executor — creates the tool handler for the explore tool.
 *
 * Orchestrates sub-agent spawning, result assembly, and summary generation.
 *
 * @module
 */

import type { ExploreDepth, ExploreResult } from "./tools_defs.ts";
import type { AgentTask } from "./prompts.ts";
import { buildAgentTasks } from "./prompts.ts";
import { assembleResult, buildTemplateSummary } from "./assembly.ts";

/** Parse and validate explore tool input parameters. */
function parseExploreInput(input: Record<string, unknown>): {
  path: string;
  depth: ExploreDepth;
  focus?: string;
} | null {
  const path = input.path;
  if (typeof path !== "string" || path.length === 0) return null;
  const focus = typeof input.focus === "string" && input.focus.length > 0
    ? input.focus
    : undefined;
  const rawDepth = typeof input.depth === "string" ? input.depth : "standard";
  const depth: ExploreDepth = rawDepth === "shallow" || rawDepth === "deep"
    ? rawDepth
    : "standard";
  return { path, depth, focus };
}

/** Spawn all agent tasks concurrently and collect results into a map. */
async function spawnAgentTasks(
  tasks: readonly AgentTask[],
  spawnSubagent: (task: string, tools?: string) => Promise<string>,
): Promise<Map<string, string>> {
  const results = await Promise.all(
    tasks.map(async (task) => {
      try {
        return { name: task.name, response: await spawnSubagent(task.prompt) };
      } catch (err) {
        return {
          name: task.name,
          response: `Error: ${
            err instanceof Error ? err.message : String(err)
          }`,
        };
      }
    }),
  );
  const resultMap = new Map<string, string>();
  for (const r of results) resultMap.set(r.name, r.response);
  return resultMap;
}

/** Build an LLM summary prompt from partial explore results. */
function buildSummaryPrompt(
  partial: Omit<ExploreResult, "summary">,
): string {
  const keyFiles = partial.key_files.map((f) => `${f.path} (${f.role})`)
    .join(", ");
  const patterns = partial.patterns.map((p) => `${p.name}: ${p.description}`)
    .join("; ");
  const focus = partial.focus_findings
    ? `Focus findings: ${partial.focus_findings.slice(0, 1000)}`
    : "";
  return `Summarize these codebase exploration findings in 2-3 concise sentences. Focus on the most important structural and architectural observations:\n\nTree: ${
    partial.tree.slice(0, 2000)
  }\n\nKey files: ${keyFiles}\n\nPatterns: ${patterns}\n\n${focus}`;
}

/** Generate a summary using LLM or template fallback. */
async function generateExploreSummary(
  partial: Omit<ExploreResult, "summary">,
  llmTask?: (prompt: string) => Promise<string>,
): Promise<string> {
  if (!llmTask) return buildTemplateSummary(partial);
  try {
    return await llmTask(buildSummaryPrompt(partial));
  } catch {
    return buildTemplateSummary(partial);
  }
}

/**
 * Create an explore tool executor.
 *
 * @param spawnSubagent - Function to spawn a sub-agent with a task prompt
 * @param llmTask - Optional function for LLM-based summary generation
 * @returns Tool executor that handles `explore` tool calls
 */
export function createExploreToolExecutor(
  spawnSubagent: (task: string, tools?: string) => Promise<string>,
  llmTask?: (prompt: string) => Promise<string>,
): (name: string, input: Record<string, unknown>) => Promise<string | null> {
  return async (
    name: string,
    input: Record<string, unknown>,
  ): Promise<string | null> => {
    if (name !== "explore") return null;

    const parsed = parseExploreInput(input);
    if (!parsed) {
      return "Error: explore requires a non-empty 'path' argument (string).";
    }

    const agentTasks = buildAgentTasks(parsed.path, parsed.depth, parsed.focus);
    const resultMap = await spawnAgentTasks(agentTasks, spawnSubagent);
    const partial = assembleResult(parsed.path, parsed.depth, resultMap);
    const summary = await generateExploreSummary(partial, llmTask);
    return JSON.stringify({ ...partial, summary } as ExploreResult);
  };
}
