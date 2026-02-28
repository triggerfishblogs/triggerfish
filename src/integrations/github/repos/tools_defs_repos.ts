/**
 * GitHub repository tool definitions.
 *
 * Defines the 7 repository tool schemas: list, get, read_file, commits, branches, create_branch, delete_branch.
 *
 * @module
 */

import type { ToolDefinition } from "../../../core/types/tool.ts";

/** Build the github_list_repos tool definition. */
export function buildListReposDef(): ToolDefinition {
  return {
    name: "github_list_repos",
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

/** Build the github_get_repo tool definition. */
export function buildGetRepoDef(): ToolDefinition {
  return {
    name: "github_get_repo",
    description:
      "Get detailed info about a repository. Returns description, language, clone URLs, stars, forks, and topics.",
    parameters: {
      repo: {
        type: "string",
        description: 'Repository in "owner/name" format',
        required: true,
      },
    },
  };
}

/** Build the github_read_file tool definition. */
export function buildReadFileDef(): ToolDefinition {
  return {
    name: "github_read_file",
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

/** Build the github_list_commits tool definition. */
export function buildListCommitsDef(): ToolDefinition {
  return {
    name: "github_list_commits",
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

/** Build the github_list_branches tool definition. */
export function buildListBranchesDef(): ToolDefinition {
  return {
    name: "github_list_branches",
    description:
      "List branches for a repository. Returns branch name and protection status.",
    parameters: {
      repo: {
        type: "string",
        description: 'Repository in "owner/name" format',
        required: true,
      },
      per_page: {
        type: "number",
        description: "Number of branches to return (default: 30)",
      },
    },
  };
}

/** Build the github_create_branch tool definition. */
export function buildCreateBranchDef(): ToolDefinition {
  return {
    name: "github_create_branch",
    description:
      "Create a new branch from a specific commit SHA.",
    parameters: {
      repo: {
        type: "string",
        description: 'Repository in "owner/name" format',
        required: true,
      },
      branch: {
        type: "string",
        description: "New branch name",
        required: true,
      },
      sha: {
        type: "string",
        description: "Commit SHA to branch from",
        required: true,
      },
    },
  };
}

/** Build the github_delete_branch tool definition. */
export function buildDeleteBranchDef(): ToolDefinition {
  return {
    name: "github_delete_branch",
    description:
      "Delete a branch from a repository.",
    parameters: {
      repo: {
        type: "string",
        description: 'Repository in "owner/name" format',
        required: true,
      },
      branch: {
        type: "string",
        description: "Branch name to delete",
        required: true,
      },
    },
  };
}
