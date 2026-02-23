/**
 * GitHub repository tool definitions.
 *
 * Defines the 3 repository tool schemas: list, read_file, commits.
 *
 * @module
 */

import type { ToolDefinition } from "../../core/types/tool.ts";

/** Build the github_repos_list tool definition. */
export function buildReposListDef(): ToolDefinition {
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

/** Build the github_repos_read_file tool definition. */
export function buildReposReadFileDef(): ToolDefinition {
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

/** Build the github_repos_commits tool definition. */
export function buildReposCommitsDef(): ToolDefinition {
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
