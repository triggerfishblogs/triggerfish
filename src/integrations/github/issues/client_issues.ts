/**
 * GitHub client — issue and comment operations.
 *
 * @module
 */

import type { ClassificationLevel, Result } from "../../../core/types/classification.ts";
import type { GitHubError, GitHubIssue } from "../types.ts";
import type { ApiRequestFn, ClassifyRepoFn, RawIssue } from "../client_http.ts";
import { buildRepoPath, fetchRepoClassification } from "../client_http.ts";

/** Extract label names from raw issue label data. */
function extractIssueLabels(
  labels?: readonly (string | { readonly name?: string })[],
): readonly string[] {
  return (labels ?? []).map((l) => typeof l === "string" ? l : l.name ?? "");
}

/** Map a raw issue to a GitHubIssue domain type. */
function mapRawIssueToGitHubIssue(
  i: RawIssue,
  classification: ClassificationLevel,
): GitHubIssue {
  return {
    number: i.number,
    title: i.title,
    state: i.state,
    author: i.user?.login ?? "unknown",
    body: i.body ?? null,
    htmlUrl: i.html_url,
    createdAt: i.created_at,
    labels: extractIssueLabels(i.labels),
    classification,
  };
}

/** Fetch issues from a GitHub repo. */
export async function fetchRepoIssues(
  apiRequest: ApiRequestFn,
  classifyRepo: ClassifyRepoFn,
  owner: string,
  repo: string,
  opts?: {
    readonly state?: string;
    readonly labels?: string;
    readonly perPage?: number;
  },
): Promise<Result<readonly GitHubIssue[], GitHubError>> {
  const params = new URLSearchParams();
  params.set("state", opts?.state ?? "open");
  if (opts?.labels) params.set("labels", opts.labels);
  params.set("per_page", String(opts?.perPage ?? 20));

  const result = await apiRequest<readonly RawIssue[]>(
    `${buildRepoPath(owner, repo)}/issues?${params.toString()}`,
  );
  if (!result.ok) return result;

  const classification = await fetchRepoClassification(
    apiRequest,
    classifyRepo,
    owner,
    repo,
  );
  const issues = result.value.data.map((i) =>
    mapRawIssueToGitHubIssue(i, classification)
  );
  return { ok: true, value: issues };
}

/** Create an issue on a GitHub repo. */
export async function submitRepoIssue(
  apiRequest: ApiRequestFn,
  classifyRepo: ClassifyRepoFn,
  owner: string,
  repo: string,
  title: string,
  body?: string,
  labels?: readonly string[],
): Promise<Result<GitHubIssue, GitHubError>> {
  const result = await apiRequest<RawIssue>(
    `${buildRepoPath(owner, repo)}/issues`,
    {
      method: "POST",
      body: { title, body: body ?? "", labels: labels ?? [] },
    },
  );
  if (!result.ok) return result;

  const classification = await fetchRepoClassification(
    apiRequest,
    classifyRepo,
    owner,
    repo,
  );
  return {
    ok: true,
    value: mapRawIssueToGitHubIssue(result.value.data, classification),
  };
}

/** Create a comment on a GitHub issue or pull request. */
export async function submitIssueComment(
  apiRequest: ApiRequestFn,
  classifyRepo: ClassifyRepoFn,
  owner: string,
  repo: string,
  issueNumber: number,
  body: string,
): Promise<
  Result<
    {
      readonly id: number;
      readonly htmlUrl: string;
      readonly classification: ClassificationLevel;
    },
    GitHubError
  >
> {
  const result = await apiRequest<{ id: number; html_url: string }>(
    `${buildRepoPath(owner, repo)}/issues/${issueNumber}/comments`,
    { method: "POST", body: { body } },
  );
  if (!result.ok) return result;

  const classification = await fetchRepoClassification(
    apiRequest,
    classifyRepo,
    owner,
    repo,
  );
  return {
    ok: true,
    value: {
      id: result.value.data.id,
      htmlUrl: result.value.data.html_url,
      classification,
    },
  };
}
