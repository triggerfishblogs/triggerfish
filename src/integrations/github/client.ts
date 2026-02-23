/**
 * GitHub REST API client.
 *
 * Wraps the GitHub REST API with typed methods that return `Result<T, GitHubError>`.
 * Supports `fetchFn` injection for testing. Classification is derived from
 * repo visibility via the pure `visibilityToClassification()` function.
 *
 * @module
 */

import type {
  ClassificationLevel,
  Result,
} from "../../core/types/classification.ts";
import type {
  GitHubClassificationConfig,
  GitHubCodeSearchItem,
  GitHubCommit,
  GitHubError,
  GitHubFileContent,
  GitHubIssue,
  GitHubIssueSearchItem,
  GitHubPull,
  GitHubRepo,
  GitHubWorkflowRun,
  RepoVisibility,
} from "./types.ts";

/** Maximum file size (1 MB) for github_repos_read_file. */
const MAX_FILE_SIZE = 1_048_576;

/** Configuration for creating a GitHub client. */
export interface GitHubClientConfig {
  readonly token: string;
  readonly baseUrl?: string;
  readonly fetchFn?: typeof fetch;
  readonly classificationConfig?: GitHubClassificationConfig;
}

/** GitHub API client interface. */
export interface GitHubClient {
  readonly listRepos: (
    opts?: { readonly page?: number; readonly perPage?: number },
  ) => Promise<Result<readonly GitHubRepo[], GitHubError>>;
  readonly readFile: (
    owner: string,
    repo: string,
    path: string,
    ref?: string,
  ) => Promise<Result<GitHubFileContent, GitHubError>>;
  readonly listCommits: (
    owner: string,
    repo: string,
    opts?: { readonly sha?: string; readonly perPage?: number },
  ) => Promise<Result<readonly GitHubCommit[], GitHubError>>;
  readonly listPulls: (
    owner: string,
    repo: string,
    opts?: { readonly state?: string; readonly perPage?: number },
  ) => Promise<Result<readonly GitHubPull[], GitHubError>>;
  readonly createPull: (
    owner: string,
    repo: string,
    title: string,
    head: string,
    base: string,
    body?: string,
  ) => Promise<Result<GitHubPull, GitHubError>>;
  readonly submitReview: (
    owner: string,
    repo: string,
    prNumber: number,
    event: string,
    body: string,
  ) => Promise<
    Result<
      {
        readonly id: number;
        readonly state: string;
        readonly classification: ClassificationLevel;
      },
      GitHubError
    >
  >;
  readonly mergePull: (
    owner: string,
    repo: string,
    prNumber: number,
    opts?: { readonly method?: string; readonly commitTitle?: string },
  ) => Promise<
    Result<
      {
        readonly merged: boolean;
        readonly message: string;
        readonly classification: ClassificationLevel;
      },
      GitHubError
    >
  >;
  readonly listIssues: (
    owner: string,
    repo: string,
    opts?: {
      readonly state?: string;
      readonly labels?: string;
      readonly perPage?: number;
    },
  ) => Promise<Result<readonly GitHubIssue[], GitHubError>>;
  readonly createIssue: (
    owner: string,
    repo: string,
    title: string,
    body?: string,
    labels?: readonly string[],
  ) => Promise<Result<GitHubIssue, GitHubError>>;
  readonly createComment: (
    owner: string,
    repo: string,
    issueNumber: number,
    body: string,
  ) => Promise<
    Result<
      {
        readonly id: number;
        readonly htmlUrl: string;
        readonly classification: ClassificationLevel;
      },
      GitHubError
    >
  >;
  readonly listWorkflowRuns: (
    owner: string,
    repo: string,
    opts?: {
      readonly workflow?: string;
      readonly branch?: string;
      readonly perPage?: number;
    },
  ) => Promise<Result<readonly GitHubWorkflowRun[], GitHubError>>;
  readonly triggerWorkflow: (
    owner: string,
    repo: string,
    workflow: string,
    ref: string,
    inputs?: Readonly<Record<string, string>>,
  ) => Promise<
    Result<
      {
        readonly triggered: boolean;
        readonly classification: ClassificationLevel;
      },
      GitHubError
    >
  >;
  readonly searchCode: (
    query: string,
    opts?: { readonly perPage?: number },
  ) => Promise<Result<readonly GitHubCodeSearchItem[], GitHubError>>;
  readonly searchIssues: (
    query: string,
    opts?: { readonly perPage?: number },
  ) => Promise<Result<readonly GitHubIssueSearchItem[], GitHubError>>;
}

/**
 * Map repo visibility to classification level.
 *
 * Pure function. Checks per-repo overrides first, then falls back to
 * the default visibility mapping:
 * - public -> PUBLIC
 * - internal -> INTERNAL
 * - private -> CONFIDENTIAL
 */
export function visibilityToClassification(
  visibility: RepoVisibility,
  repoFullName: string,
  config?: GitHubClassificationConfig,
): ClassificationLevel {
  if (config?.overrides?.[repoFullName]) {
    return config.overrides[repoFullName];
  }
  switch (visibility) {
    case "public":
      return "PUBLIC";
    case "internal":
      return "INTERNAL";
    case "private":
      return "CONFIDENTIAL";
  }
}

// ─── Raw API types (snake_case matching GitHub REST API) ─────────────────────

interface RawRepo {
  readonly id: number;
  readonly full_name: string;
  readonly description?: string | null;
  readonly visibility?: string;
  readonly private: boolean;
  readonly default_branch: string;
  readonly html_url: string;
}

interface RawContent {
  readonly path: string;
  readonly content: string;
  readonly sha: string;
  readonly size: number;
  readonly html_url: string;
}

interface RawCommit {
  readonly sha: string;
  readonly commit: {
    readonly message: string;
    readonly author?: { readonly name?: string; readonly date?: string };
  };
  readonly author?: { readonly login?: string };
  readonly html_url: string;
}

interface RawPull {
  readonly number: number;
  readonly title: string;
  readonly state: string;
  readonly user?: { readonly login?: string };
  readonly head: { readonly ref: string };
  readonly base: { readonly ref: string };
  readonly html_url: string;
  readonly created_at: string;
}

interface RawIssue {
  readonly number: number;
  readonly title: string;
  readonly state: string;
  readonly user?: { readonly login?: string };
  readonly body?: string | null;
  readonly html_url: string;
  readonly created_at: string;
  readonly labels?: readonly (string | { readonly name?: string })[];
}

interface RawWorkflowRun {
  readonly id: number;
  readonly name?: string;
  readonly status: string;
  readonly conclusion?: string | null;
  readonly head_branch: string;
  readonly html_url: string;
  readonly created_at: string;
}

interface RawCodeSearchItem {
  readonly path: string;
  readonly html_url: string;
  readonly repository: {
    readonly full_name: string;
    readonly visibility?: string;
    readonly private: boolean;
  };
  readonly text_matches?: readonly { readonly fragment?: string }[];
}

interface RawIssueSearchItem {
  readonly number: number;
  readonly title: string;
  readonly state: string;
  readonly html_url: string;
  readonly repository_url?: string;
}

// ─── API context shared by all helper functions ──────────────────────────────

/** Authenticated API request function signature. */
type ApiRequestFn = <T>(
  path: string,
  options?: {
    readonly method?: string;
    readonly body?: unknown;
  },
) => Promise<Result<{ data: T; repoVisibility?: RepoVisibility }, GitHubError>>;

/** Classification function signature. */
type ClassifyRepoFn = (
  visibility: string | undefined,
  fullName: string,
) => ClassificationLevel;

// ─── Shared helpers ──────────────────────────────────────────────────────────

/** Build the URL-encoded repo path prefix. */
function buildRepoPath(owner: string, repo: string): string {
  return `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`;
}

/** Fetch classification for a repo by querying its metadata. */
async function fetchRepoClassification(
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

/** Extract visibility from a raw repo object. */
function extractRepoVisibility(raw: RawRepo): string {
  return raw.visibility ?? (raw.private ? "private" : "public");
}

// ─── Extracted method helpers ────────────────────────────────────────────────

/** Map a raw repo object to a GitHubRepo domain type. */
function mapRawRepoToGitHubRepo(
  r: RawRepo,
  classifyRepo: ClassifyRepoFn,
): GitHubRepo {
  const visibility = extractRepoVisibility(r);
  return {
    id: r.id,
    fullName: r.full_name,
    description: r.description ?? null,
    visibility: visibility as RepoVisibility,
    defaultBranch: r.default_branch,
    htmlUrl: r.html_url,
    classification: classifyRepo(visibility, r.full_name),
  };
}

/** Fetch user repos from the GitHub API. */
async function fetchUserRepos(
  apiRequest: ApiRequestFn,
  classifyRepo: ClassifyRepoFn,
  opts?: { readonly page?: number; readonly perPage?: number },
): Promise<Result<readonly GitHubRepo[], GitHubError>> {
  const params = new URLSearchParams();
  if (opts?.page) params.set("page", String(opts.page));
  params.set("per_page", String(opts?.perPage ?? 30));
  params.set("sort", "updated");

  const result = await apiRequest<readonly RawRepo[]>(
    `/user/repos?${params.toString()}`,
  );
  if (!result.ok) return result;

  const repos = result.value.data.map((r) =>
    mapRawRepoToGitHubRepo(r, classifyRepo)
  );
  return { ok: true, value: repos };
}

/** Decode base64-encoded file content from GitHub. */
function decodeGitHubFileContent(raw: string): string {
  try {
    return atob(raw.replace(/\n/g, ""));
  } catch {
    return raw;
  }
}

/** Fetch a single file from a GitHub repo. */
async function fetchRepoFile(
  apiRequest: ApiRequestFn,
  classifyRepo: ClassifyRepoFn,
  owner: string,
  repo: string,
  path: string,
  ref?: string,
): Promise<Result<GitHubFileContent, GitHubError>> {
  const params = ref ? `?ref=${encodeURIComponent(ref)}` : "";
  const result = await apiRequest<RawContent>(
    `${buildRepoPath(owner, repo)}/contents/${path}${params}`,
  );
  if (!result.ok) return result;

  const raw = result.value.data;
  if (raw.size > MAX_FILE_SIZE) {
    return {
      ok: false,
      error: {
        status: 413,
        message: `File too large: ${raw.size} bytes (max ${MAX_FILE_SIZE})`,
      },
    };
  }

  const classification = await fetchRepoClassification(
    apiRequest,
    classifyRepo,
    owner,
    repo,
  );
  return {
    ok: true,
    value: {
      path: raw.path,
      content: decodeGitHubFileContent(raw.content),
      sha: raw.sha,
      size: raw.size,
      htmlUrl: raw.html_url,
      classification,
    },
  };
}

/** Map a raw commit to a GitHubCommit domain type. */
function mapRawCommitToGitHubCommit(
  c: RawCommit,
  classification: ClassificationLevel,
): GitHubCommit {
  return {
    sha: c.sha,
    message: c.commit.message,
    author: c.commit.author?.name ?? c.author?.login ?? "unknown",
    date: c.commit.author?.date ?? "",
    htmlUrl: c.html_url,
    classification,
  };
}

/** Fetch commits from a GitHub repo. */
async function fetchRepoCommits(
  apiRequest: ApiRequestFn,
  classifyRepo: ClassifyRepoFn,
  owner: string,
  repo: string,
  opts?: { readonly sha?: string; readonly perPage?: number },
): Promise<Result<readonly GitHubCommit[], GitHubError>> {
  const params = new URLSearchParams();
  if (opts?.sha) params.set("sha", opts.sha);
  params.set("per_page", String(opts?.perPage ?? 20));

  const result = await apiRequest<readonly RawCommit[]>(
    `${buildRepoPath(owner, repo)}/commits?${params.toString()}`,
  );
  if (!result.ok) return result;

  const classification = await fetchRepoClassification(
    apiRequest,
    classifyRepo,
    owner,
    repo,
  );
  const commits = result.value.data.map((c) =>
    mapRawCommitToGitHubCommit(c, classification)
  );
  return { ok: true, value: commits };
}

/** Map a raw pull request to a GitHubPull domain type. */
function mapRawPullToGitHubPull(
  p: RawPull,
  classification: ClassificationLevel,
): GitHubPull {
  return {
    number: p.number,
    title: p.title,
    state: p.state,
    author: p.user?.login ?? "unknown",
    headRef: p.head.ref,
    baseRef: p.base.ref,
    htmlUrl: p.html_url,
    createdAt: p.created_at,
    classification,
  };
}

/** Fetch pull requests from a GitHub repo. */
async function fetchRepoPulls(
  apiRequest: ApiRequestFn,
  classifyRepo: ClassifyRepoFn,
  owner: string,
  repo: string,
  opts?: { readonly state?: string; readonly perPage?: number },
): Promise<Result<readonly GitHubPull[], GitHubError>> {
  const params = new URLSearchParams();
  params.set("state", opts?.state ?? "open");
  params.set("per_page", String(opts?.perPage ?? 20));

  const result = await apiRequest<readonly RawPull[]>(
    `${buildRepoPath(owner, repo)}/pulls?${params.toString()}`,
  );
  if (!result.ok) return result;

  const classification = await fetchRepoClassification(
    apiRequest,
    classifyRepo,
    owner,
    repo,
  );
  const pulls = result.value.data.map((p) =>
    mapRawPullToGitHubPull(p, classification)
  );
  return { ok: true, value: pulls };
}

/** Create a pull request on a GitHub repo. */
async function submitRepoPullRequest(
  apiRequest: ApiRequestFn,
  classifyRepo: ClassifyRepoFn,
  owner: string,
  repo: string,
  title: string,
  head: string,
  base: string,
  body?: string,
): Promise<Result<GitHubPull, GitHubError>> {
  const result = await apiRequest<RawPull>(
    `${buildRepoPath(owner, repo)}/pulls`,
    { method: "POST", body: { title, head, base, body: body ?? "" } },
  );
  if (!result.ok) return result;

  const classification = await fetchRepoClassification(
    apiRequest,
    classifyRepo,
    owner,
    repo,
  );
  return {
    ok: true,
    value: mapRawPullToGitHubPull(result.value.data, classification),
  };
}

/** Submit a review on a GitHub pull request. */
async function submitPullRequestReview(
  apiRequest: ApiRequestFn,
  classifyRepo: ClassifyRepoFn,
  owner: string,
  repo: string,
  prNumber: number,
  event: string,
  body: string,
): Promise<
  Result<
    {
      readonly id: number;
      readonly state: string;
      readonly classification: ClassificationLevel;
    },
    GitHubError
  >
> {
  const result = await apiRequest<{ id: number; state: string }>(
    `${buildRepoPath(owner, repo)}/pulls/${prNumber}/reviews`,
    { method: "POST", body: { event, body } },
  );
  if (!result.ok) return result;

  const classification = await fetchRepoClassification(
    apiRequest,
    classifyRepo,
    owner,
    repo,
  );
  return {
    ok: true,
    value: {
      id: result.value.data.id,
      state: result.value.data.state,
      classification,
    },
  };
}

/** Build the merge request body. */
function buildMergeRequestBody(
  opts?: { readonly method?: string; readonly commitTitle?: string },
): Record<string, unknown> {
  return {
    merge_method: opts?.method ?? "merge",
    ...(opts?.commitTitle ? { commit_title: opts.commitTitle } : {}),
  };
}

/** Merge a pull request on a GitHub repo. */
async function mergeRepoPullRequest(
  apiRequest: ApiRequestFn,
  classifyRepo: ClassifyRepoFn,
  owner: string,
  repo: string,
  prNumber: number,
  opts?: { readonly method?: string; readonly commitTitle?: string },
): Promise<
  Result<
    {
      readonly merged: boolean;
      readonly message: string;
      readonly classification: ClassificationLevel;
    },
    GitHubError
  >
> {
  const result = await apiRequest<{ merged: boolean; message: string }>(
    `${buildRepoPath(owner, repo)}/pulls/${prNumber}/merge`,
    { method: "PUT", body: buildMergeRequestBody(opts) },
  );
  if (!result.ok) return result;

  const classification = await fetchRepoClassification(
    apiRequest,
    classifyRepo,
    owner,
    repo,
  );
  return {
    ok: true,
    value: {
      merged: result.value.data.merged,
      message: result.value.data.message,
      classification,
    },
  };
}

/** Extract label names from raw issue label data. */
function extractIssueLabels(
  labels?: readonly (string | { readonly name?: string })[],
): readonly string[] {
  return (labels ?? []).map((l) => typeof l === "string" ? l : l.name ?? "");
}

/** Map a raw issue to a GitHubIssue domain type. */
function mapRawIssueToGitHubIssue(
  i: RawIssue,
  classification: ClassificationLevel,
): GitHubIssue {
  return {
    number: i.number,
    title: i.title,
    state: i.state,
    author: i.user?.login ?? "unknown",
    body: i.body ?? null,
    htmlUrl: i.html_url,
    createdAt: i.created_at,
    labels: extractIssueLabels(i.labels),
    classification,
  };
}

/** Fetch issues from a GitHub repo. */
async function fetchRepoIssues(
  apiRequest: ApiRequestFn,
  classifyRepo: ClassifyRepoFn,
  owner: string,
  repo: string,
  opts?: {
    readonly state?: string;
    readonly labels?: string;
    readonly perPage?: number;
  },
): Promise<Result<readonly GitHubIssue[], GitHubError>> {
  const params = new URLSearchParams();
  params.set("state", opts?.state ?? "open");
  if (opts?.labels) params.set("labels", opts.labels);
  params.set("per_page", String(opts?.perPage ?? 20));

  const result = await apiRequest<readonly RawIssue[]>(
    `${buildRepoPath(owner, repo)}/issues?${params.toString()}`,
  );
  if (!result.ok) return result;

  const classification = await fetchRepoClassification(
    apiRequest,
    classifyRepo,
    owner,
    repo,
  );
  const issues = result.value.data.map((i) =>
    mapRawIssueToGitHubIssue(i, classification)
  );
  return { ok: true, value: issues };
}

/** Create an issue on a GitHub repo. */
async function submitRepoIssue(
  apiRequest: ApiRequestFn,
  classifyRepo: ClassifyRepoFn,
  owner: string,
  repo: string,
  title: string,
  body?: string,
  labels?: readonly string[],
): Promise<Result<GitHubIssue, GitHubError>> {
  const result = await apiRequest<RawIssue>(
    `${buildRepoPath(owner, repo)}/issues`,
    {
      method: "POST",
      body: { title, body: body ?? "", labels: labels ?? [] },
    },
  );
  if (!result.ok) return result;

  const classification = await fetchRepoClassification(
    apiRequest,
    classifyRepo,
    owner,
    repo,
  );
  return {
    ok: true,
    value: mapRawIssueToGitHubIssue(result.value.data, classification),
  };
}

/** Create a comment on a GitHub issue or pull request. */
async function submitIssueComment(
  apiRequest: ApiRequestFn,
  classifyRepo: ClassifyRepoFn,
  owner: string,
  repo: string,
  issueNumber: number,
  body: string,
): Promise<
  Result<
    {
      readonly id: number;
      readonly htmlUrl: string;
      readonly classification: ClassificationLevel;
    },
    GitHubError
  >
> {
  const result = await apiRequest<{ id: number; html_url: string }>(
    `${buildRepoPath(owner, repo)}/issues/${issueNumber}/comments`,
    { method: "POST", body: { body } },
  );
  if (!result.ok) return result;

  const classification = await fetchRepoClassification(
    apiRequest,
    classifyRepo,
    owner,
    repo,
  );
  return {
    ok: true,
    value: {
      id: result.value.data.id,
      htmlUrl: result.value.data.html_url,
      classification,
    },
  };
}

/** Build the workflow runs API path. */
function buildWorkflowRunsPath(
  owner: string,
  repo: string,
  workflow?: string,
): string {
  const base = buildRepoPath(owner, repo);
  if (workflow) {
    return `${base}/actions/workflows/${encodeURIComponent(workflow)}/runs`;
  }
  return `${base}/actions/runs`;
}

/** Map a raw workflow run to a GitHubWorkflowRun domain type. */
function mapRawWorkflowRunToGitHubRun(
  r: RawWorkflowRun,
  classification: ClassificationLevel,
): GitHubWorkflowRun {
  return {
    id: r.id,
    name: r.name ?? "",
    status: r.status,
    conclusion: r.conclusion ?? null,
    headBranch: r.head_branch,
    htmlUrl: r.html_url,
    createdAt: r.created_at,
    classification,
  };
}

/** Fetch workflow runs from a GitHub repo. */
async function fetchRepoWorkflowRuns(
  apiRequest: ApiRequestFn,
  classifyRepo: ClassifyRepoFn,
  owner: string,
  repo: string,
  opts?: {
    readonly workflow?: string;
    readonly branch?: string;
    readonly perPage?: number;
  },
): Promise<Result<readonly GitHubWorkflowRun[], GitHubError>> {
  const path = buildWorkflowRunsPath(owner, repo, opts?.workflow);
  const params = new URLSearchParams();
  if (opts?.branch) params.set("branch", opts.branch);
  params.set("per_page", String(opts?.perPage ?? 10));

  const result = await apiRequest<
    { workflow_runs: readonly RawWorkflowRun[] }
  >(`${path}?${params.toString()}`);
  if (!result.ok) return result;

  const classification = await fetchRepoClassification(
    apiRequest,
    classifyRepo,
    owner,
    repo,
  );
  const runs = result.value.data.workflow_runs.map((r) =>
    mapRawWorkflowRunToGitHubRun(r, classification)
  );
  return { ok: true, value: runs };
}

/** Trigger a workflow dispatch on a GitHub repo. */
async function dispatchRepoWorkflow(
  apiRequest: ApiRequestFn,
  classifyRepo: ClassifyRepoFn,
  owner: string,
  repo: string,
  workflow: string,
  ref: string,
  inputs?: Readonly<Record<string, string>>,
): Promise<
  Result<
    {
      readonly triggered: boolean;
      readonly classification: ClassificationLevel;
    },
    GitHubError
  >
> {
  const path = `${buildRepoPath(owner, repo)}/actions/workflows/${
    encodeURIComponent(workflow)
  }/dispatches`;
  const result = await apiRequest<undefined>(
    path,
    { method: "POST", body: { ref, inputs: inputs ?? {} } },
  );
  if (!result.ok) return result;

  const classification = await fetchRepoClassification(
    apiRequest,
    classifyRepo,
    owner,
    repo,
  );
  return { ok: true, value: { triggered: true, classification } };
}

/** Map a raw code search item to a GitHubCodeSearchItem. */
function mapRawCodeSearchItemToResult(
  item: RawCodeSearchItem,
  classifyRepo: ClassifyRepoFn,
): GitHubCodeSearchItem {
  return {
    path: item.path,
    repo: item.repository.full_name,
    htmlUrl: item.html_url,
    textMatches: (item.text_matches ?? []).map((m) => m.fragment ?? ""),
    classification: classifyRepo(
      item.repository.visibility ??
        (item.repository.private ? "private" : "public"),
      item.repository.full_name,
    ),
  };
}

/** Search code across GitHub repositories. */
async function searchGitHubCode(
  apiRequest: ApiRequestFn,
  classifyRepo: ClassifyRepoFn,
  query: string,
  opts?: { readonly perPage?: number },
): Promise<Result<readonly GitHubCodeSearchItem[], GitHubError>> {
  const params = new URLSearchParams();
  params.set("q", query);
  params.set("per_page", String(opts?.perPage ?? 10));

  const result = await apiRequest<
    { items: readonly RawCodeSearchItem[] }
  >(`/search/code?${params.toString()}`);
  if (!result.ok) return result;

  const items = result.value.data.items.map((item) =>
    mapRawCodeSearchItemToResult(item, classifyRepo)
  );
  return { ok: true, value: items };
}

/** Map a raw issue search item to a GitHubIssueSearchItem. */
function mapRawIssueSearchItemToResult(
  item: RawIssueSearchItem,
  baseUrl: string,
): GitHubIssueSearchItem {
  const repoFullName = item.repository_url?.replace(
    `${baseUrl}/repos/`,
    "",
  ) ?? "";
  return {
    number: item.number,
    title: item.title,
    repo: repoFullName,
    state: item.state,
    htmlUrl: item.html_url,
    classification: "PUBLIC" as ClassificationLevel,
  };
}

/** Search issues across GitHub repositories. */
async function searchGitHubIssues(
  apiRequest: ApiRequestFn,
  baseUrl: string,
  query: string,
  opts?: { readonly perPage?: number },
): Promise<Result<readonly GitHubIssueSearchItem[], GitHubError>> {
  const params = new URLSearchParams();
  params.set("q", query);
  params.set("per_page", String(opts?.perPage ?? 10));

  const result = await apiRequest<
    { items: readonly RawIssueSearchItem[] }
  >(`/search/issues?${params.toString()}`);
  if (!result.ok) return result;

  const items = result.value.data.items.map((item) =>
    mapRawIssueSearchItemToResult(item, baseUrl)
  );
  return { ok: true, value: items };
}

// ─── API request infrastructure ──────────────────────────────────────────────

/** Context needed by the API request function. */
interface GitHubApiContext {
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

/** Map a raw visibility string to a typed RepoVisibility. */
function classifyRepoVisibility(
  visibility: string | undefined,
  fullName: string,
  classConfig?: GitHubClassificationConfig,
): ClassificationLevel {
  const vis = (visibility === "internal" || visibility === "private")
    ? visibility
    : "public" as RepoVisibility;
  return visibilityToClassification(vis, fullName, classConfig);
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
async function sendGitHubApiRequest<T>(
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

/**
 * Create a GitHub REST API client.
 *
 * @param config - Token, optional base URL, optional fetch function for tests
 * @returns A GitHubClient with all 14 API methods
 */
export function createGitHubClient(config: GitHubClientConfig): GitHubClient {
  const ctx: GitHubApiContext = {
    baseUrl: config.baseUrl ?? "https://api.github.com",
    token: config.token,
    doFetch: config.fetchFn ?? fetch,
  };
  const classConfig = config.classificationConfig;
  const classifyRepo: ClassifyRepoFn = (visibility, fullName) =>
    classifyRepoVisibility(visibility, fullName, classConfig);
  const apiRequest: ApiRequestFn = (path, options) =>
    sendGitHubApiRequest(ctx, path, options);

  return {
    listRepos: (opts) => fetchUserRepos(apiRequest, classifyRepo, opts),
    readFile: (owner, repo, path, ref) =>
      fetchRepoFile(apiRequest, classifyRepo, owner, repo, path, ref),
    listCommits: (owner, repo, opts) =>
      fetchRepoCommits(apiRequest, classifyRepo, owner, repo, opts),
    listPulls: (owner, repo, opts) =>
      fetchRepoPulls(apiRequest, classifyRepo, owner, repo, opts),
    createPull: (owner, repo, title, head, base, body) =>
      submitRepoPullRequest(
        apiRequest,
        classifyRepo,
        owner,
        repo,
        title,
        head,
        base,
        body,
      ),
    submitReview: (owner, repo, prNumber, event, body) =>
      submitPullRequestReview(
        apiRequest,
        classifyRepo,
        owner,
        repo,
        prNumber,
        event,
        body,
      ),
    mergePull: (owner, repo, prNumber, opts) =>
      mergeRepoPullRequest(
        apiRequest,
        classifyRepo,
        owner,
        repo,
        prNumber,
        opts,
      ),
    listIssues: (owner, repo, opts) =>
      fetchRepoIssues(apiRequest, classifyRepo, owner, repo, opts),
    createIssue: (owner, repo, title, body, labels) =>
      submitRepoIssue(
        apiRequest,
        classifyRepo,
        owner,
        repo,
        title,
        body,
        labels,
      ),
    createComment: (owner, repo, issueNumber, body) =>
      submitIssueComment(
        apiRequest,
        classifyRepo,
        owner,
        repo,
        issueNumber,
        body,
      ),
    listWorkflowRuns: (owner, repo, opts) =>
      fetchRepoWorkflowRuns(apiRequest, classifyRepo, owner, repo, opts),
    triggerWorkflow: (owner, repo, workflow, ref, inputs) =>
      dispatchRepoWorkflow(
        apiRequest,
        classifyRepo,
        owner,
        repo,
        workflow,
        ref,
        inputs,
      ),
    searchCode: (query, opts) =>
      searchGitHubCode(apiRequest, classifyRepo, query, opts),
    searchIssues: (query, opts) =>
      searchGitHubIssues(apiRequest, ctx.baseUrl, query, opts),
  };
}
