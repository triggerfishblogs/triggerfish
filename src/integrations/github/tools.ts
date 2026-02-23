/**
 * GitHub tool executor for the agent.
 *
 * Creates a chain-compatible executor for the 14 `github_*` tools.
 * Tool definitions live in `tools_defs.ts`; domain-specific handlers
 * live in `tools_repos.ts`, `tools_pulls.ts`, `tools_issues.ts`,
 * `tools_actions.ts`, and `tools_search.ts`.
 *
 * @module
 */

import type { GitHubToolContext } from "./tools_shared.ts";
import { executeReposList, executeReposReadFile, executeReposCommits } from "./repos/mod.ts";
import { executePullsList, executePullsCreate, executePullsReview, executePullsMerge } from "./pulls/mod.ts";
import { executeIssuesList, executeIssuesCreate, executeIssuesComment } from "./issues/mod.ts";
import { executeActionsRuns, executeActionsTrigger } from "./actions/mod.ts";
import { executeSearchCode, executeSearchIssues } from "./actions/mod.ts";

// ─── Re-exports ──────────────────────────────────────────────────────────────

export type { GitHubToolContext } from "./tools_shared.ts";
export { getGitHubToolDefinitions, GITHUB_TOOLS_SYSTEM_PROMPT } from "./tools_defs.ts";

// ─── Tool dispatch map ──────────────────────────────────────────────────────

/** Map of tool name to handler function. */
type ToolHandler = (
  client: GitHubToolContext["client"],
  input: Record<string, unknown>,
) => Promise<string>;

/** Registry mapping each github_* tool name to its handler. */
const TOOL_HANDLERS: Readonly<Record<string, ToolHandler>> = {
  github_repos_list: executeReposList,
  github_repos_read_file: executeReposReadFile,
  github_repos_commits: executeReposCommits,
  github_pulls_list: executePullsList,
  github_pulls_create: executePullsCreate,
  github_pulls_review: executePullsReview,
  github_pulls_merge: executePullsMerge,
  github_issues_list: executeIssuesList,
  github_issues_create: executeIssuesCreate,
  github_issues_comment: executeIssuesComment,
  github_actions_runs: executeActionsRuns,
  github_actions_trigger: executeActionsTrigger,
  github_search_code: executeSearchCode,
  github_search_issues: executeSearchIssues,
};

// ─── Executor ────────────────────────────────────────────────────────────────

/**
 * Create a tool executor for GitHub tools.
 *
 * Returns null for unknown tool names (allowing chaining with other executors).
 * Returns a graceful error message if ctx is undefined (GitHub not configured).
 */
export function createGitHubToolExecutor(
  ctx: GitHubToolContext | undefined,
): (name: string, input: Record<string, unknown>) => Promise<string | null> {
  return async (
    name: string,
    input: Record<string, unknown>,
  ): Promise<string | null> => {
    if (!name.startsWith("github_")) {
      return null;
    }

    if (!ctx) {
      return "GitHub is not configured. Set up a GitHub token to use GitHub tools.";
    }

    const handler = TOOL_HANDLERS[name];
    if (!handler) {
      return null;
    }

    return handler(ctx.client, input);
  };
}
