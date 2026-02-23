/**
 * GitHub repos tool handlers — list, read file, commits.
 *
 * Each handler validates inputs, calls the GitHubClient, and
 * formats the response as a JSON string for the agent.
 *
 * @module
 */

import type { GitHubClient } from "../client.ts";
import { validateRepoInput, formatGitHubError } from "../tools_shared.ts";

// ─── List Repos ──────────────────────────────────────────────────────────────

/** Handle the github_repos_list tool invocation. */
export async function executeReposList(
  client: GitHubClient,
  input: Record<string, unknown>,
): Promise<string> {
  const page = typeof input.page === "number" ? input.page : undefined;
  const perPage = typeof input.per_page === "number" ? input.per_page : undefined;
  const result = await client.listRepos({ page, perPage });
  if (!result.ok) return formatGitHubError(result.error);
  return JSON.stringify({
    repos: result.value.map((r) => ({
      name: r.fullName,
      visibility: r.visibility,
      description: r.description,
      default_branch: r.defaultBranch,
      url: r.htmlUrl,
      _classification: r.classification,
    })),
  });
}

// ─── Read File ───────────────────────────────────────────────────────────────

/** Handle the github_repos_read_file tool invocation. */
export async function executeReposReadFile(
  client: GitHubClient,
  input: Record<string, unknown>,
): Promise<string> {
  const repoResult = validateRepoInput(input, "github_repos_read_file");
  if (typeof repoResult === "string") return repoResult;

  const path = input.path;
  if (typeof path !== "string" || path.length === 0) {
    return "Error: github_repos_read_file requires a 'path' argument.";
  }

  const ref = typeof input.ref === "string" ? input.ref : undefined;
  const result = await client.readFile(repoResult.owner, repoResult.name, path, ref);
  if (!result.ok) return formatGitHubError(result.error);
  return JSON.stringify({
    path: result.value.path,
    content: result.value.content,
    sha: result.value.sha,
    size: result.value.size,
    url: result.value.htmlUrl,
    _classification: result.value.classification,
  });
}

// ─── List Commits ────────────────────────────────────────────────────────────

/** Handle the github_repos_commits tool invocation. */
export async function executeReposCommits(
  client: GitHubClient,
  input: Record<string, unknown>,
): Promise<string> {
  const repoResult = validateRepoInput(input, "github_repos_commits");
  if (typeof repoResult === "string") return repoResult;

  const sha = typeof input.sha === "string" ? input.sha : undefined;
  const perPage = typeof input.per_page === "number" ? input.per_page : undefined;
  const result = await client.listCommits(repoResult.owner, repoResult.name, { sha, perPage });
  if (!result.ok) return formatGitHubError(result.error);
  return JSON.stringify({
    commits: result.value.map((c) => ({
      sha: c.sha.slice(0, 8),
      message: c.message.split("\n")[0],
      author: c.author,
      date: c.date,
      url: c.htmlUrl,
      _classification: c.classification,
    })),
  });
}
