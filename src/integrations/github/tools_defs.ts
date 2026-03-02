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
  buildCloneRepoDef,
  buildCreateBranchDef,
  buildDeleteBranchDef,
  buildGetRepoDef,
  buildListBranchesDef,
  buildListCommitsDef,
  buildListReposDef,
  buildReadFileDef,
} from "./repos/mod.ts";

import {
  buildCreatePullDef,
  buildGetPullDef,
  buildListPullFilesDef,
  buildListPullsDef,
  buildMergePullDef,
  buildReviewPullDef,
  buildUpdatePullDef,
} from "./pulls/mod.ts";

import {
  buildAddCommentDef,
  buildCreateIssueDef,
  buildGetIssueDef,
  buildListCommentsDef,
  buildListIssuesDef,
  buildUpdateIssueDef,
} from "./issues/mod.ts";

import {
  buildCancelRunDef,
  buildListRunsDef,
  buildSearchCodeDef,
  buildSearchIssuesDef,
  buildTriggerWorkflowDef,
} from "./actions/mod.ts";

// ── Public API ──

/** Get all 26 GitHub tool definitions. */
export function getGitHubToolDefinitions(): readonly ToolDefinition[] {
  return [
    buildListReposDef(),
    buildGetRepoDef(),
    buildReadFileDef(),
    buildListCommitsDef(),
    buildListBranchesDef(),
    buildCreateBranchDef(),
    buildDeleteBranchDef(),
    buildCloneRepoDef(),
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

GitHub authentication is already configured. Do NOT use secret_save for GitHub — call the github_* tools directly.
The \`repo\` parameter uses "owner/name" format (e.g. "octocat/Hello-World").
Repository visibility determines classification: public→PUBLIC, private→CONFIDENTIAL, internal→INTERNAL.
Accessing private repos escalates session taint. Never narrate intent — just call the tools directly.`;
