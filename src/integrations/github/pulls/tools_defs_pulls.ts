/**
 * GitHub pull request tool definitions.
 *
 * Defines the 7 pull request tool schemas: list, get, create, update, review, merge, list_files.
 *
 * @module
 */

import type { ToolDefinition } from "../../../core/types/tool.ts";

/** Build the github_list_pulls tool definition. */
export function buildListPullsDef(): ToolDefinition {
  return {
    name: "github_list_pulls",
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

/** Build the github_get_pull tool definition. */
export function buildGetPullDef(): ToolDefinition {
  return {
    name: "github_get_pull",
    description:
      "Get a single pull request by number. Returns full details including body, diff stats, and mergeable state.",
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
    },
  };
}

/** Build the github_create_pull tool definition. */
export function buildCreatePullDef(): ToolDefinition {
  return {
    name: "github_create_pull",
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

/** Build the github_update_pull tool definition. */
export function buildUpdatePullDef(): ToolDefinition {
  return {
    name: "github_update_pull",
    description:
      "Update a pull request. Can change title, body, base branch, or state.",
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
      title: { type: "string", description: "New PR title" },
      body: { type: "string", description: "New PR description (markdown)" },
      base: { type: "string", description: "New base branch" },
      state: {
        type: "string",
        description: 'Set state: "open" or "closed"',
      },
    },
  };
}

/** Build the github_list_pull_files tool definition. */
export function buildListPullFilesDef(): ToolDefinition {
  return {
    name: "github_list_pull_files",
    description:
      "List files changed in a pull request. Returns filename, status, additions, and deletions.",
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
      per_page: {
        type: "number",
        description: "Number of files to return (default: 30)",
      },
    },
  };
}

/** Build the parameter schema for the pulls_review tool. */
function buildPullsReviewParams(): ToolDefinition["parameters"] {
  return {
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
  };
}

/** Build the github_review_pull tool definition. */
export function buildReviewPullDef(): ToolDefinition {
  return {
    name: "github_review_pull",
    description:
      "Submit a review on a pull request. Events: APPROVE, REQUEST_CHANGES, COMMENT.",
    parameters: buildPullsReviewParams(),
  };
}

/** Build the parameter schema for the pulls_merge tool. */
function buildPullsMergeParams(): ToolDefinition["parameters"] {
  return {
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
  };
}

/** Build the github_merge_pull tool definition. */
export function buildMergePullDef(): ToolDefinition {
  return {
    name: "github_merge_pull",
    description:
      "Merge a pull request. Supports merge, squash, or rebase methods.",
    parameters: buildPullsMergeParams(),
  };
}
