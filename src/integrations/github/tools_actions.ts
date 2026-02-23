/**
 * GitHub Actions tool handlers — workflow runs, trigger.
 *
 * Each handler validates inputs, calls the GitHubClient, and
 * formats the response as a JSON string for the agent.
 *
 * @module
 */

import type { GitHubClient } from "./client.ts";
import { validateRepoInput, formatGitHubError } from "./tools_shared.ts";

// ─── List Workflow Runs ──────────────────────────────────────────────────────

/** Handle the github_actions_runs tool invocation. */
export async function executeActionsRuns(
  client: GitHubClient,
  input: Record<string, unknown>,
): Promise<string> {
  const repoResult = validateRepoInput(input, "github_actions_runs");
  if (typeof repoResult === "string") return repoResult;

  const workflow = typeof input.workflow === "string" ? input.workflow : undefined;
  const branch = typeof input.branch === "string" ? input.branch : undefined;
  const perPage = typeof input.per_page === "number" ? input.per_page : undefined;
  const result = await client.listWorkflowRuns(repoResult.owner, repoResult.name, { workflow, branch, perPage });
  if (!result.ok) return formatGitHubError(result.error);
  return JSON.stringify({
    runs: result.value.map((r) => ({
      id: r.id,
      name: r.name,
      status: r.status,
      conclusion: r.conclusion,
      branch: r.headBranch,
      url: r.htmlUrl,
      _classification: r.classification,
    })),
  });
}

// ─── Trigger Workflow ────────────────────────────────────────────────────────

/** Handle the github_actions_trigger tool invocation. */
export async function executeActionsTrigger(
  client: GitHubClient,
  input: Record<string, unknown>,
): Promise<string> {
  const repoResult = validateRepoInput(input, "github_actions_trigger");
  if (typeof repoResult === "string") return repoResult;

  const workflow = input.workflow;
  if (typeof workflow !== "string" || workflow.length === 0) {
    return "Error: github_actions_trigger requires a 'workflow' argument.";
  }
  const ref = input.ref;
  if (typeof ref !== "string" || ref.length === 0) {
    return "Error: github_actions_trigger requires a 'ref' argument.";
  }
  const inputs = (input.inputs && typeof input.inputs === "object" && !Array.isArray(input.inputs))
    ? input.inputs as Readonly<Record<string, string>>
    : undefined;

  const result = await client.triggerWorkflow(repoResult.owner, repoResult.name, workflow, ref, inputs);
  if (!result.ok) return formatGitHubError(result.error);
  return JSON.stringify({
    triggered: result.value.triggered,
    _classification: result.value.classification,
  });
}
