/**
 * GitHub tool definitions and system prompt for the agent.
 *
 * Barrel that re-exports the 14 tool schemas across repos, pulls,
 * issues, actions, and search from their dedicated per-domain modules.
 *
 * @module
 */

import type { ToolDefinition } from "../../core/types/tool.ts";

import {
  buildReposListDef,
  buildReposReadFileDef,
  buildReposCommitsDef,
} from "./repos/mod.ts";

import {
  buildPullsListDef,
  buildPullsCreateDef,
  buildPullsReviewDef,
  buildPullsMergeDef,
} from "./pulls/mod.ts";

import {
  buildIssuesListDef,
  buildIssuesCreateDef,
  buildIssuesCommentDef,
} from "./issues/mod.ts";

import {
  buildActionsRunsDef,
  buildActionsTriggerDef,
  buildSearchCodeDef,
  buildSearchIssuesDef,
} from "./actions/mod.ts";

// ── Public API ──

/** Get all 14 GitHub tool definitions. */
export function getGitHubToolDefinitions(): readonly ToolDefinition[] {
  return [
    buildReposListDef(),
    buildReposReadFileDef(),
    buildReposCommitsDef(),
    buildPullsListDef(),
    buildPullsCreateDef(),
    buildPullsReviewDef(),
    buildPullsMergeDef(),
    buildIssuesListDef(),
    buildIssuesCreateDef(),
    buildIssuesCommentDef(),
    buildActionsRunsDef(),
    buildActionsTriggerDef(),
    buildSearchCodeDef(),
    buildSearchIssuesDef(),
  ];
}

/** System prompt section explaining GitHub tools to the LLM. */
export const GITHUB_TOOLS_SYSTEM_PROMPT = `## GitHub Access

You have access to GitHub via 14 github_* tools: repos, PRs, issues, Actions, and search.

- The \`repo\` parameter always uses "owner/name" format (e.g. "octocat/Hello-World").
- Repository visibility determines security classification: public→PUBLIC, private→CONFIDENTIAL, internal→INTERNAL.
- Accessing private repos escalates session taint — be mindful of classification boundaries.
- Write operations (create PR, merge, create issue, comment, trigger workflow, submit review) require appropriate permissions on the GitHub token.
- Use github_search_code and github_search_issues for cross-repo discovery.
- Never narrate your intent to use GitHub tools — just call them directly.`;
