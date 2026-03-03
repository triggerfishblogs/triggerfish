/**
 * GitHub issue tool definitions.
 *
 * Defines the 6 issue tool schemas: list, get, create, update, comment, list_comments.
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

/** Build the github_list_issues tool definition. */
export function buildListIssuesDef(): ToolDefinition {
  return {
    name: "github_list_issues",
    description:
      "List issues for a repository. Returns issue number, title, state, labels, and author.",
    parameters: buildIssuesListParams(),
  };
}

/** Build the github_get_issue tool definition. */
export function buildGetIssueDef(): ToolDefinition {
  return {
    name: "github_get_issue",
    description:
      "Get a single issue by number. Returns full details including body, assignees, milestone, and labels.",
    parameters: {
      repo: {
        type: "string",
        description: 'Repository in "owner/name" format',
        required: true,
      },
      number: {
        type: "number",
        description: "Issue number",
        required: true,
      },
    },
  };
}

/** Build the github_create_issue tool definition. */
export function buildCreateIssueDef(): ToolDefinition {
  return {
    name: "github_create_issue",
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

/** Build the github_update_issue tool definition. */
export function buildUpdateIssueDef(): ToolDefinition {
  return {
    name: "github_update_issue",
    description:
      "Update an existing issue. Can change title, body, state, labels, and assignees.",
    parameters: {
      repo: {
        type: "string",
        description: 'Repository in "owner/name" format',
        required: true,
      },
      number: {
        type: "number",
        description: "Issue number",
        required: true,
      },
      title: { type: "string", description: "New issue title" },
      body: { type: "string", description: "New issue body (markdown)" },
      state: {
        type: "string",
        description: 'Set state: "open" or "closed"',
      },
      labels: {
        type: "string",
        description: "Comma-separated list of label names (replaces existing)",
      },
      assignees: {
        type: "string",
        description: "Comma-separated list of GitHub usernames to assign",
      },
    },
  };
}

/** Build the github_list_comments tool definition. */
export function buildListCommentsDef(): ToolDefinition {
  return {
    name: "github_list_comments",
    description:
      "List comments on an issue or pull request. Returns comment author, body, and date.",
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
      per_page: {
        type: "number",
        description: "Number of comments to return (default: 30)",
      },
      direction: {
        type: "string",
        description:
          'Sort direction: "asc" (oldest first, default) or "desc" (newest first). Use "desc" when you only need the latest comments.',
        enum: ["asc", "desc"],
      },
    },
  };
}

/** Build the github_add_comment tool definition. */
export function buildAddCommentDef(): ToolDefinition {
  return {
    name: "github_add_comment",
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
