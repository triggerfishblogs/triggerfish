/**
 * GitHub plugin — REST API access with classification-gated taint propagation.
 *
 * Provides tools for repos, PRs, issues, Actions, and code search.
 * Repo visibility maps to classification levels (public→PUBLIC,
 * private→CONFIDENTIAL, internal→INTERNAL).
 *
 * @module
 */

export type {
  GitHubRepo,
  GitHubFileContent,
  GitHubCommit,
  GitHubPull,
  GitHubIssue,
  GitHubWorkflowRun,
  GitHubCodeSearchItem,
  GitHubIssueSearchItem,
  GitHubError,
  GitHubClassificationConfig,
  RepoVisibility,
} from "./types.ts";

export type { GitHubClientConfig, GitHubClient } from "./client.ts";

export { createGitHubClient, visibilityToClassification } from "./client.ts";

export type { ResolveGitHubTokenOptions } from "./auth.ts";

export { resolveGitHubToken } from "./auth.ts";

export type { GitHubToolContext } from "./tools.ts";

export {
  getGitHubToolDefinitions,
  createGitHubToolExecutor,
  GITHUB_TOOLS_SYSTEM_PROMPT,
} from "./tools.ts";
