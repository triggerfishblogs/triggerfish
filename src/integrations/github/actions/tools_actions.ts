/**
 * GitHub Actions tool handlers — workflow runs, trigger, cancel.
 *
 * Each handler validates inputs, calls the GitHubClient, and
 * formats the response as a JSON string for the agent.
 *
 * @module
 */

import type { GitHubClient } from "../client.ts";
import { validateRepoInput, formatGitHubError } from "../tools_shared.ts";

// ─── List Workflow Runs ──────────────────────────────────────────────────────

/** Handle the github_list_runs tool invocation. */
export async function executeListRuns(
  client: GitHubClient,
  input: Record<string, unknown>,
): Promise<string> {
  const repoResult = validateRepoInput(input, "github_list_runs");
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

/** Handle the github_trigger_workflow tool invocation. */
export async function executeTriggerWorkflow(
  client: GitHubClient,
  input: Record<string, unknown>,
): Promise<string> {
  const repoResult = validateRepoInput(input, "github_trigger_workflow");
  if (typeof repoResult === "string") return repoResult;

  const workflow = input.workflow;
  if (typeof workflow !== "string" || workflow.length === 0) {
    return "Error: github_trigger_workflow requires a 'workflow' argument.";
  }
  const ref = input.ref;
  if (typeof ref !== "string" || ref.length === 0) {
    return "Error: github_trigger_workflow requires a 'ref' argument.";
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

// ─── Cancel Workflow Run ──────────────────────────────────────────────────────

/** Handle the github_cancel_run tool invocation. */
export async function executeCancelRun(
  client: GitHubClient,
  input: Record<string, unknown>,
): Promise<string> {
  const repoResult = validateRepoInput(input, "github_cancel_run");
  if (typeof repoResult === "string") return repoResult;

  const runId = input.run_id;
  if (typeof runId !== "number" || !Number.isInteger(runId)) {
    return "Error: github_cancel_run requires a numeric 'run_id' argument.";
  }

  const result = await client.cancelRun(repoResult.owner, repoResult.name, runId);
  if (!result.ok) return formatGitHubError(result.error);
  return JSON.stringify({
    cancelled: result.value.cancelled,
    _classification: result.value.classification,
  });
}
