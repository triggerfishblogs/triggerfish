/**
 * GitHub issues tool handlers — list, create, comment.
 *
 * Each handler validates inputs, calls the GitHubClient, and
 * formats the response as a JSON string for the agent.
 *
 * @module
 */

import type { GitHubClient } from "./client.ts";
import { validateRepoInput, formatGitHubError } from "./tools_shared.ts";

// ─── List Issues ─────────────────────────────────────────────────────────────

/** Handle the github_issues_list tool invocation. */
export async function executeIssuesList(
  client: GitHubClient,
  input: Record<string, unknown>,
): Promise<string> {
  const repoResult = validateRepoInput(input, "github_issues_list");
  if (typeof repoResult === "string") return repoResult;

  const state = typeof input.state === "string" ? input.state : undefined;
  const labels = typeof input.labels === "string" ? input.labels : undefined;
  const perPage = typeof input.per_page === "number" ? input.per_page : undefined;
  const result = await client.listIssues(repoResult.owner, repoResult.name, { state, labels, perPage });
  if (!result.ok) return formatGitHubError(result.error);
  return JSON.stringify({
    issues: result.value.map((i) => ({
      number: i.number,
      title: i.title,
      state: i.state,
      author: i.author,
      labels: i.labels,
      url: i.htmlUrl,
      _classification: i.classification,
    })),
  });
}

// ─── Create Issue ────────────────────────────────────────────────────────────

/** Handle the github_issues_create tool invocation. */
export async function executeIssuesCreate(
  client: GitHubClient,
  input: Record<string, unknown>,
): Promise<string> {
  const repoResult = validateRepoInput(input, "github_issues_create");
  if (typeof repoResult === "string") return repoResult;

  const title = input.title;
  if (typeof title !== "string" || title.length === 0) {
    return "Error: github_issues_create requires a 'title' argument.";
  }
  const body = typeof input.body === "string" ? input.body : undefined;
  const labels = typeof input.labels === "string"
    ? input.labels.split(",").map((l) => l.trim())
    : undefined;

  const result = await client.createIssue(repoResult.owner, repoResult.name, title, body, labels);
  if (!result.ok) return formatGitHubError(result.error);
  return JSON.stringify({
    number: result.value.number,
    title: result.value.title,
    url: result.value.htmlUrl,
    _classification: result.value.classification,
  });
}

// ─── Comment on Issue ────────────────────────────────────────────────────────

/** Handle the github_issues_comment tool invocation. */
export async function executeIssuesComment(
  client: GitHubClient,
  input: Record<string, unknown>,
): Promise<string> {
  const repoResult = validateRepoInput(input, "github_issues_comment");
  if (typeof repoResult === "string") return repoResult;

  const number = input.number;
  if (typeof number !== "number") {
    return "Error: github_issues_comment requires a 'number' argument (number).";
  }
  const body = input.body;
  if (typeof body !== "string" || body.length === 0) {
    return "Error: github_issues_comment requires a 'body' argument.";
  }

  const result = await client.createComment(repoResult.owner, repoResult.name, number, body);
  if (!result.ok) return formatGitHubError(result.error);
  return JSON.stringify({
    id: result.value.id,
    url: result.value.htmlUrl,
    _classification: result.value.classification,
  });
}
