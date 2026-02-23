/**
 * Shared types and helpers for GitHub tool executors.
 *
 * Contains the GitHubToolContext interface, repo string parser,
 * and API error formatter used by all domain-specific tool modules.
 *
 * @module
 */

import type { ClassificationLevel } from "../../core/types/classification.ts";
import type { SessionId } from "../../core/types/session.ts";
import type { GitHubClient } from "./client.ts";

// ─── Context ─────────────────────────────────────────────────────────────────

/** Context required by the GitHub tool executor. */
export interface GitHubToolContext {
  readonly client: GitHubClient;
  readonly sessionTaint: ClassificationLevel;
  readonly sourceSessionId: SessionId;
}

// ─── Repo Parsing ────────────────────────────────────────────────────────────

/** Parsed owner/name pair from a repo string. */
export interface RepoParts {
  readonly owner: string;
  readonly name: string;
}

/**
 * Parse an "owner/name" repo string into a RepoParts object.
 * Returns null if the format is invalid.
 */
export function parseRepoString(repo: string): RepoParts | null {
  const parts = repo.split("/");
  if (parts.length !== 2 || parts[0].length === 0 || parts[1].length === 0) {
    return null;
  }
  return { owner: parts[0], name: parts[1] };
}

// ─── Error Formatting ────────────────────────────────────────────────────────

/** GitHub API error shape used for formatting. */
interface GitHubApiError {
  readonly status: number;
  readonly message: string;
  readonly rateLimitRemaining?: number;
  readonly rateLimitReset?: number;
}

/** Format a GitHub API error into a user-friendly string. */
export function formatGitHubError(error: GitHubApiError): string {
  if (error.status === 403 && error.rateLimitRemaining === 0) {
    const resetDate = error.rateLimitReset
      ? new Date(error.rateLimitReset * 1000).toISOString()
      : "unknown";
    return `GitHub rate limit exceeded. Resets at ${resetDate}.`;
  }
  return `GitHub API error (${error.status}): ${error.message}`;
}

// ─── Input Validation ────────────────────────────────────────────────────────

/**
 * Validate and parse a repo input parameter.
 * Returns the parsed RepoParts or an error string.
 */
export function validateRepoInput(
  input: Record<string, unknown>,
  toolName: string,
): RepoParts | string {
  const repoStr = input.repo;
  if (typeof repoStr !== "string" || repoStr.length === 0) {
    return `Error: ${toolName} requires a 'repo' argument in "owner/name" format.`;
  }
  const parsed = parseRepoString(repoStr);
  if (!parsed) {
    return 'Error: \'repo\' must be in "owner/name" format.';
  }
  return parsed;
}
