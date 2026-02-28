/**
 * GitHub tool definitions and system prompt for the agent.
 *
 * Barrel that re-exports the 25 tool schemas across repos, pulls,
 * issues, actions, and search from their dedicated per-domain modules.
 *
 * @module
 */

import type { ToolDefinition } from "../../core/types/tool.ts";

import {
  buildListReposDef,
  buildGetRepoDef,
  buildReadFileDef,
  buildListCommitsDef,
  buildListBranchesDef,
  buildCreateBranchDef,
  buildDeleteBranchDef,
} from "./repos/mod.ts";

import {
  buildListPullsDef,
  buildGetPullDef,
  buildCreatePullDef,
  buildUpdatePullDef,
  buildListPullFilesDef,
  buildReviewPullDef,
  buildMergePullDef,
} from "./pulls/mod.ts";

import {
  buildListIssuesDef,
  buildGetIssueDef,
  buildCreateIssueDef,
  buildUpdateIssueDef,
  buildListCommentsDef,
  buildAddCommentDef,
} from "./issues/mod.ts";

import {
  buildListRunsDef,
  buildCancelRunDef,
  buildTriggerWorkflowDef,
  buildSearchCodeDef,
  buildSearchIssuesDef,
} from "./actions/mod.ts";

// ── Public API ──

/** Get all 25 GitHub tool definitions. */
export function getGitHubToolDefinitions(): readonly ToolDefinition[] {
  return [
    buildListReposDef(),
    buildGetRepoDef(),
    buildReadFileDef(),
    buildListCommitsDef(),
    buildListBranchesDef(),
    buildCreateBranchDef(),
    buildDeleteBranchDef(),
    buildListPullsDef(),
    buildGetPullDef(),
    buildCreatePullDef(),
    buildUpdatePullDef(),
    buildListPullFilesDef(),
    buildReviewPullDef(),
    buildMergePullDef(),
    buildListIssuesDef(),
    buildGetIssueDef(),
    buildCreateIssueDef(),
    buildUpdateIssueDef(),
    buildListCommentsDef(),
    buildAddCommentDef(),
    buildListRunsDef(),
    buildCancelRunDef(),
    buildTriggerWorkflowDef(),
    buildSearchCodeDef(),
    buildSearchIssuesDef(),
  ];
}

/** System prompt section explaining GitHub tools to the LLM. */
export const GITHUB_TOOLS_SYSTEM_PROMPT = `## GitHub Access

You have access to GitHub via 25 github_* tools: repos, PRs, issues, Actions, and search.

- All tool names follow the github_verb_noun pattern (e.g. github_list_repos, github_create_pull).
- The \`repo\` parameter always uses "owner/name" format (e.g. "octocat/Hello-World").
- Repository visibility determines security classification: public→PUBLIC, private→CONFIDENTIAL, internal→INTERNAL.
- Accessing private repos escalates session taint — be mindful of classification boundaries.
- Write operations (create PR, merge, create issue, comment, trigger workflow, submit review) require appropriate permissions on the GitHub token.
- Use github_search_code and github_search_issues for cross-repo discovery.
- Never narrate your intent to use GitHub tools — just call them directly.`;
