/**
 * GitHub tool definitions — repos and pulls domains.
 *
 * @module
 */

import type { ToolDefinition } from "../../core/types/tool.ts";

/** Build the github_repos tool definition. */
export function buildGitHubReposDef(): ToolDefinition {
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

/** Build the github_pulls tool definition. */
export function buildGitHubPullsDef(): ToolDefinition {
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
