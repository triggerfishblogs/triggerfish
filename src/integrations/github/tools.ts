/**
 * GitHub tool definitions and executor for the agent.
 *
 * Provides 14 tool definitions, a system prompt section, and an executor
 * factory following the same pattern as `src/web/tools.ts`.
 *
 * @module
 */

import type { ToolDefinition } from "../../agent/orchestrator.ts";
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

// ─── Tool Definitions ────────────────────────────────────────────────────────

/**
 * Get GitHub tool definitions for the agent system prompt.
 */
export function getGitHubToolDefinitions(): readonly ToolDefinition[] {
  return [
    {
      name: "github_repos_list",
      description:
        "List your GitHub repositories, sorted by recently updated. Returns repo name, visibility, description, and default branch.",
      parameters: {
        page: {
          type: "number",
          description: "Page number for pagination (default: 1)",
        },
        per_page: {
          type: "number",
          description: "Results per page (default: 30, max: 100)",
        },
      },
    },
    {
      name: "github_repos_read_file",
      description:
        "Read the contents of a file from a GitHub repository. Returns the file text (max 1 MB). Use for reading source code, configs, docs.",
      parameters: {
        repo: {
          type: "string",
          description: 'Repository in "owner/name" format',
          required: true,
        },
        path: {
          type: "string",
          description: "File path within the repository (e.g. src/main.ts)",
          required: true,
        },
        ref: {
          type: "string",
          description: "Branch, tag, or commit SHA (default: repo default branch)",
        },
      },
    },
    {
      name: "github_repos_commits",
      description:
        "List recent commits for a repository. Returns SHA, message, author, and date.",
      parameters: {
        repo: {
          type: "string",
          description: 'Repository in "owner/name" format',
          required: true,
        },
        sha: {
          type: "string",
          description: "Branch name or commit SHA to list commits from",
        },
        per_page: {
          type: "number",
          description: "Number of commits to return (default: 20)",
        },
      },
    },
    {
      name: "github_pulls_list",
      description:
        "List pull requests for a repository. Returns PR number, title, state, author, and branches.",
      parameters: {
        repo: {
          type: "string",
          description: 'Repository in "owner/name" format',
          required: true,
        },
        state: {
          type: "string",
          description: 'Filter by state: "open", "closed", or "all" (default: "open")',
        },
        per_page: {
          type: "number",
          description: "Number of PRs to return (default: 20)",
        },
      },
    },
    {
      name: "github_pulls_create",
      description:
        "Create a new pull request. Returns the created PR details.",
      parameters: {
        repo: {
          type: "string",
          description: 'Repository in "owner/name" format',
          required: true,
        },
        title: {
          type: "string",
          description: "PR title",
          required: true,
        },
        head: {
          type: "string",
          description: "Branch containing changes",
          required: true,
        },
        base: {
          type: "string",
          description: "Branch to merge into (e.g. main)",
          required: true,
        },
        body: {
          type: "string",
          description: "PR description (markdown)",
        },
      },
    },
    {
      name: "github_pulls_review",
      description:
        "Submit a review on a pull request. Events: APPROVE, REQUEST_CHANGES, COMMENT.",
      parameters: {
        repo: {
          type: "string",
          description: 'Repository in "owner/name" format',
          required: true,
        },
        pr_number: {
          type: "number",
          description: "Pull request number",
          required: true,
        },
        event: {
          type: "string",
          description: 'Review event: "APPROVE", "REQUEST_CHANGES", or "COMMENT"',
          required: true,
        },
        body: {
          type: "string",
          description: "Review comment body",
          required: true,
        },
      },
    },
    {
      name: "github_pulls_merge",
      description:
        "Merge a pull request. Supports merge, squash, or rebase methods.",
      parameters: {
        repo: {
          type: "string",
          description: 'Repository in "owner/name" format',
          required: true,
        },
        pr_number: {
          type: "number",
          description: "Pull request number",
          required: true,
        },
        method: {
          type: "string",
          description: 'Merge method: "merge", "squash", or "rebase" (default: "merge")',
        },
        commit_title: {
          type: "string",
          description: "Custom commit title for squash/merge",
        },
      },
    },
    {
      name: "github_issues_list",
      description:
        "List issues for a repository. Returns issue number, title, state, labels, and author.",
      parameters: {
        repo: {
          type: "string",
          description: 'Repository in "owner/name" format',
          required: true,
        },
        state: {
          type: "string",
          description: 'Filter by state: "open", "closed", or "all" (default: "open")',
        },
        labels: {
          type: "string",
          description: "Comma-separated list of label names to filter by",
        },
        per_page: {
          type: "number",
          description: "Number of issues to return (default: 20)",
        },
      },
    },
    {
      name: "github_issues_create",
      description:
        "Create a new issue in a repository. Returns the created issue details.",
      parameters: {
        repo: {
          type: "string",
          description: 'Repository in "owner/name" format',
          required: true,
        },
        title: {
          type: "string",
          description: "Issue title",
          required: true,
        },
        body: {
          type: "string",
          description: "Issue body (markdown)",
        },
        labels: {
          type: "string",
          description: "Comma-separated list of label names to apply",
        },
      },
    },
    {
      name: "github_issues_comment",
      description:
        "Add a comment to an issue or pull request.",
      parameters: {
        repo: {
          type: "string",
          description: 'Repository in "owner/name" format',
          required: true,
        },
        number: {
          type: "number",
          description: "Issue or PR number",
          required: true,
        },
        body: {
          type: "string",
          description: "Comment body (markdown)",
          required: true,
        },
      },
    },
    {
      name: "github_actions_runs",
      description:
        "List recent GitHub Actions workflow runs for a repository.",
      parameters: {
        repo: {
          type: "string",
          description: 'Repository in "owner/name" format',
          required: true,
        },
        workflow: {
          type: "string",
          description: "Workflow file name or ID to filter by (e.g. ci.yml)",
        },
        branch: {
          type: "string",
          description: "Branch to filter by",
        },
        per_page: {
          type: "number",
          description: "Number of runs to return (default: 10)",
        },
      },
    },
    {
      name: "github_actions_trigger",
      description:
        "Trigger a GitHub Actions workflow via workflow_dispatch event.",
      parameters: {
        repo: {
          type: "string",
          description: 'Repository in "owner/name" format',
          required: true,
        },
        workflow: {
          type: "string",
          description: "Workflow file name or ID (e.g. deploy.yml)",
          required: true,
        },
        ref: {
          type: "string",
          description: "Git reference (branch or tag) to run the workflow on",
          required: true,
        },
        inputs: {
          type: "object",
          description: "Workflow input parameters as key-value pairs",
        },
      },
    },
    {
      name: "github_search_code",
      description:
        "Search code across GitHub repositories. Returns file paths, repos, and text matches.",
      parameters: {
        query: {
          type: "string",
          description: 'GitHub code search query (e.g. "import express repo:owner/name")',
          required: true,
        },
        per_page: {
          type: "number",
          description: "Number of results to return (default: 10)",
        },
      },
    },
    {
      name: "github_search_issues",
      description:
        "Search issues and pull requests across GitHub. Returns numbers, titles, repos, and states.",
      parameters: {
        query: {
          type: "string",
          description: 'GitHub issue search query (e.g. "bug label:critical repo:owner/name")',
          required: true,
        },
        per_page: {
          type: "number",
          description: "Number of results to return (default: 10)",
        },
      },
    },
  ];
}

// ─── System Prompt ───────────────────────────────────────────────────────────

/** System prompt section explaining GitHub tools to the LLM. */
export const GITHUB_TOOLS_SYSTEM_PROMPT = `## GitHub Access

You have access to GitHub via 14 github_* tools: repos, PRs, issues, Actions, and search.

- The \`repo\` parameter always uses "owner/name" format (e.g. "octocat/Hello-World").
- Repository visibility determines security classification: public→PUBLIC, private→CONFIDENTIAL, internal→INTERNAL.
- Accessing private repos escalates session taint — be mindful of classification boundaries.
- Write operations (create PR, merge, create issue, comment, trigger workflow, submit review) require appropriate permissions on the GitHub token.
- Use github_search_code and github_search_issues for cross-repo discovery.
- Never narrate your intent to use GitHub tools — just call them directly.`;

// ─── Executor ────────────────────────────────────────────────────────────────

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
