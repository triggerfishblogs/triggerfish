/**
 * GitHub tool executor for the agent.
 *
 * Creates a chain-compatible executor for the 25 `github_*` tools.
 * Tool definitions live in `tools_defs.ts`; domain-specific handlers
 * live in `tools_repos.ts`, `tools_pulls.ts`, `tools_issues.ts`,
 * `tools_actions.ts`, and `tools_search.ts`.
 *
 * @module
 */

import type { GitHubToolContext } from "./tools_shared.ts";
import {
  executeCloneRepo,
  executeCreateBranch,
  executeDeleteBranch,
  executeGetRepo,
  executeListBranches,
  executeListCommits,
  executeListRepos,
  executeReadFile,
} from "./repos/mod.ts";
import {
  executeCreatePull,
  executeGetPull,
  executeListPullFiles,
  executeListPulls,
  executeMergePull,
  executeReviewPull,
  executeUpdatePull,
} from "./pulls/mod.ts";
import {
  executeAddComment,
  executeCreateIssue,
  executeGetIssue,
  executeListComments,
  executeListIssues,
  executeUpdateIssue,
} from "./issues/mod.ts";
import {
  executeCancelRun,
  executeListRuns,
  executeTriggerWorkflow,
} from "./actions/mod.ts";
import { executeSearchCode, executeSearchIssues } from "./actions/mod.ts";

// ─── Re-exports ──────────────────────────────────────────────────────────────

export type { GitHubToolContext } from "./tools_shared.ts";
export {
  getGitHubToolDefinitions,
  GITHUB_TOOLS_SYSTEM_PROMPT,
} from "./tools_defs.ts";

// ─── Tool dispatch map ──────────────────────────────────────────────────────

/** Map of tool name to handler function. */
type ToolHandler = (
  client: GitHubToolContext["client"],
  input: Record<string, unknown>,
) => Promise<string>;

/** Registry mapping each github_* tool name to its handler. */
const TOOL_HANDLERS: Readonly<Record<string, ToolHandler>> = {
  github_list_repos: executeListRepos,
  github_get_repo: executeGetRepo,
  github_read_file: executeReadFile,
  github_list_commits: executeListCommits,
  github_list_branches: executeListBranches,
  github_create_branch: executeCreateBranch,
  github_delete_branch: executeDeleteBranch,
  github_clone_repo: executeCloneRepo,
  github_list_pulls: executeListPulls,
  github_get_pull: executeGetPull,
  github_create_pull: executeCreatePull,
  github_update_pull: executeUpdatePull,
  github_list_pull_files: executeListPullFiles,
  github_review_pull: executeReviewPull,
  github_merge_pull: executeMergePull,
  github_list_issues: executeListIssues,
  github_get_issue: executeGetIssue,
  github_create_issue: executeCreateIssue,
  github_update_issue: executeUpdateIssue,
  github_list_comments: executeListComments,
  github_add_comment: executeAddComment,
  github_list_runs: executeListRuns,
  github_cancel_run: executeCancelRun,
  github_trigger_workflow: executeTriggerWorkflow,
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
  // deno-lint-ignore require-await
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
