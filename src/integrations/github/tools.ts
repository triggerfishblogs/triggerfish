/**
 * GitHub tool executor for the agent.
 *
 * Creates a chain-compatible executor for the 14 `github_*` tools.
 * Tool definitions live in `tools_defs.ts`; this module contains the
 * runtime dispatch logic.
 *
 * @module
 */

import type { ClassificationLevel } from "../../core/types/classification.ts";
import type { SessionId } from "../../core/types/session.ts";
import type { GitHubClient } from "./client.ts";

// ─── Context ─────────────────────────────────────────────────────────────────

/** Context required by the GitHub tool executor. */
export interface GitHubToolContext {
  readonly client: GitHubClient;
  readonly sessionTaint: ClassificationLevel;
  readonly sourceSessionId: SessionId;
}

// ─── Barrel re-exports from tools_defs.ts ───────────────────────────────────

export { getGitHubToolDefinitions, GITHUB_TOOLS_SYSTEM_PROMPT } from "./tools_defs.ts";

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Parse an "owner/name" repo string into [owner, name].
 * Returns null if the format is invalid.
 */
function parseRepo(repo: string): [string, string] | null {
  const parts = repo.split("/");
  if (parts.length !== 2 || parts[0].length === 0 || parts[1].length === 0) {
    return null;
  }
  return [parts[0], parts[1]];
}

/** Format a GitHubError into a user-friendly string. */
function formatError(error: { readonly status: number; readonly message: string; readonly rateLimitRemaining?: number; readonly rateLimitReset?: number }): string {
  if (error.status === 403 && error.rateLimitRemaining === 0) {
    const resetDate = error.rateLimitReset
      ? new Date(error.rateLimitReset * 1000).toISOString()
      : "unknown";
    return `GitHub rate limit exceeded. Resets at ${resetDate}.`;
  }
  return `GitHub API error (${error.status}): ${error.message}`;
}

// ─── Executor ────────────────────────────────────────────────────────────────

/**
 * Create a tool executor for GitHub tools.
 *
 * Returns null for unknown tool names (allowing chaining with other executors).
 * Returns a graceful error message if ctx is undefined (GitHub not configured).
 */
export function createGitHubToolExecutor(
  ctx: GitHubToolContext | undefined,
): (name: string, input: Record<string, unknown>) => Promise<string | null> {
  return async (
    name: string,
    input: Record<string, unknown>,
  ): Promise<string | null> => {
    // Only handle github_* tools
    if (!name.startsWith("github_")) {
      return null;
    }

    if (!ctx) {
      return "GitHub is not configured. Set up a GitHub token to use GitHub tools.";
    }

    const { client } = ctx;

    switch (name) {
      case "github_repos_list": {
        const page = typeof input.page === "number" ? input.page : undefined;
        const perPage = typeof input.per_page === "number" ? input.per_page : undefined;
        const result = await client.listRepos({ page, perPage });
        if (!result.ok) return formatError(result.error);
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

      case "github_repos_read_file": {
        const repoStr = input.repo;
        if (typeof repoStr !== "string" || repoStr.length === 0) {
          return 'Error: github_repos_read_file requires a \'repo\' argument in "owner/name" format.';
        }
        const parsed = parseRepo(repoStr);
        if (!parsed) return 'Error: \'repo\' must be in "owner/name" format.';

        const path = input.path;
        if (typeof path !== "string" || path.length === 0) {
          return "Error: github_repos_read_file requires a 'path' argument.";
        }

        const ref = typeof input.ref === "string" ? input.ref : undefined;
        const result = await client.readFile(parsed[0], parsed[1], path, ref);
        if (!result.ok) return formatError(result.error);
        return JSON.stringify({
          path: result.value.path,
          content: result.value.content,
          sha: result.value.sha,
          size: result.value.size,
          url: result.value.htmlUrl,
          _classification: result.value.classification,
        });
      }

      case "github_repos_commits": {
        const repoStr = input.repo;
        if (typeof repoStr !== "string" || repoStr.length === 0) {
          return 'Error: github_repos_commits requires a \'repo\' argument in "owner/name" format.';
        }
        const parsed = parseRepo(repoStr);
        if (!parsed) return 'Error: \'repo\' must be in "owner/name" format.';

        const sha = typeof input.sha === "string" ? input.sha : undefined;
        const perPage = typeof input.per_page === "number" ? input.per_page : undefined;
        const result = await client.listCommits(parsed[0], parsed[1], { sha, perPage });
        if (!result.ok) return formatError(result.error);
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

      case "github_pulls_list": {
        const repoStr = input.repo;
        if (typeof repoStr !== "string" || repoStr.length === 0) {
          return 'Error: github_pulls_list requires a \'repo\' argument in "owner/name" format.';
        }
        const parsed = parseRepo(repoStr);
        if (!parsed) return 'Error: \'repo\' must be in "owner/name" format.';

        const state = typeof input.state === "string" ? input.state : undefined;
        const perPage = typeof input.per_page === "number" ? input.per_page : undefined;
        const result = await client.listPulls(parsed[0], parsed[1], { state, perPage });
        if (!result.ok) return formatError(result.error);
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

      case "github_pulls_create": {
        const repoStr = input.repo;
        if (typeof repoStr !== "string" || repoStr.length === 0) {
          return 'Error: github_pulls_create requires a \'repo\' argument in "owner/name" format.';
        }
        const parsed = parseRepo(repoStr);
        if (!parsed) return 'Error: \'repo\' must be in "owner/name" format.';

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
        const body = typeof input.body === "string" ? input.body : undefined;

        const result = await client.createPull(parsed[0], parsed[1], title, head, base, body);
        if (!result.ok) return formatError(result.error);
        return JSON.stringify({
          number: result.value.number,
          title: result.value.title,
          url: result.value.htmlUrl,
          _classification: result.value.classification,
        });
      }

      case "github_pulls_review": {
        const repoStr = input.repo;
        if (typeof repoStr !== "string" || repoStr.length === 0) {
          return 'Error: github_pulls_review requires a \'repo\' argument in "owner/name" format.';
        }
        const parsed = parseRepo(repoStr);
        if (!parsed) return 'Error: \'repo\' must be in "owner/name" format.';

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

        const result = await client.submitReview(parsed[0], parsed[1], prNumber, event, body);
        if (!result.ok) return formatError(result.error);
        return JSON.stringify({
          id: result.value.id,
          state: result.value.state,
          _classification: result.value.classification,
        });
      }

      case "github_pulls_merge": {
        const repoStr = input.repo;
        if (typeof repoStr !== "string" || repoStr.length === 0) {
          return 'Error: github_pulls_merge requires a \'repo\' argument in "owner/name" format.';
        }
        const parsed = parseRepo(repoStr);
        if (!parsed) return 'Error: \'repo\' must be in "owner/name" format.';

        const prNumber = input.pr_number;
        if (typeof prNumber !== "number") {
          return "Error: github_pulls_merge requires a 'pr_number' argument (number).";
        }
        const method = typeof input.method === "string" ? input.method : undefined;
        const commitTitle = typeof input.commit_title === "string" ? input.commit_title : undefined;

        const result = await client.mergePull(parsed[0], parsed[1], prNumber, { method, commitTitle });
        if (!result.ok) return formatError(result.error);
        return JSON.stringify({
          merged: result.value.merged,
          message: result.value.message,
          _classification: result.value.classification,
        });
      }

      case "github_issues_list": {
        const repoStr = input.repo;
        if (typeof repoStr !== "string" || repoStr.length === 0) {
          return 'Error: github_issues_list requires a \'repo\' argument in "owner/name" format.';
        }
        const parsed = parseRepo(repoStr);
        if (!parsed) return 'Error: \'repo\' must be in "owner/name" format.';

        const state = typeof input.state === "string" ? input.state : undefined;
        const labels = typeof input.labels === "string" ? input.labels : undefined;
        const perPage = typeof input.per_page === "number" ? input.per_page : undefined;
        const result = await client.listIssues(parsed[0], parsed[1], { state, labels, perPage });
        if (!result.ok) return formatError(result.error);
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

      case "github_issues_create": {
        const repoStr = input.repo;
        if (typeof repoStr !== "string" || repoStr.length === 0) {
          return 'Error: github_issues_create requires a \'repo\' argument in "owner/name" format.';
        }
        const parsed = parseRepo(repoStr);
        if (!parsed) return 'Error: \'repo\' must be in "owner/name" format.';

        const title = input.title;
        if (typeof title !== "string" || title.length === 0) {
          return "Error: github_issues_create requires a 'title' argument.";
        }
        const body = typeof input.body === "string" ? input.body : undefined;
        const labels = typeof input.labels === "string"
          ? input.labels.split(",").map((l) => l.trim())
          : undefined;

        const result = await client.createIssue(parsed[0], parsed[1], title, body, labels);
        if (!result.ok) return formatError(result.error);
        return JSON.stringify({
          number: result.value.number,
          title: result.value.title,
          url: result.value.htmlUrl,
          _classification: result.value.classification,
        });
      }

      case "github_issues_comment": {
        const repoStr = input.repo;
        if (typeof repoStr !== "string" || repoStr.length === 0) {
          return 'Error: github_issues_comment requires a \'repo\' argument in "owner/name" format.';
        }
        const parsed = parseRepo(repoStr);
        if (!parsed) return 'Error: \'repo\' must be in "owner/name" format.';

        const number = input.number;
        if (typeof number !== "number") {
          return "Error: github_issues_comment requires a 'number' argument (number).";
        }
        const body = input.body;
        if (typeof body !== "string" || body.length === 0) {
          return "Error: github_issues_comment requires a 'body' argument.";
        }

        const result = await client.createComment(parsed[0], parsed[1], number, body);
        if (!result.ok) return formatError(result.error);
        return JSON.stringify({
          id: result.value.id,
          url: result.value.htmlUrl,
          _classification: result.value.classification,
        });
      }

      case "github_actions_runs": {
        const repoStr = input.repo;
        if (typeof repoStr !== "string" || repoStr.length === 0) {
          return 'Error: github_actions_runs requires a \'repo\' argument in "owner/name" format.';
        }
        const parsed = parseRepo(repoStr);
        if (!parsed) return 'Error: \'repo\' must be in "owner/name" format.';

        const workflow = typeof input.workflow === "string" ? input.workflow : undefined;
        const branch = typeof input.branch === "string" ? input.branch : undefined;
        const perPage = typeof input.per_page === "number" ? input.per_page : undefined;
        const result = await client.listWorkflowRuns(parsed[0], parsed[1], { workflow, branch, perPage });
        if (!result.ok) return formatError(result.error);
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

      case "github_actions_trigger": {
        const repoStr = input.repo;
        if (typeof repoStr !== "string" || repoStr.length === 0) {
          return 'Error: github_actions_trigger requires a \'repo\' argument in "owner/name" format.';
        }
        const parsed = parseRepo(repoStr);
        if (!parsed) return 'Error: \'repo\' must be in "owner/name" format.';

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

        const result = await client.triggerWorkflow(parsed[0], parsed[1], workflow, ref, inputs);
        if (!result.ok) return formatError(result.error);
        return JSON.stringify({
          triggered: result.value.triggered,
          _classification: result.value.classification,
        });
      }

      case "github_search_code": {
        const query = input.query;
        if (typeof query !== "string" || query.length === 0) {
          return "Error: github_search_code requires a 'query' argument.";
        }
        const perPage = typeof input.per_page === "number" ? input.per_page : undefined;
        const result = await client.searchCode(query, { perPage });
        if (!result.ok) return formatError(result.error);
        return JSON.stringify({
          results: result.value.map((item) => ({
            path: item.path,
            repo: item.repo,
            url: item.htmlUrl,
            matches: item.textMatches,
            _classification: item.classification,
          })),
        });
      }

      case "github_search_issues": {
        const query = input.query;
        if (typeof query !== "string" || query.length === 0) {
          return "Error: github_search_issues requires a 'query' argument.";
        }
        const perPage = typeof input.per_page === "number" ? input.per_page : undefined;
        const result = await client.searchIssues(query, { perPage });
        if (!result.ok) return formatError(result.error);
        return JSON.stringify({
          results: result.value.map((item) => ({
            number: item.number,
            title: item.title,
            repo: item.repo,
            state: item.state,
            url: item.htmlUrl,
            _classification: item.classification,
          })),
        });
      }

      default:
        // Unknown github_* tool — return null to allow chaining
        return null;
    }
  };
}
