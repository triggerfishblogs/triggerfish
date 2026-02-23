/**
 * GitHub issue tool definitions.
 *
 * Defines the 3 issue tool schemas: list, create, comment.
 *
 * @module
 */

import type { ToolDefinition } from "../../../core/types/tool.ts";

/** Build the parameter schema for the issues_list tool. */
function buildIssuesListParams(): ToolDefinition["parameters"] {
  return {
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
  };
}

/** Build the github_issues_list tool definition. */
export function buildIssuesListDef(): ToolDefinition {
  return {
    name: "github_issues_list",
    description:
      "List issues for a repository. Returns issue number, title, state, labels, and author.",
    parameters: buildIssuesListParams(),
  };
}

/** Build the github_issues_create tool definition. */
export function buildIssuesCreateDef(): ToolDefinition {
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

/** Build the github_issues_comment tool definition. */
export function buildIssuesCommentDef(): ToolDefinition {
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
