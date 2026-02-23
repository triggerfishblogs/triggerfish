/**
 * GitHub REST API HTTP infrastructure.
 *
 * Low-level request handling, raw API types, and shared helpers used by
 * all domain-specific client modules (repos, pulls, issues, workflows, search).
 *
 * @module
 */

import type {
  ClassificationLevel,
  Result,
} from "../../core/types/classification.ts";
import type { GitHubError, RepoVisibility } from "./types.ts";

// ─── Shared function signatures ──────────────────────────────────────────────

/** Authenticated API request function signature. */
export type ApiRequestFn = <T>(
  path: string,
  options?: {
    readonly method?: string;
    readonly body?: unknown;
  },
) => Promise<Result<{ data: T; repoVisibility?: RepoVisibility }, GitHubError>>;

/** Classification function signature. */
export type ClassifyRepoFn = (
  visibility: string | undefined,
  fullName: string,
) => ClassificationLevel;

// ─── Raw API types (snake_case matching GitHub REST API) ─────────────────────

export interface RawRepo {
  readonly id: number;
  readonly full_name: string;
  readonly description?: string | null;
  readonly visibility?: string;
  readonly private: boolean;
  readonly default_branch: string;
  readonly html_url: string;
}

export interface RawContent {
  readonly path: string;
  readonly content: string;
  readonly sha: string;
  readonly size: number;
  readonly html_url: string;
}

export interface RawCommit {
  readonly sha: string;
  readonly commit: {
    readonly message: string;
    readonly author?: { readonly name?: string; readonly date?: string };
  };
  readonly author?: { readonly login?: string };
  readonly html_url: string;
}

export interface RawPull {
  readonly number: number;
  readonly title: string;
  readonly state: string;
  readonly user?: { readonly login?: string };
  readonly head: { readonly ref: string };
  readonly base: { readonly ref: string };
  readonly html_url: string;
  readonly created_at: string;
}

export interface RawIssue {
  readonly number: number;
  readonly title: string;
  readonly state: string;
  readonly user?: { readonly login?: string };
  readonly body?: string | null;
  readonly html_url: string;
  readonly created_at: string;
  readonly labels?: readonly (string | { readonly name?: string })[];
}

export interface RawWorkflowRun {
  readonly id: number;
  readonly name?: string;
  readonly status: string;
  readonly conclusion?: string | null;
  readonly head_branch: string;
  readonly html_url: string;
  readonly created_at: string;
}

export interface RawCodeSearchItem {
  readonly path: string;
  readonly html_url: string;
  readonly repository: {
    readonly full_name: string;
    readonly visibility?: string;
    readonly private: boolean;
  };
  readonly text_matches?: readonly { readonly fragment?: string }[];
}

export interface RawIssueSearchItem {
  readonly number: number;
  readonly title: string;
  readonly state: string;
  readonly html_url: string;
  readonly repository_url?: string;
}

// ─── Shared helpers ──────────────────────────────────────────────────────────

/** Build the URL-encoded repo path prefix. */
export function buildRepoPath(owner: string, repo: string): string {
  return `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`;
}

/** Extract visibility from a raw repo object. */
export function extractRepoVisibility(raw: RawRepo): string {
  return raw.visibility ?? (raw.private ? "private" : "public");
}

/** Fetch classification for a repo by querying its metadata. */
export async function fetchRepoClassification(
  apiRequest: ApiRequestFn,
  classifyRepo: ClassifyRepoFn,
  owner: string,
  repo: string,
): Promise<ClassificationLevel> {
  const repoResult = await apiRequest<RawRepo>(buildRepoPath(owner, repo));
  if (!repoResult.ok) return "CONFIDENTIAL" as ClassificationLevel;
  const raw = repoResult.value.data;
  return classifyRepo(
    raw.visibility ?? (raw.private ? "private" : "public"),
    raw.full_name,
  );
}

// ─── API request infrastructure ──────────────────────────────────────────────

/** Context needed by the API request function. */
export interface GitHubApiContext {
  readonly baseUrl: string;
  readonly token: string;
  readonly doFetch: typeof fetch;
}

/** Build standard GitHub API headers. */
function buildApiHeaders(
  token: string,
  hasBody: boolean,
): Record<string, string> {
  const headers: Record<string, string> = {
    "Accept": "application/vnd.github+json",
    "Authorization": `Bearer ${token}`,
    "X-GitHub-Api-Version": "2022-11-28",
  };
  if (hasBody) {
    headers["Content-Type"] = "application/json";
  }
  return headers;
}

/** Parse an error response from the GitHub API. */
async function parseGitHubErrorResponse(
  response: Response,
  rateLimitRemaining?: number,
  rateLimitReset?: number,
): Promise<GitHubError> {
  let message: string;
  try {
    const body = (await response.json()) as { message?: string };
    message = body.message ?? `HTTP ${response.status}`;
  } catch {
    message = `HTTP ${response.status}`;
  }
  return {
    status: response.status,
    message,
    rateLimitRemaining,
    rateLimitReset,
  };
}

/** Extract rate limit headers from a response. */
function extractRateLimitHeaders(
  response: Response,
): { remaining?: number; reset?: number } {
  const remaining = response.headers.get("x-ratelimit-remaining")
    ? Number(response.headers.get("x-ratelimit-remaining"))
    : undefined;
  const reset = response.headers.get("x-ratelimit-reset")
    ? Number(response.headers.get("x-ratelimit-reset"))
    : undefined;
  return { remaining, reset };
}

/** Build an error Result for a network-level failure. */
function buildNetworkErrorResult<T>(
  err: unknown,
): Result<{ data: T; repoVisibility?: RepoVisibility }, GitHubError> {
  return {
    ok: false,
    error: {
      status: 0,
      message: `Request failed: ${
        err instanceof Error ? err.message : String(err)
      }`,
    },
  };
}

/** Handle a non-OK HTTP response from the GitHub API. */
async function handleGitHubErrorResponse<T>(
  response: Response,
  rateLimit: { remaining?: number; reset?: number },
): Promise<Result<{ data: T; repoVisibility?: RepoVisibility }, GitHubError>> {
  const error = await parseGitHubErrorResponse(
    response,
    rateLimit.remaining,
    rateLimit.reset,
  );
  return { ok: false, error };
}

/** Parse a successful JSON response body. */
async function parseGitHubJsonResponse<T>(
  response: Response,
): Promise<Result<{ data: T; repoVisibility?: RepoVisibility }, GitHubError>> {
  if (response.status === 204) {
    return { ok: true, value: { data: undefined as unknown as T } };
  }
  try {
    const data = (await response.json()) as T;
    return { ok: true, value: { data } };
  } catch {
    return {
      ok: false,
      error: {
        status: response.status,
        message: "Response JSON parse failed",
      },
    };
  }
}

/** Send an authenticated request to the GitHub REST API. */
export async function sendGitHubApiRequest<T>(
  ctx: GitHubApiContext,
  path: string,
  options?: {
    readonly method?: string;
    readonly body?: unknown;
  },
): Promise<
  Result<{ data: T; repoVisibility?: RepoVisibility }, GitHubError>
> {
  const url = `${ctx.baseUrl}${path}`;
  const headers = buildApiHeaders(ctx.token, !!options?.body);

  let response: Response;
  try {
    response = await ctx.doFetch(url, {
      method: options?.method ?? "GET",
      headers,
      body: options?.body ? JSON.stringify(options.body) : undefined,
    });
  } catch (err) {
    return buildNetworkErrorResult<T>(err);
  }

  const rateLimit = extractRateLimitHeaders(response);
  if (!response.ok) {
    return handleGitHubErrorResponse<T>(response, rateLimit);
  }
  return parseGitHubJsonResponse<T>(response);
}
