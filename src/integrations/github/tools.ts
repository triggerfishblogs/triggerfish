/**
 * GitHub tool executor for the agent.
 *
 * Creates a chain-compatible executor for the 4 consolidated `github_*`
 * tools. Each tool dispatches on the `action` parameter to the
 * domain-specific handler from repos/, pulls/, issues/, actions/.
 *
 * @module
 */

import { join } from "@std/path";
import type { GitHubToolContext } from "./tools_shared.ts";
import {
  executeCloneRepo,
  executeCreateBranch,
  executeDeleteBranch,
  executeGetRepo,
  executeListBranches,
  executeListCommits,
  executeListRepos,
  executePullRepo,
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

// ─── Tool dispatch maps ─────────────────────────────────────────────────────

/** Map of action name to handler function. */
type ToolHandler = (
  client: GitHubToolContext["client"],
  input: Record<string, unknown>,
) => Promise<string>;

/** Repos domain: action → handler. */
const REPOS_ACTIONS: Readonly<Record<string, ToolHandler>> = {
  list: executeListRepos,
  get: executeGetRepo,
  read_file: executeReadFile,
  list_commits: executeListCommits,
  list_branches: executeListBranches,
  create_branch: executeCreateBranch,
  delete_branch: executeDeleteBranch,
  clone: executeCloneRepo,
  pull: executePullRepo,
};

/** Pulls domain: action → handler. */
const PULLS_ACTIONS: Readonly<Record<string, ToolHandler>> = {
  list: executeListPulls,
  get: executeGetPull,
  create: executeCreatePull,
  update: executeUpdatePull,
  list_files: executeListPullFiles,
  review: executeReviewPull,
  merge: executeMergePull,
};

/** Issues domain: action → handler. */
const ISSUES_ACTIONS: Readonly<Record<string, ToolHandler>> = {
  list: executeListIssues,
  get: executeGetIssue,
  create: executeCreateIssue,
  update: executeUpdateIssue,
  list_comments: executeListComments,
  add_comment: executeAddComment,
};

/** Actions/search domain: action → handler. */
const ACTIONS_ACTIONS: Readonly<Record<string, ToolHandler>> = {
  list_runs: executeListRuns,
  cancel_run: executeCancelRun,
  trigger_workflow: executeTriggerWorkflow,
  search_code: executeSearchCode,
  search_issues: executeSearchIssues,
};

/** Tool name → action dispatch map. */
const TOOL_ACTION_MAPS: Readonly<
  Record<string, Readonly<Record<string, ToolHandler>>>
> = {
  github_repos: REPOS_ACTIONS,
  github_pulls: PULLS_ACTIONS,
  github_issues: ISSUES_ACTIONS,
  github_actions: ACTIONS_ACTIONS,
};

// ─── Path Resolution ─────────────────────────────────────────────────────────

/** Actions whose `path` input refers to a local filesystem location. */
const LOCAL_PATH_ACTIONS = new Set(["clone", "pull"]);

/** Resolve local path inputs to absolute workspace paths for clone/pull actions. */
function resolveLocalPathInput(
  action: string,
  input: Record<string, unknown>,
  workspacePath: string,
): Record<string, unknown> {
  if (!LOCAL_PATH_ACTIONS.has(action)) return input;
  const path = input.path;
  if (typeof path !== "string" || path.length === 0) return input;
  return { ...input, path: join(workspacePath, path) };
}

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
    const actionMap = TOOL_ACTION_MAPS[name];
    if (!actionMap) return null;

    if (!ctx) {
      return "GitHub is not configured. Set up a GitHub token to use GitHub tools.";
    }

    const action = input.action;
    if (typeof action !== "string" || action.length === 0) {
      return `Error: ${name} requires an 'action' parameter (string).`;
    }

    const handler = actionMap[action];
    if (!handler) {
      const valid = Object.keys(actionMap).join(", ");
      return `Error: unknown action "${action}" for ${name}. Valid actions: ${valid}`;
    }

    const resolvedInput = ctx.workspacePath
      ? resolveLocalPathInput(action, input, ctx.workspacePath)
      : input;

    return handler(ctx.client, resolvedInput);
  };
}
