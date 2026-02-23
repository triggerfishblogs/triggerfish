/**
 * GitHub pull request tool handlers — list, create, review, merge.
 *
 * Each handler validates inputs, calls the GitHubClient, and
 * formats the response as a JSON string for the agent.
 *
 * @module
 */

import type { GitHubClient } from "../client.ts";
import { validateRepoInput, formatGitHubError } from "../tools_shared.ts";

// ─── List Pulls ──────────────────────────────────────────────────────────────

/** Handle the github_pulls_list tool invocation. */
export async function executePullsList(
  client: GitHubClient,
  input: Record<string, unknown>,
): Promise<string> {
  const repoResult = validateRepoInput(input, "github_pulls_list");
  if (typeof repoResult === "string") return repoResult;

  const state = typeof input.state === "string" ? input.state : undefined;
  const perPage = typeof input.per_page === "number" ? input.per_page : undefined;
  const result = await client.listPulls(repoResult.owner, repoResult.name, { state, perPage });
  if (!result.ok) return formatGitHubError(result.error);
  return JSON.stringify({
    pulls: result.value.map((p) => ({
      number: p.number,
      title: p.title,
      state: p.state,
      author: p.author,
      head: p.headRef,
      base: p.baseRef,
      url: p.htmlUrl,
      _classification: p.classification,
    })),
  });
}

// ─── Create Pull ─────────────────────────────────────────────────────────────

/** Validate the required string fields for pull creation. */
function validatePullCreateFields(input: Record<string, unknown>): {
  readonly title: string;
  readonly head: string;
  readonly base: string;
} | string {
  const title = input.title;
  if (typeof title !== "string" || title.length === 0) {
    return "Error: github_pulls_create requires a 'title' argument.";
  }
  const head = input.head;
  if (typeof head !== "string" || head.length === 0) {
    return "Error: github_pulls_create requires a 'head' argument.";
  }
  const base = input.base;
  if (typeof base !== "string" || base.length === 0) {
    return "Error: github_pulls_create requires a 'base' argument.";
  }
  return { title, head, base };
}

/** Handle the github_pulls_create tool invocation. */
export async function executePullsCreate(
  client: GitHubClient,
  input: Record<string, unknown>,
): Promise<string> {
  const repoResult = validateRepoInput(input, "github_pulls_create");
  if (typeof repoResult === "string") return repoResult;

  const fields = validatePullCreateFields(input);
  if (typeof fields === "string") return fields;

  const body = typeof input.body === "string" ? input.body : undefined;
  const result = await client.createPull(
    repoResult.owner,
    repoResult.name,
    fields.title,
    fields.head,
    fields.base,
    body,
  );
  if (!result.ok) return formatGitHubError(result.error);
  return JSON.stringify({
    number: result.value.number,
    title: result.value.title,
    url: result.value.htmlUrl,
    _classification: result.value.classification,
  });
}

// ─── Submit Review ───────────────────────────────────────────────────────────

/** Handle the github_pulls_review tool invocation. */
export async function executePullsReview(
  client: GitHubClient,
  input: Record<string, unknown>,
): Promise<string> {
  const repoResult = validateRepoInput(input, "github_pulls_review");
  if (typeof repoResult === "string") return repoResult;

  const prNumber = input.pr_number;
  if (typeof prNumber !== "number") {
    return "Error: github_pulls_review requires a 'pr_number' argument (number).";
  }
  const event = input.event;
  if (typeof event !== "string" || event.length === 0) {
    return "Error: github_pulls_review requires an 'event' argument (APPROVE, REQUEST_CHANGES, or COMMENT).";
  }
  const body = input.body;
  if (typeof body !== "string" || body.length === 0) {
    return "Error: github_pulls_review requires a 'body' argument.";
  }

  const result = await client.submitReview(repoResult.owner, repoResult.name, prNumber, event, body);
  if (!result.ok) return formatGitHubError(result.error);
  return JSON.stringify({
    id: result.value.id,
    state: result.value.state,
    _classification: result.value.classification,
  });
}

// ─── Merge Pull ──────────────────────────────────────────────────────────────

/** Handle the github_pulls_merge tool invocation. */
export async function executePullsMerge(
  client: GitHubClient,
  input: Record<string, unknown>,
): Promise<string> {
  const repoResult = validateRepoInput(input, "github_pulls_merge");
  if (typeof repoResult === "string") return repoResult;

  const prNumber = input.pr_number;
  if (typeof prNumber !== "number") {
    return "Error: github_pulls_merge requires a 'pr_number' argument (number).";
  }
  const method = typeof input.method === "string" ? input.method : undefined;
  const commitTitle = typeof input.commit_title === "string" ? input.commit_title : undefined;

  const result = await client.mergePull(repoResult.owner, repoResult.name, prNumber, { method, commitTitle });
  if (!result.ok) return formatGitHubError(result.error);
  return JSON.stringify({
    merged: result.value.merged,
    message: result.value.message,
    _classification: result.value.classification,
  });
}
