/**
 * GitHub client — pull request operations.
 *
 * @module
 */

import type { ClassificationLevel, Result } from "../../../core/types/classification.ts";
import type { GitHubError, GitHubPull, GitHubPullDetail, GitHubPullFile } from "../types.ts";
import type {
  ApiRequestFn,
  ClassifyRepoFn,
  RawPull,
  RawPullDetail,
  RawPullFile,
} from "../client_http.ts";
import { buildRepoPath, fetchRepoClassification } from "../client_http.ts";

/** Map a raw pull request to a GitHubPull domain type. */
function mapRawPullToGitHubPull(
  p: RawPull,
  classification: ClassificationLevel,
): GitHubPull {
  return {
    number: p.number,
    title: p.title,
    state: p.state,
    author: p.user?.login ?? "unknown",
    headRef: p.head.ref,
    baseRef: p.base.ref,
    htmlUrl: p.html_url,
    createdAt: p.created_at,
    classification,
  };
}

/** Map a raw pull detail to a GitHubPullDetail domain type. */
function mapRawPullDetailToGitHubPullDetail(
  p: RawPullDetail,
  classification: ClassificationLevel,
): GitHubPullDetail {
  return {
    number: p.number,
    title: p.title,
    state: p.state,
    author: p.user?.login ?? "unknown",
    body: p.body ?? null,
    headRef: p.head.ref,
    baseRef: p.base.ref,
    htmlUrl: p.html_url,
    createdAt: p.created_at,
    additions: p.additions,
    deletions: p.deletions,
    changedFiles: p.changed_files,
    mergeable: p.mergeable ?? null,
    classification,
  };
}

/** Fetch a single pull request from a GitHub repo. */
export async function fetchRepoPull(
  apiRequest: ApiRequestFn,
  classifyRepo: ClassifyRepoFn,
  owner: string,
  repo: string,
  prNumber: number,
): Promise<Result<GitHubPullDetail, GitHubError>> {
  const result = await apiRequest<RawPullDetail>(
    `${buildRepoPath(owner, repo)}/pulls/${prNumber}`,
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
    value: mapRawPullDetailToGitHubPullDetail(result.value.data, classification),
  };
}

/** Update a pull request on a GitHub repo. */
export async function updateRepoPull(
  apiRequest: ApiRequestFn,
  classifyRepo: ClassifyRepoFn,
  owner: string,
  repo: string,
  prNumber: number,
  fields: {
    readonly title?: string;
    readonly body?: string;
    readonly base?: string;
    readonly state?: string;
  },
): Promise<Result<GitHubPullDetail, GitHubError>> {
  const result = await apiRequest<RawPullDetail>(
    `${buildRepoPath(owner, repo)}/pulls/${prNumber}`,
    { method: "PATCH", body: fields },
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
    value: mapRawPullDetailToGitHubPullDetail(result.value.data, classification),
  };
}

/** Fetch files changed in a pull request. */
export async function fetchPullFiles(
  apiRequest: ApiRequestFn,
  classifyRepo: ClassifyRepoFn,
  owner: string,
  repo: string,
  prNumber: number,
  opts?: { readonly perPage?: number },
): Promise<Result<readonly GitHubPullFile[], GitHubError>> {
  const params = new URLSearchParams();
  params.set("per_page", String(opts?.perPage ?? 30));

  const result = await apiRequest<readonly RawPullFile[]>(
    `${buildRepoPath(owner, repo)}/pulls/${prNumber}/files?${params.toString()}`,
  );
  if (!result.ok) return result;

  const classification = await fetchRepoClassification(
    apiRequest,
    classifyRepo,
    owner,
    repo,
  );
  const files: readonly GitHubPullFile[] = result.value.data.map((f) => ({
    filename: f.filename,
    status: f.status,
    additions: f.additions,
    deletions: f.deletions,
    changes: f.changes,
    classification,
  }));
  return { ok: true, value: files };
}

/** Fetch pull requests from a GitHub repo. */
export async function fetchRepoPulls(
  apiRequest: ApiRequestFn,
  classifyRepo: ClassifyRepoFn,
  owner: string,
  repo: string,
  opts?: { readonly state?: string; readonly perPage?: number },
): Promise<Result<readonly GitHubPull[], GitHubError>> {
  const params = new URLSearchParams();
  params.set("state", opts?.state ?? "open");
  params.set("per_page", String(opts?.perPage ?? 20));

  const result = await apiRequest<readonly RawPull[]>(
    `${buildRepoPath(owner, repo)}/pulls?${params.toString()}`,
  );
  if (!result.ok) return result;

  const classification = await fetchRepoClassification(
    apiRequest,
    classifyRepo,
    owner,
    repo,
  );
  const pulls = result.value.data.map((p) =>
    mapRawPullToGitHubPull(p, classification)
  );
  return { ok: true, value: pulls };
}

/** Create a pull request on a GitHub repo. */
export async function submitRepoPullRequest(
  apiRequest: ApiRequestFn,
  classifyRepo: ClassifyRepoFn,
  owner: string,
  repo: string,
  title: string,
  head: string,
  base: string,
  body?: string,
): Promise<Result<GitHubPull, GitHubError>> {
  const result = await apiRequest<RawPull>(
    `${buildRepoPath(owner, repo)}/pulls`,
    { method: "POST", body: { title, head, base, body: body ?? "" } },
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
    value: mapRawPullToGitHubPull(result.value.data, classification),
  };
}

/** Submit a review on a GitHub pull request. */
export async function submitPullRequestReview(
  apiRequest: ApiRequestFn,
  classifyRepo: ClassifyRepoFn,
  owner: string,
  repo: string,
  prNumber: number,
  event: string,
  body: string,
): Promise<
  Result<
    {
      readonly id: number;
      readonly state: string;
      readonly classification: ClassificationLevel;
    },
    GitHubError
  >
> {
  const result = await apiRequest<{ id: number; state: string }>(
    `${buildRepoPath(owner, repo)}/pulls/${prNumber}/reviews`,
    { method: "POST", body: { event, body } },
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
      state: result.value.data.state,
      classification,
    },
  };
}

/** Build the merge request body. */
function buildMergeRequestBody(
  opts?: { readonly method?: string; readonly commitTitle?: string },
): Record<string, unknown> {
  return {
    merge_method: opts?.method ?? "merge",
    ...(opts?.commitTitle ? { commit_title: opts.commitTitle } : {}),
  };
}

/** Merge a pull request on a GitHub repo. */
export async function mergeRepoPullRequest(
  apiRequest: ApiRequestFn,
  classifyRepo: ClassifyRepoFn,
  owner: string,
  repo: string,
  prNumber: number,
  opts?: { readonly method?: string; readonly commitTitle?: string },
): Promise<
  Result<
    {
      readonly merged: boolean;
      readonly message: string;
      readonly classification: ClassificationLevel;
    },
    GitHubError
  >
> {
  const result = await apiRequest<{ merged: boolean; message: string }>(
    `${buildRepoPath(owner, repo)}/pulls/${prNumber}/merge`,
    { method: "PUT", body: buildMergeRequestBody(opts) },
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
      merged: result.value.data.merged,
      message: result.value.data.message,
      classification,
    },
  };
}
