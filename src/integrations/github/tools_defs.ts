/**
 * GitHub tool definitions and system prompt for the agent.
 *
 * Defines the 14 `github_*` tool schemas and the system prompt section
 * that explains GitHub access to the LLM. Separated from the executor
 * to keep definition-only consumers lightweight.
 *
 * @module
 */

import type { ToolDefinition } from "../../core/types/tool.ts";

function buildReposListDef(): ToolDefinition {
  return {
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
  };
}

function buildReposReadFileDef(): ToolDefinition {
  return {
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
        description:
          "Branch, tag, or commit SHA (default: repo default branch)",
      },
    },
  };
}

function buildReposCommitsDef(): ToolDefinition {
  return {
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
  };
}

function buildPullsListDef(): ToolDefinition {
  return {
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
        description:
          'Filter by state: "open", "closed", or "all" (default: "open")',
      },
      per_page: {
        type: "number",
        description: "Number of PRs to return (default: 20)",
      },
    },
  };
}

function buildPullsCreateDef(): ToolDefinition {
  return {
    name: "github_pulls_create",
    description: "Create a new pull request. Returns the created PR details.",
    parameters: {
      repo: {
        type: "string",
        description: 'Repository in "owner/name" format',
        required: true,
      },
      title: { type: "string", description: "PR title", required: true },
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
      body: { type: "string", description: "PR description (markdown)" },
    },
  };
}

function buildPullsReviewDef(): ToolDefinition {
  return {
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
  };
}

function buildPullsMergeDef(): ToolDefinition {
  return {
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
        description:
          'Merge method: "merge", "squash", or "rebase" (default: "merge")',
      },
      commit_title: {
        type: "string",
        description: "Custom commit title for squash/merge",
      },
    },
  };
}

function buildIssuesListDef(): ToolDefinition {
  return {
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
        description:
          'Filter by state: "open", "closed", or "all" (default: "open")',
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
  };
}

function buildIssuesCreateDef(): ToolDefinition {
  return {
    name: "github_issues_create",
    description:
      "Create a new issue in a repository. Returns the created issue details.",
    parameters: {
      repo: {
        type: "string",
        description: 'Repository in "owner/name" format',
        required: true,
      },
      title: { type: "string", description: "Issue title", required: true },
      body: { type: "string", description: "Issue body (markdown)" },
      labels: {
        type: "string",
        description: "Comma-separated list of label names to apply",
      },
    },
  };
}

function buildIssuesCommentDef(): ToolDefinition {
  return {
    name: "github_issues_comment",
    description: "Add a comment to an issue or pull request.",
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
  };
}

function buildActionsRunsDef(): ToolDefinition {
  return {
    name: "github_actions_runs",
    description: "List recent GitHub Actions workflow runs for a repository.",
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
      branch: { type: "string", description: "Branch to filter by" },
      per_page: {
        type: "number",
        description: "Number of runs to return (default: 10)",
      },
    },
  };
}

function buildActionsTriggerDef(): ToolDefinition {
  return {
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
  };
}

function buildSearchCodeDef(): ToolDefinition {
  return {
    name: "github_search_code",
    description:
      "Search code across GitHub repositories. Returns file paths, repos, and text matches.",
    parameters: {
      query: {
        type: "string",
        description:
          'GitHub code search query (e.g. "import express repo:owner/name")',
        required: true,
      },
      per_page: {
        type: "number",
        description: "Number of results to return (default: 10)",
      },
    },
  };
}

function buildSearchIssuesDef(): ToolDefinition {
  return {
    name: "github_search_issues",
    description:
      "Search issues and pull requests across GitHub. Returns numbers, titles, repos, and states.",
    parameters: {
      query: {
        type: "string",
        description:
          'GitHub issue search query (e.g. "bug label:critical repo:owner/name")',
        required: true,
      },
      per_page: {
        type: "number",
        description: "Number of results to return (default: 10)",
      },
    },
  };
}

/**
 * Get GitHub tool definitions for the agent system prompt.
 */
export function getGitHubToolDefinitions(): readonly ToolDefinition[] {
  return [
    buildReposListDef(),
    buildReposReadFileDef(),
    buildReposCommitsDef(),
    buildPullsListDef(),
    buildPullsCreateDef(),
    buildPullsReviewDef(),
    buildPullsMergeDef(),
    buildIssuesListDef(),
    buildIssuesCreateDef(),
    buildIssuesCommentDef(),
    buildActionsRunsDef(),
    buildActionsTriggerDef(),
    buildSearchCodeDef(),
    buildSearchIssuesDef(),
  ];
}

/** System prompt section explaining GitHub tools to the LLM. */
export const GITHUB_TOOLS_SYSTEM_PROMPT = `## GitHub Access

You have access to GitHub via 14 github_* tools: repos, PRs, issues, Actions, and search.

- The \`repo\` parameter always uses "owner/name" format (e.g. "octocat/Hello-World").
- Repository visibility determines security classification: public→PUBLIC, private→CONFIDENTIAL, internal→INTERNAL.
- Accessing private repos escalates session taint — be mindful of classification boundaries.
- Write operations (create PR, merge, create issue, comment, trigger workflow, submit review) require appropriate permissions on the GitHub token.
- Use github_search_code and github_search_issues for cross-repo discovery.
- Never narrate your intent to use GitHub tools — just call them directly.`;
