/**
 * GitHub tool definitions and system prompt for the agent.
 *
 * Consolidated 4 domain-scoped tools (repos, pulls, issues, actions)
 * with `action` parameter dispatch. Each tool covers one domain and
 * documents which parameters each action uses.
 *
 * @module
 */

import type { ToolDefinition } from "../../core/types/tool.ts";

// ── Repos ───────────────────────────────────────────────────────────

function buildGitHubReposDef(): ToolDefinition {
  return {
    name: "github_repos",
    description:
      "Repository operations. Actions: list, get, read_file, list_commits, list_branches, create_branch, delete_branch, clone, pull.\n" +
      "- list: list user repos. Params: page?, per_page?\n" +
      "- get: get repo details. Params: repo (required)\n" +
      "- read_file: read file contents (max 1MB). Params: repo (required), path (required), ref?\n" +
      "- list_commits: list recent commits. Params: repo (required), sha?, per_page?\n" +
      "- list_branches: list branches. Params: repo (required), per_page?\n" +
      "- create_branch: create branch. Params: repo (required), branch (required), sha (required)\n" +
      "- delete_branch: delete branch. Params: repo (required), branch (required)\n" +
      "- clone: clone repo to local dir. Params: repo (required), path?, branch?, depth?\n" +
      "- pull: pull latest changes. Params: repo (required), path (required), branch?",
    parameters: {
      action: {
        type: "string",
        description:
          "The operation: list, get, read_file, list_commits, list_branches, create_branch, delete_branch, clone, pull",
        required: true,
      },
      repo: {
        type: "string",
        description: 'Repository in "owner/name" format',
        required: false,
      },
      path: {
        type: "string",
        description: "File path (read_file) or local directory (clone/pull)",
        required: false,
      },
      ref: {
        type: "string",
        description: "Git ref — branch, tag, or SHA (read_file)",
        required: false,
      },
      sha: {
        type: "string",
        description:
          "Commit SHA for list_commits filtering or create_branch base",
        required: false,
      },
      branch: {
        type: "string",
        description: "Branch name (create_branch, delete_branch, clone, pull)",
        required: false,
      },
      depth: {
        type: "number",
        description: "Clone depth (clone)",
        required: false,
      },
      page: {
        type: "number",
        description: "Page number for pagination (list)",
        required: false,
      },
      per_page: {
        type: "number",
        description: "Results per page (list, list_commits, list_branches)",
        required: false,
      },
    },
  };
}

// ── Pulls ───────────────────────────────────────────────────────────

function buildGitHubPullsDef(): ToolDefinition {
  return {
    name: "github_pulls",
    description:
      "Pull request operations. Actions: list, get, create, update, list_files, review, merge.\n" +
      "- list: list PRs. Params: repo (required), state?, per_page?, sort?, direction?\n" +
      "- get: get single PR. Params: repo (required), pr_number (required)\n" +
      "- create: create PR. Params: repo (required), title (required), head (required), base (required), body?\n" +
      "- update: update PR. Params: repo (required), pr_number (required), title?, body?, base?, state?\n" +
      "- list_files: list changed files. Params: repo (required), pr_number (required), per_page?\n" +
      "- review: submit review. Params: repo (required), pr_number (required), event (required: APPROVE|REQUEST_CHANGES|COMMENT), body (required)\n" +
      "- merge: merge PR. Params: repo (required), pr_number (required), method?, commit_title?",
    parameters: {
      action: {
        type: "string",
        description:
          "The operation: list, get, create, update, list_files, review, merge",
        required: true,
      },
      repo: {
        type: "string",
        description: 'Repository in "owner/name" format',
        required: false,
      },
      pr_number: {
        type: "number",
        description: "Pull request number",
        required: false,
      },
      title: {
        type: "string",
        description: "PR title (create, update)",
        required: false,
      },
      body: {
        type: "string",
        description: "PR body or review comment",
        required: false,
      },
      head: {
        type: "string",
        description: "Source branch (create)",
        required: false,
      },
      base: {
        type: "string",
        description: "Target branch (create, update)",
        required: false,
      },
      state: {
        type: "string",
        description:
          'Filter state: "open", "closed", "all" (list) or new state (update)',
        required: false,
      },
      event: {
        type: "string",
        description: "Review event: APPROVE, REQUEST_CHANGES, COMMENT (review)",
        required: false,
      },
      method: {
        type: "string",
        description: 'Merge method: "merge", "squash", "rebase" (merge)',
        required: false,
      },
      commit_title: {
        type: "string",
        description: "Custom merge commit title (merge)",
        required: false,
      },
      sort: {
        type: "string",
        description:
          'Sort by: "created", "updated", "popularity", "long-running" (list)',
        required: false,
      },
      direction: {
        type: "string",
        description: 'Sort direction: "asc", "desc"',
        required: false,
      },
      per_page: {
        type: "number",
        description: "Results per page",
        required: false,
      },
    },
  };
}

// ── Issues ──────────────────────────────────────────────────────────

function buildGitHubIssuesDef(): ToolDefinition {
  return {
    name: "github_issues",
    description:
      "Issue operations. Actions: list, get, create, update, list_comments, add_comment.\n" +
      "- list: list issues. Params: repo (required), state?, labels?, per_page?, sort?, direction?\n" +
      "- get: get single issue. Params: repo (required), number (required)\n" +
      "- create: create issue. Params: repo (required), title (required), body?, labels?\n" +
      "- update: update issue. Params: repo (required), number (required), title?, body?, state?, labels?, assignees?\n" +
      "- list_comments: list comments. Params: repo (required), number (required), per_page?, direction?\n" +
      "- add_comment: add comment. Params: repo (required), number (required), body (required)",
    parameters: {
      action: {
        type: "string",
        description:
          "The operation: list, get, create, update, list_comments, add_comment",
        required: true,
      },
      repo: {
        type: "string",
        description: 'Repository in "owner/name" format',
        required: false,
      },
      number: {
        type: "number",
        description: "Issue or PR number",
        required: false,
      },
      title: {
        type: "string",
        description: "Issue title (create, update)",
        required: false,
      },
      body: {
        type: "string",
        description: "Issue body or comment text",
        required: false,
      },
      state: {
        type: "string",
        description:
          'Filter state: "open", "closed", "all" (list) or new state (update)',
        required: false,
      },
      labels: {
        type: "string",
        description: "Comma-separated labels (list, create, update)",
        required: false,
      },
      assignees: {
        type: "string",
        description: "Comma-separated assignees (update)",
        required: false,
      },
      sort: {
        type: "string",
        description: 'Sort by: "created", "updated", "comments" (list)',
        required: false,
      },
      direction: {
        type: "string",
        description: 'Sort direction: "asc", "desc"',
        required: false,
      },
      per_page: {
        type: "number",
        description: "Results per page",
        required: false,
      },
    },
  };
}

// ── Actions & Search ────────────────────────────────────────────────

function buildGitHubActionsDef(): ToolDefinition {
  return {
    name: "github_actions",
    description:
      "CI/CD and search operations. Actions: list_runs, cancel_run, trigger_workflow, search_code, search_issues.\n" +
      "- list_runs: list workflow runs. Params: repo (required), workflow?, branch?, per_page?\n" +
      "- cancel_run: cancel workflow run. Params: repo (required), run_id (required)\n" +
      "- trigger_workflow: trigger workflow. Params: repo (required), workflow (required), ref (required), inputs?\n" +
      "- search_code: search code. Params: query (required), per_page?\n" +
      "- search_issues: search issues/PRs. Params: query (required), per_page?, sort?, order?",
    parameters: {
      action: {
        type: "string",
        description:
          "The operation: list_runs, cancel_run, trigger_workflow, search_code, search_issues",
        required: true,
      },
      repo: {
        type: "string",
        description: 'Repository in "owner/name" format',
        required: false,
      },
      workflow: {
        type: "string",
        description: "Workflow filename or ID (list_runs, trigger_workflow)",
        required: false,
      },
      branch: {
        type: "string",
        description: "Branch filter (list_runs)",
        required: false,
      },
      ref: {
        type: "string",
        description: "Git ref for workflow dispatch (trigger_workflow)",
        required: false,
      },
      run_id: {
        type: "number",
        description: "Workflow run ID (cancel_run)",
        required: false,
      },
      inputs: {
        type: "object",
        description: "Workflow dispatch inputs (trigger_workflow)",
        required: false,
      },
      query: {
        type: "string",
        description: "Search query (search_code, search_issues)",
        required: false,
      },
      sort: {
        type: "string",
        description:
          'Sort by: "comments", "reactions", "created", "updated" (search_issues)',
        required: false,
      },
      order: {
        type: "string",
        description: 'Sort order: "asc", "desc" (search_issues)',
        required: false,
      },
      per_page: {
        type: "number",
        description: "Results per page",
        required: false,
      },
    },
  };
}

// ── Public API ──────────────────────────────────────────────────────

/** Get all 4 consolidated GitHub tool definitions. */
export function getGitHubToolDefinitions(): readonly ToolDefinition[] {
  return [
    buildGitHubReposDef(),
    buildGitHubPullsDef(),
    buildGitHubIssuesDef(),
    buildGitHubActionsDef(),
  ];
}

/** System prompt section explaining GitHub tools to the LLM. */
export const GITHUB_TOOLS_SYSTEM_PROMPT = `## GitHub Access

GitHub authentication is already configured. Do NOT use secret_save or secret_list for GitHub — call the github_* tools directly.
The \`repo\` parameter uses "owner/name" format (e.g. "octocat/Hello-World").
Repository visibility determines classification: public→PUBLIC, private→CONFIDENTIAL, internal→INTERNAL.
Accessing private repos escalates session taint. Never narrate intent — just call the tools directly.

Available tools:
- \`github_repos\`: action = list | get | read_file | list_commits | list_branches | create_branch | delete_branch | clone | pull
- \`github_pulls\`: action = list | get | create | update | list_files | review | merge
- \`github_issues\`: action = list | get | create | update | list_comments | add_comment
- \`github_actions\`: action = list_runs | cancel_run | trigger_workflow | search_code | search_issues

**Efficient querying:** Use \`sort: "updated"\` with \`direction: "desc"\` and \`per_page: 5\` to get the latest activity without fetching everything. Only increase per_page when the user asks for more.`;
