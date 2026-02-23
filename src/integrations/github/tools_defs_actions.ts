/**
 * GitHub Actions and search tool definitions.
 *
 * Defines the 4 tool schemas: actions_runs, actions_trigger,
 * search_code, search_issues.
 *
 * @module
 */

import type { ToolDefinition } from "../../core/types/tool.ts";

/** Build the github_actions_runs tool definition. */
export function buildActionsRunsDef(): ToolDefinition {
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

/** Build the parameter schema for the actions_trigger tool. */
function buildActionsTriggerParams(): ToolDefinition["parameters"] {
  return {
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
  };
}

/** Build the github_actions_trigger tool definition. */
export function buildActionsTriggerDef(): ToolDefinition {
  return {
    name: "github_actions_trigger",
    description:
      "Trigger a GitHub Actions workflow via workflow_dispatch event.",
    parameters: buildActionsTriggerParams(),
  };
}

/** Build the github_search_code tool definition. */
export function buildSearchCodeDef(): ToolDefinition {
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

/** Build the github_search_issues tool definition. */
export function buildSearchIssuesDef(): ToolDefinition {
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
