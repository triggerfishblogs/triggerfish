/**
 * GitHub pull request tool definitions.
 *
 * Defines the 4 pull request tool schemas: list, create, review, merge.
 *
 * @module
 */

import type { ToolDefinition } from "../../core/types/tool.ts";

/** Build the github_pulls_list tool definition. */
export function buildPullsListDef(): ToolDefinition {
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

/** Build the github_pulls_create tool definition. */
export function buildPullsCreateDef(): ToolDefinition {
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

/** Build the github_pulls_review tool definition. */
export function buildPullsReviewDef(): ToolDefinition {
  return {
    name: "github_pulls_review",
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

/** Build the github_pulls_merge tool definition. */
export function buildPullsMergeDef(): ToolDefinition {
  return {
    name: "github_pulls_merge",
    description:
      "Merge a pull request. Supports merge, squash, or rebase methods.",
    parameters: buildPullsMergeParams(),
  };
}
