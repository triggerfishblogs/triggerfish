/**
 * GitHub REST API client.
 *
 * Wraps the GitHub REST API with typed methods that return `Result<T, GitHubError>`.
 * Supports `fetchFn` injection for testing. Classification is derived from
 * repo visibility via the pure `visibilityToClassification()` function.
 *
 * @module
 */

import type { Result, ClassificationLevel } from "../../core/types/classification.ts";
import type {
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
  readonly listRepos: (opts?: { readonly page?: number; readonly perPage?: number }) => Promise<Result<readonly GitHubRepo[], GitHubError>>;
  readonly readFile: (owner: string, repo: string, path: string, ref?: string) => Promise<Result<GitHubFileContent, GitHubError>>;
  readonly listCommits: (owner: string, repo: string, opts?: { readonly sha?: string; readonly perPage?: number }) => Promise<Result<readonly GitHubCommit[], GitHubError>>;
  readonly listPulls: (owner: string, repo: string, opts?: { readonly state?: string; readonly perPage?: number }) => Promise<Result<readonly GitHubPull[], GitHubError>>;
  readonly createPull: (owner: string, repo: string, title: string, head: string, base: string, body?: string) => Promise<Result<GitHubPull, GitHubError>>;
  readonly submitReview: (owner: string, repo: string, prNumber: number, event: string, body: string) => Promise<Result<{ readonly id: number; readonly state: string; readonly classification: ClassificationLevel }, GitHubError>>;
  readonly mergePull: (owner: string, repo: string, prNumber: number, opts?: { readonly method?: string; readonly commitTitle?: string }) => Promise<Result<{ readonly merged: boolean; readonly message: string; readonly classification: ClassificationLevel }, GitHubError>>;
  readonly listIssues: (owner: string, repo: string, opts?: { readonly state?: string; readonly labels?: string; readonly perPage?: number }) => Promise<Result<readonly GitHubIssue[], GitHubError>>;
  readonly createIssue: (owner: string, repo: string, title: string, body?: string, labels?: readonly string[]) => Promise<Result<GitHubIssue, GitHubError>>;
  readonly createComment: (owner: string, repo: string, issueNumber: number, body: string) => Promise<Result<{ readonly id: number; readonly htmlUrl: string; readonly classification: ClassificationLevel }, GitHubError>>;
  readonly listWorkflowRuns: (owner: string, repo: string, opts?: { readonly workflow?: string; readonly branch?: string; readonly perPage?: number }) => Promise<Result<readonly GitHubWorkflowRun[], GitHubError>>;
  readonly triggerWorkflow: (owner: string, repo: string, workflow: string, ref: string, inputs?: Readonly<Record<string, string>>) => Promise<Result<{ readonly triggered: boolean; readonly classification: ClassificationLevel }, GitHubError>>;
  readonly searchCode: (query: string, opts?: { readonly perPage?: number }) => Promise<Result<readonly GitHubCodeSearchItem[], GitHubError>>;
  readonly searchIssues: (query: string, opts?: { readonly perPage?: number }) => Promise<Result<readonly GitHubIssueSearchItem[], GitHubError>>;
}

/**
 * Map repo visibility to classification level.
 *
 * Pure function. Checks per-repo overrides first, then falls back to
 * the default visibility mapping:
 * - public → PUBLIC
 * - internal → INTERNAL
 * - private → CONFIDENTIAL
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

/**
 * Create a GitHub REST API client.
 *
 * @param config - Token, optional base URL, optional fetch function for tests
 * @returns A GitHubClient with all 14 API methods
 */
export function createGitHubClient(config: GitHubClientConfig): GitHubClient {
  const baseUrl = config.baseUrl ?? "https://api.github.com";
  const doFetch = config.fetchFn ?? fetch;
  const classConfig = config.classificationConfig;

  /** Make an authenticated API request. */
  async function apiRequest<T>(
    path: string,
    options?: {
      readonly method?: string;
      readonly body?: unknown;
    },
  ): Promise<Result<{ data: T; repoVisibility?: RepoVisibility }, GitHubError>> {
    const url = `${baseUrl}${path}`;
    const headers: Record<string, string> = {
      "Accept": "application/vnd.github+json",
      "Authorization": `Bearer ${config.token}`,
      "X-GitHub-Api-Version": "2022-11-28",
    };
    if (options?.body) {
      headers["Content-Type"] = "application/json";
    }

    let response: Response;
    try {
      response = await doFetch(url, {
        method: options?.method ?? "GET",
        headers,
        body: options?.body ? JSON.stringify(options.body) : undefined,
      });
    } catch (err) {
      return {
        ok: false,
        error: {
          status: 0,
          message: `Request failed: ${err instanceof Error ? err.message : String(err)}`,
        },
      };
    }

    const rateLimitRemaining = response.headers.get("x-ratelimit-remaining")
      ? Number(response.headers.get("x-ratelimit-remaining"))
      : undefined;
    const rateLimitReset = response.headers.get("x-ratelimit-reset")
      ? Number(response.headers.get("x-ratelimit-reset"))
      : undefined;

    if (!response.ok) {
      let message: string;
      try {
        const body = await response.json() as { message?: string };
        message = body.message ?? `HTTP ${response.status}`;
      } catch {
        message = `HTTP ${response.status}`;
      }
      return {
        ok: false,
        error: { status: response.status, message, rateLimitRemaining, rateLimitReset },
      };
    }

    // 204 No Content (e.g. workflow dispatch)
    if (response.status === 204) {
      return { ok: true, value: { data: undefined as unknown as T } };
    }

    try {
      const data = (await response.json()) as T;
      return { ok: true, value: { data } };
    } catch {
      return {
        ok: false,
        error: { status: response.status, message: "Failed to parse response JSON" },
      };
    }
  }

  /** Get classification for a specific repo by querying its metadata. */
  function classifyRepo(
    visibility: string | undefined,
    fullName: string,
  ): ClassificationLevel {
    const vis = (visibility === "internal" || visibility === "private")
      ? visibility
      : "public" as RepoVisibility;
    return visibilityToClassification(vis, fullName, classConfig);
  }

  return {
    async listRepos(opts) {
      const params = new URLSearchParams();
      if (opts?.page) params.set("page", String(opts.page));
      params.set("per_page", String(opts?.perPage ?? 30));
      params.set("sort", "updated");

      const qs = params.toString();
      const result = await apiRequest<readonly RawRepo[]>(`/user/repos?${qs}`);
      if (!result.ok) return result;

      const repos: GitHubRepo[] = result.value.data.map((r) => ({
        id: r.id,
        fullName: r.full_name,
        description: r.description ?? null,
        visibility: (r.visibility ?? (r.private ? "private" : "public")) as RepoVisibility,
        defaultBranch: r.default_branch,
        htmlUrl: r.html_url,
        classification: classifyRepo(
          r.visibility ?? (r.private ? "private" : "public"),
          r.full_name,
        ),
      }));

      return { ok: true, value: repos };
    },

    async readFile(owner, repo, path, ref) {
      const params = ref ? `?ref=${encodeURIComponent(ref)}` : "";
      const result = await apiRequest<RawContent>(
        `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${path}${params}`,
      );
      if (!result.ok) return result;

      const raw = result.value.data;
      if (raw.size > MAX_FILE_SIZE) {
        return {
          ok: false,
          error: { status: 413, message: `File too large: ${raw.size} bytes (max ${MAX_FILE_SIZE})` },
        };
      }

      // Decode base64 content
      let content: string;
      try {
        content = atob(raw.content.replace(/\n/g, ""));
      } catch {
        content = raw.content;
      }

      // Get repo visibility for classification
      const repoResult = await apiRequest<RawRepo>(
        `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`,
      );
      const classification = repoResult.ok
        ? classifyRepo(
            repoResult.value.data.visibility ??
              (repoResult.value.data.private ? "private" : "public"),
            repoResult.value.data.full_name,
          )
        : "CONFIDENTIAL" as ClassificationLevel;

      return {
        ok: true,
        value: {
          path: raw.path,
          content,
          sha: raw.sha,
          size: raw.size,
          htmlUrl: raw.html_url,
          classification,
        },
      };
    },

    async listCommits(owner, repo, opts) {
      const params = new URLSearchParams();
      if (opts?.sha) params.set("sha", opts.sha);
      params.set("per_page", String(opts?.perPage ?? 20));

      const qs = params.toString();
      const result = await apiRequest<readonly RawCommit[]>(
        `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/commits?${qs}`,
      );
      if (!result.ok) return result;

      const repoResult = await apiRequest<RawRepo>(
        `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`,
      );
      const classification = repoResult.ok
        ? classifyRepo(
            repoResult.value.data.visibility ??
              (repoResult.value.data.private ? "private" : "public"),
            repoResult.value.data.full_name,
          )
        : "CONFIDENTIAL" as ClassificationLevel;

      const commits: GitHubCommit[] = result.value.data.map((c) => ({
        sha: c.sha,
        message: c.commit.message,
        author: c.commit.author?.name ?? c.author?.login ?? "unknown",
        date: c.commit.author?.date ?? "",
        htmlUrl: c.html_url,
        classification,
      }));

      return { ok: true, value: commits };
    },

    async listPulls(owner, repo, opts) {
      const params = new URLSearchParams();
      params.set("state", opts?.state ?? "open");
      params.set("per_page", String(opts?.perPage ?? 20));

      const qs = params.toString();
      const result = await apiRequest<readonly RawPull[]>(
        `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/pulls?${qs}`,
      );
      if (!result.ok) return result;

      const repoResult = await apiRequest<RawRepo>(
        `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`,
      );
      const classification = repoResult.ok
        ? classifyRepo(
            repoResult.value.data.visibility ??
              (repoResult.value.data.private ? "private" : "public"),
            repoResult.value.data.full_name,
          )
        : "CONFIDENTIAL" as ClassificationLevel;

      const pulls: GitHubPull[] = result.value.data.map((p) => ({
        number: p.number,
        title: p.title,
        state: p.state,
        author: p.user?.login ?? "unknown",
        headRef: p.head.ref,
        baseRef: p.base.ref,
        htmlUrl: p.html_url,
        createdAt: p.created_at,
        classification,
      }));

      return { ok: true, value: pulls };
    },

    async createPull(owner, repo, title, head, base, body) {
      const result = await apiRequest<RawPull>(
        `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/pulls`,
        {
          method: "POST",
          body: { title, head, base, body: body ?? "" },
        },
      );
      if (!result.ok) return result;

      const p = result.value.data;
      const repoResult = await apiRequest<RawRepo>(
        `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`,
      );
      const classification = repoResult.ok
        ? classifyRepo(
            repoResult.value.data.visibility ??
              (repoResult.value.data.private ? "private" : "public"),
            repoResult.value.data.full_name,
          )
        : "CONFIDENTIAL" as ClassificationLevel;

      return {
        ok: true,
        value: {
          number: p.number,
          title: p.title,
          state: p.state,
          author: p.user?.login ?? "unknown",
          headRef: p.head.ref,
          baseRef: p.base.ref,
          htmlUrl: p.html_url,
          createdAt: p.created_at,
          classification,
        },
      };
    },

    async submitReview(owner, repo, prNumber, event, body) {
      const result = await apiRequest<{ id: number; state: string }>(
        `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/pulls/${prNumber}/reviews`,
        {
          method: "POST",
          body: { event, body },
        },
      );
      if (!result.ok) return result;

      const repoResult = await apiRequest<RawRepo>(
        `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`,
      );
      const classification = repoResult.ok
        ? classifyRepo(
            repoResult.value.data.visibility ??
              (repoResult.value.data.private ? "private" : "public"),
            repoResult.value.data.full_name,
          )
        : "CONFIDENTIAL" as ClassificationLevel;

      return {
        ok: true,
        value: { id: result.value.data.id, state: result.value.data.state, classification },
      };
    },

    async mergePull(owner, repo, prNumber, opts) {
      const mergeMethod = opts?.method ?? "merge";
      const result = await apiRequest<{ merged: boolean; message: string }>(
        `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/pulls/${prNumber}/merge`,
        {
          method: "PUT",
          body: {
            merge_method: mergeMethod,
            ...(opts?.commitTitle ? { commit_title: opts.commitTitle } : {}),
          },
        },
      );
      if (!result.ok) return result;

      const repoResult = await apiRequest<RawRepo>(
        `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`,
      );
      const classification = repoResult.ok
        ? classifyRepo(
            repoResult.value.data.visibility ??
              (repoResult.value.data.private ? "private" : "public"),
            repoResult.value.data.full_name,
          )
        : "CONFIDENTIAL" as ClassificationLevel;

      return {
        ok: true,
        value: { merged: result.value.data.merged, message: result.value.data.message, classification },
      };
    },

    async listIssues(owner, repo, opts) {
      const params = new URLSearchParams();
      params.set("state", opts?.state ?? "open");
      if (opts?.labels) params.set("labels", opts.labels);
      params.set("per_page", String(opts?.perPage ?? 20));

      const qs = params.toString();
      const result = await apiRequest<readonly RawIssue[]>(
        `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/issues?${qs}`,
      );
      if (!result.ok) return result;

      const repoResult = await apiRequest<RawRepo>(
        `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`,
      );
      const classification = repoResult.ok
        ? classifyRepo(
            repoResult.value.data.visibility ??
              (repoResult.value.data.private ? "private" : "public"),
            repoResult.value.data.full_name,
          )
        : "CONFIDENTIAL" as ClassificationLevel;

      const issues: GitHubIssue[] = result.value.data.map((i) => ({
        number: i.number,
        title: i.title,
        state: i.state,
        author: i.user?.login ?? "unknown",
        body: i.body ?? null,
        htmlUrl: i.html_url,
        createdAt: i.created_at,
        labels: (i.labels ?? []).map((l) =>
          typeof l === "string" ? l : l.name ?? ""
        ),
        classification,
      }));

      return { ok: true, value: issues };
    },

    async createIssue(owner, repo, title, body, labels) {
      const result = await apiRequest<RawIssue>(
        `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/issues`,
        {
          method: "POST",
          body: { title, body: body ?? "", labels: labels ?? [] },
        },
      );
      if (!result.ok) return result;

      const i = result.value.data;
      const repoResult = await apiRequest<RawRepo>(
        `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`,
      );
      const classification = repoResult.ok
        ? classifyRepo(
            repoResult.value.data.visibility ??
              (repoResult.value.data.private ? "private" : "public"),
            repoResult.value.data.full_name,
          )
        : "CONFIDENTIAL" as ClassificationLevel;

      return {
        ok: true,
        value: {
          number: i.number,
          title: i.title,
          state: i.state,
          author: i.user?.login ?? "unknown",
          body: i.body ?? null,
          htmlUrl: i.html_url,
          createdAt: i.created_at,
          labels: (i.labels ?? []).map((l) =>
            typeof l === "string" ? l : l.name ?? ""
          ),
          classification,
        },
      };
    },

    async createComment(owner, repo, issueNumber, body) {
      const result = await apiRequest<{ id: number; html_url: string }>(
        `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/issues/${issueNumber}/comments`,
        {
          method: "POST",
          body: { body },
        },
      );
      if (!result.ok) return result;

      const repoResult = await apiRequest<RawRepo>(
        `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`,
      );
      const classification = repoResult.ok
        ? classifyRepo(
            repoResult.value.data.visibility ??
              (repoResult.value.data.private ? "private" : "public"),
            repoResult.value.data.full_name,
          )
        : "CONFIDENTIAL" as ClassificationLevel;

      return {
        ok: true,
        value: {
          id: result.value.data.id,
          htmlUrl: result.value.data.html_url,
          classification,
        },
      };
    },

    async listWorkflowRuns(owner, repo, opts) {
      let path: string;
      if (opts?.workflow) {
        path = `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/actions/workflows/${encodeURIComponent(opts.workflow)}/runs`;
      } else {
        path = `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/actions/runs`;
      }
      const params = new URLSearchParams();
      if (opts?.branch) params.set("branch", opts.branch);
      params.set("per_page", String(opts?.perPage ?? 10));

      const qs = params.toString();
      const result = await apiRequest<{ workflow_runs: readonly RawWorkflowRun[] }>(
        `${path}?${qs}`,
      );
      if (!result.ok) return result;

      const repoResult = await apiRequest<RawRepo>(
        `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`,
      );
      const classification = repoResult.ok
        ? classifyRepo(
            repoResult.value.data.visibility ??
              (repoResult.value.data.private ? "private" : "public"),
            repoResult.value.data.full_name,
          )
        : "CONFIDENTIAL" as ClassificationLevel;

      const runs: GitHubWorkflowRun[] = result.value.data.workflow_runs.map((r) => ({
        id: r.id,
        name: r.name ?? "",
        status: r.status,
        conclusion: r.conclusion ?? null,
        headBranch: r.head_branch,
        htmlUrl: r.html_url,
        createdAt: r.created_at,
        classification,
      }));

      return { ok: true, value: runs };
    },

    async triggerWorkflow(owner, repo, workflow, ref, inputs) {
      const result = await apiRequest<undefined>(
        `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/actions/workflows/${encodeURIComponent(workflow)}/dispatches`,
        {
          method: "POST",
          body: { ref, inputs: inputs ?? {} },
        },
      );
      if (!result.ok) return result;

      const repoResult = await apiRequest<RawRepo>(
        `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`,
      );
      const classification = repoResult.ok
        ? classifyRepo(
            repoResult.value.data.visibility ??
              (repoResult.value.data.private ? "private" : "public"),
            repoResult.value.data.full_name,
          )
        : "CONFIDENTIAL" as ClassificationLevel;

      return { ok: true, value: { triggered: true, classification } };
    },

    async searchCode(query, opts) {
      const params = new URLSearchParams();
      params.set("q", query);
      params.set("per_page", String(opts?.perPage ?? 10));

      const qs = params.toString();
      const result = await apiRequest<{ items: readonly RawCodeSearchItem[] }>(
        `/search/code?${qs}`,
      );
      if (!result.ok) return result;

      const items: GitHubCodeSearchItem[] = result.value.data.items.map((item) => ({
        path: item.path,
        repo: item.repository.full_name,
        htmlUrl: item.html_url,
        textMatches: (item.text_matches ?? []).map((m) => m.fragment ?? ""),
        classification: classifyRepo(
          item.repository.visibility ??
            (item.repository.private ? "private" : "public"),
          item.repository.full_name,
        ),
      }));

      return { ok: true, value: items };
    },

    async searchIssues(query, opts) {
      const params = new URLSearchParams();
      params.set("q", query);
      params.set("per_page", String(opts?.perPage ?? 10));

      const qs = params.toString();
      const result = await apiRequest<{ items: readonly RawIssueSearchItem[] }>(
        `/search/issues?${qs}`,
      );
      if (!result.ok) return result;

      const items: GitHubIssueSearchItem[] = result.value.data.items.map((item) => {
        const repoFullName = item.repository_url?.replace(`${baseUrl}/repos/`, "") ?? "";
        return {
          number: item.number,
          title: item.title,
          repo: repoFullName,
          state: item.state,
          htmlUrl: item.html_url,
          classification: "PUBLIC" as ClassificationLevel,
        };
      });

      return { ok: true, value: items };
    },
  };
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
