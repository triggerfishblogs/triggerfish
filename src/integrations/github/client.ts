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
} from "../../core/types/classification.ts";
import type {
  GitHubBranch,
  GitHubClassificationConfig,
  GitHubCodeSearchItem,
  GitHubComment,
  GitHubCommit,
  GitHubError,
  GitHubFileContent,
  GitHubIssue,
  GitHubIssueSearchItem,
  GitHubPull,
  GitHubPullDetail,
  GitHubPullFile,
  GitHubRepo,
  GitHubRepoDetail,
  GitHubWorkflowRun,
  RepoVisibility,
} from "./types.ts";
import type { Result } from "../../core/types/classification.ts";
import type { ApiRequestFn, ClassifyRepoFn } from "./client_http.ts";
import { sendGitHubApiRequest } from "./client_http.ts";
import type { GitHubApiContext } from "./client_http.ts";
import {
  fetchRepo,
  fetchUserRepos,
  fetchRepoFile,
  fetchRepoCommits,
  fetchRepoBranches,
  createRepoBranch,
  deleteRepoBranch,
} from "./repos/mod.ts";
import {
  fetchRepoPulls,
  fetchRepoPull,
  updateRepoPull,
  fetchPullFiles,
  submitRepoPullRequest,
  submitPullRequestReview,
  mergeRepoPullRequest,
} from "./pulls/mod.ts";
import {
  fetchRepoIssues,
  fetchRepoIssue,
  updateRepoIssue,
  fetchIssueComments,
  submitRepoIssue,
  submitIssueComment,
} from "./issues/mod.ts";
import {
  fetchRepoWorkflowRuns,
  cancelRepoWorkflowRun,
  dispatchRepoWorkflow,
  searchGitHubCode,
  searchGitHubIssues,
} from "./actions/mod.ts";

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
  readonly getRepo: (
    owner: string,
    repo: string,
  ) => Promise<Result<GitHubRepoDetail, GitHubError>>;
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
  readonly listBranches: (
    owner: string,
    repo: string,
    opts?: { readonly perPage?: number },
  ) => Promise<Result<readonly GitHubBranch[], GitHubError>>;
  readonly createBranch: (
    owner: string,
    repo: string,
    branchName: string,
    sha: string,
  ) => Promise<
    Result<
      {
        readonly ref: string;
        readonly sha: string;
        readonly classification: ClassificationLevel;
      },
      GitHubError
    >
  >;
  readonly deleteBranch: (
    owner: string,
    repo: string,
    branchName: string,
  ) => Promise<
    Result<
      {
        readonly deleted: boolean;
        readonly classification: ClassificationLevel;
      },
      GitHubError
    >
  >;
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
  readonly getPull: (
    owner: string,
    repo: string,
    prNumber: number,
  ) => Promise<Result<GitHubPullDetail, GitHubError>>;
  readonly updatePull: (
    owner: string,
    repo: string,
    prNumber: number,
    fields: {
      readonly title?: string;
      readonly body?: string;
      readonly base?: string;
      readonly state?: string;
    },
  ) => Promise<Result<GitHubPullDetail, GitHubError>>;
  readonly listPullFiles: (
    owner: string,
    repo: string,
    prNumber: number,
    opts?: { readonly perPage?: number },
  ) => Promise<Result<readonly GitHubPullFile[], GitHubError>>;
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
  readonly getIssue: (
    owner: string,
    repo: string,
    issueNumber: number,
  ) => Promise<Result<GitHubIssue, GitHubError>>;
  readonly updateIssue: (
    owner: string,
    repo: string,
    issueNumber: number,
    fields: {
      readonly title?: string;
      readonly body?: string;
      readonly state?: string;
      readonly labels?: readonly string[];
      readonly assignees?: readonly string[];
    },
  ) => Promise<Result<GitHubIssue, GitHubError>>;
  readonly listComments: (
    owner: string,
    repo: string,
    issueNumber: number,
    opts?: { readonly perPage?: number },
  ) => Promise<Result<readonly GitHubComment[], GitHubError>>;
  readonly listWorkflowRuns: (
    owner: string,
    repo: string,
    opts?: {
      readonly workflow?: string;
      readonly branch?: string;
      readonly perPage?: number;
    },
  ) => Promise<Result<readonly GitHubWorkflowRun[], GitHubError>>;
  readonly cancelRun: (
    owner: string,
    repo: string,
    runId: number,
  ) => Promise<
    Result<
      {
        readonly cancelled: boolean;
        readonly classification: ClassificationLevel;
      },
      GitHubError
    >
  >;
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
    getRepo: (owner, repo) =>
      fetchRepo(apiRequest, classifyRepo, owner, repo),
    readFile: (owner, repo, path, ref) =>
      fetchRepoFile(apiRequest, classifyRepo, owner, repo, path, ref),
    listCommits: (owner, repo, opts) =>
      fetchRepoCommits(apiRequest, classifyRepo, owner, repo, opts),
    listBranches: (owner, repo, opts) =>
      fetchRepoBranches(apiRequest, classifyRepo, owner, repo, opts),
    createBranch: (owner, repo, branchName, sha) =>
      createRepoBranch(apiRequest, classifyRepo, owner, repo, branchName, sha),
    deleteBranch: (owner, repo, branchName) =>
      deleteRepoBranch(apiRequest, classifyRepo, owner, repo, branchName),
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
    getPull: (owner, repo, prNumber) =>
      fetchRepoPull(apiRequest, classifyRepo, owner, repo, prNumber),
    updatePull: (owner, repo, prNumber, fields) =>
      updateRepoPull(apiRequest, classifyRepo, owner, repo, prNumber, fields),
    listPullFiles: (owner, repo, prNumber, opts) =>
      fetchPullFiles(apiRequest, classifyRepo, owner, repo, prNumber, opts),
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
    getIssue: (owner, repo, issueNumber) =>
      fetchRepoIssue(apiRequest, classifyRepo, owner, repo, issueNumber),
    updateIssue: (owner, repo, issueNumber, fields) =>
      updateRepoIssue(
        apiRequest,
        classifyRepo,
        owner,
        repo,
        issueNumber,
        fields,
      ),
    listComments: (owner, repo, issueNumber, opts) =>
      fetchIssueComments(
        apiRequest,
        classifyRepo,
        owner,
        repo,
        issueNumber,
        opts,
      ),
    listWorkflowRuns: (owner, repo, opts) =>
      fetchRepoWorkflowRuns(apiRequest, classifyRepo, owner, repo, opts),
    cancelRun: (owner, repo, runId) =>
      cancelRepoWorkflowRun(apiRequest, classifyRepo, owner, repo, runId),
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
