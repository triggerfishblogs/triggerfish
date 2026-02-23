/**
 * GitHub client — repository, file, and commit operations.
 *
 * @module
 */

import type { ClassificationLevel, Result } from "../../core/types/classification.ts";
import type {
  GitHubCommit,
  GitHubError,
  GitHubFileContent,
  GitHubRepo,
  RepoVisibility,
} from "./types.ts";
import type { ApiRequestFn, ClassifyRepoFn } from "./client_http.ts";
import {
  buildRepoPath,
  extractRepoVisibility,
  fetchRepoClassification,
} from "./client_http.ts";
import type { RawCommit, RawContent, RawRepo } from "./client_http.ts";

/** Maximum file size (1 MB) for github_repos_read_file. */
const MAX_FILE_SIZE = 1_048_576;

/** Map a raw repo object to a GitHubRepo domain type. */
function mapRawRepoToGitHubRepo(
  r: RawRepo,
  classifyRepo: ClassifyRepoFn,
): GitHubRepo {
  const visibility = extractRepoVisibility(r);
  return {
    id: r.id,
    fullName: r.full_name,
    description: r.description ?? null,
    visibility: visibility as RepoVisibility,
    defaultBranch: r.default_branch,
    htmlUrl: r.html_url,
    classification: classifyRepo(visibility, r.full_name),
  };
}

/** Fetch user repos from the GitHub API. */
export async function fetchUserRepos(
  apiRequest: ApiRequestFn,
  classifyRepo: ClassifyRepoFn,
  opts?: { readonly page?: number; readonly perPage?: number },
): Promise<Result<readonly GitHubRepo[], GitHubError>> {
  const params = new URLSearchParams();
  if (opts?.page) params.set("page", String(opts.page));
  params.set("per_page", String(opts?.perPage ?? 30));
  params.set("sort", "updated");

  const result = await apiRequest<readonly RawRepo[]>(
    `/user/repos?${params.toString()}`,
  );
  if (!result.ok) return result;

  const repos = result.value.data.map((r) =>
    mapRawRepoToGitHubRepo(r, classifyRepo)
  );
  return { ok: true, value: repos };
}

/** Decode base64-encoded file content from GitHub. */
function decodeGitHubFileContent(raw: string): string {
  try {
    return atob(raw.replace(/\n/g, ""));
  } catch {
    return raw;
  }
}

/** Fetch a single file from a GitHub repo. */
export async function fetchRepoFile(
  apiRequest: ApiRequestFn,
  classifyRepo: ClassifyRepoFn,
  owner: string,
  repo: string,
  path: string,
  ref?: string,
): Promise<Result<GitHubFileContent, GitHubError>> {
  const params = ref ? `?ref=${encodeURIComponent(ref)}` : "";
  const result = await apiRequest<RawContent>(
    `${buildRepoPath(owner, repo)}/contents/${path}${params}`,
  );
  if (!result.ok) return result;

  const raw = result.value.data;
  if (raw.size > MAX_FILE_SIZE) {
    return {
      ok: false,
      error: {
        status: 413,
        message: `File too large: ${raw.size} bytes (max ${MAX_FILE_SIZE})`,
      },
    };
  }

  const classification = await fetchRepoClassification(
    apiRequest,
    classifyRepo,
    owner,
    repo,
  );
  return {
    ok: true,
    value: {
      path: raw.path,
      content: decodeGitHubFileContent(raw.content),
      sha: raw.sha,
      size: raw.size,
      htmlUrl: raw.html_url,
      classification,
    },
  };
}

/** Map a raw commit to a GitHubCommit domain type. */
function mapRawCommitToGitHubCommit(
  c: RawCommit,
  classification: ClassificationLevel,
): GitHubCommit {
  return {
    sha: c.sha,
    message: c.commit.message,
    author: c.commit.author?.name ?? c.author?.login ?? "unknown",
    date: c.commit.author?.date ?? "",
    htmlUrl: c.html_url,
    classification,
  };
}

/** Fetch commits from a GitHub repo. */
export async function fetchRepoCommits(
  apiRequest: ApiRequestFn,
  classifyRepo: ClassifyRepoFn,
  owner: string,
  repo: string,
  opts?: { readonly sha?: string; readonly perPage?: number },
): Promise<Result<readonly GitHubCommit[], GitHubError>> {
  const params = new URLSearchParams();
  if (opts?.sha) params.set("sha", opts.sha);
  params.set("per_page", String(opts?.perPage ?? 20));

  const result = await apiRequest<readonly RawCommit[]>(
    `${buildRepoPath(owner, repo)}/commits?${params.toString()}`,
  );
  if (!result.ok) return result;

  const classification = await fetchRepoClassification(
    apiRequest,
    classifyRepo,
    owner,
    repo,
  );
  const commits = result.value.data.map((c) =>
    mapRawCommitToGitHubCommit(c, classification)
  );
  return { ok: true, value: commits };
}
