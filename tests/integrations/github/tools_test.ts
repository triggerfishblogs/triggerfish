/**
 * GitHub tools tests.
 *
 * Tests all 25 tool definitions, parameter validation,
 * response formatting, null fallthrough, and graceful error handling.
 */
import { assertEquals } from "@std/assert";
import {
  getGitHubToolDefinitions,
  createGitHubToolExecutor,
  GITHUB_TOOLS_SYSTEM_PROMPT,
} from "../../../src/integrations/github/tools.ts";
import type { GitHubToolContext } from "../../../src/integrations/github/tools.ts";
import type { GitHubClient } from "../../../src/integrations/github/client.ts";
import type { SessionId } from "../../../src/core/types/session.ts";
import type { Result } from "../../../src/core/types/classification.ts";

// ─── Tool Definitions ────────────────────────────────────────────────────────

Deno.test("getGitHubToolDefinitions: returns 25 tool definitions", () => {
  const defs = getGitHubToolDefinitions();
  assertEquals(defs.length, 25);
});

Deno.test("getGitHubToolDefinitions: all tools have github_ prefix", () => {
  const defs = getGitHubToolDefinitions();
  for (const def of defs) {
    assertEquals(def.name.startsWith("github_"), true, `${def.name} missing github_ prefix`);
  }
});

Deno.test("getGitHubToolDefinitions: all tools have descriptions", () => {
  const defs = getGitHubToolDefinitions();
  for (const def of defs) {
    assertEquals(typeof def.description, "string");
    assertEquals(def.description.length > 0, true, `${def.name} has empty description`);
  }
});

Deno.test("getGitHubToolDefinitions: all tool names follow verb-first pattern", () => {
  const defs = getGitHubToolDefinitions();
  const verbs = ["list", "get", "read", "create", "update", "delete", "review", "merge", "trigger", "cancel", "add", "search"];
  for (const def of defs) {
    const afterPrefix = def.name.replace("github_", "");
    const firstWord = afterPrefix.split("_")[0];
    assertEquals(
      verbs.includes(firstWord),
      true,
      `${def.name} does not start with a known verb (got "${firstWord}")`,
    );
  }
});

Deno.test("getGitHubToolDefinitions: expected tool names present", () => {
  const defs = getGitHubToolDefinitions();
  const names = new Set(defs.map((d) => d.name));
  const expected = [
    "github_list_repos",
    "github_get_repo",
    "github_read_file",
    "github_list_commits",
    "github_list_branches",
    "github_create_branch",
    "github_delete_branch",
    "github_list_pulls",
    "github_get_pull",
    "github_create_pull",
    "github_update_pull",
    "github_list_pull_files",
    "github_review_pull",
    "github_merge_pull",
    "github_list_issues",
    "github_get_issue",
    "github_create_issue",
    "github_update_issue",
    "github_list_comments",
    "github_add_comment",
    "github_list_runs",
    "github_cancel_run",
    "github_trigger_workflow",
    "github_search_code",
    "github_search_issues",
  ];
  for (const name of expected) {
    assertEquals(names.has(name), true, `Missing tool: ${name}`);
  }
});

// ─── System Prompt ───────────────────────────────────────────────────────────

Deno.test("GITHUB_TOOLS_SYSTEM_PROMPT: is a non-empty string", () => {
  assertEquals(typeof GITHUB_TOOLS_SYSTEM_PROMPT, "string");
  assertEquals(GITHUB_TOOLS_SYSTEM_PROMPT.length > 0, true);
});

Deno.test("GITHUB_TOOLS_SYSTEM_PROMPT: mentions 25 tools", () => {
  assertEquals(GITHUB_TOOLS_SYSTEM_PROMPT.includes("25"), true);
});

// ─── Fallthrough ─────────────────────────────────────────────────────────────

Deno.test("createGitHubToolExecutor: returns null for non-github tools", async () => {
  const executor = createGitHubToolExecutor(undefined);
  const result = await executor("web_search", { query: "test" });
  assertEquals(result, null);
});

Deno.test("createGitHubToolExecutor: returns null for unknown github_ tool", async () => {
  const ctx = createMockContext();
  const executor = createGitHubToolExecutor(ctx);
  const result = await executor("github_unknown_tool", {});
  assertEquals(result, null);
});

// ─── Not Configured ──────────────────────────────────────────────────────────

Deno.test("createGitHubToolExecutor: returns error when not configured", async () => {
  const executor = createGitHubToolExecutor(undefined);
  const result = await executor("github_list_repos", {});
  assertEquals(typeof result, "string");
  assertEquals(result!.includes("not configured"), true);
});

// ─── Parameter Validation ────────────────────────────────────────────────────

Deno.test("executor: github_read_file requires repo param", async () => {
  const ctx = createMockContext();
  const executor = createGitHubToolExecutor(ctx);
  const result = await executor("github_read_file", { path: "README.md" });
  assertEquals(result!.includes("Error"), true);
});

Deno.test("executor: github_read_file requires path param", async () => {
  const ctx = createMockContext();
  const executor = createGitHubToolExecutor(ctx);
  const result = await executor("github_read_file", { repo: "o/r" });
  assertEquals(result!.includes("Error"), true);
});

Deno.test('executor: rejects invalid repo format (no slash)', async () => {
  const ctx = createMockContext();
  const executor = createGitHubToolExecutor(ctx);
  const result = await executor("github_read_file", { repo: "invalid", path: "f" });
  assertEquals(result!.includes("owner/name"), true);
});

Deno.test("executor: github_create_pull requires title", async () => {
  const ctx = createMockContext();
  const executor = createGitHubToolExecutor(ctx);
  const result = await executor("github_create_pull", { repo: "o/r", head: "feature", base: "main" });
  assertEquals(result!.includes("Error"), true);
  assertEquals(result!.includes("title"), true);
});

Deno.test("executor: github_search_code requires query", async () => {
  const ctx = createMockContext();
  const executor = createGitHubToolExecutor(ctx);
  const result = await executor("github_search_code", {});
  assertEquals(result!.includes("Error"), true);
  assertEquals(result!.includes("query"), true);
});

Deno.test("executor: github_add_comment requires number", async () => {
  const ctx = createMockContext();
  const executor = createGitHubToolExecutor(ctx);
  const result = await executor("github_add_comment", { repo: "o/r", body: "hi" });
  assertEquals(result!.includes("Error"), true);
  assertEquals(result!.includes("number"), true);
});

Deno.test("executor: github_get_issue requires number", async () => {
  const ctx = createMockContext();
  const executor = createGitHubToolExecutor(ctx);
  const result = await executor("github_get_issue", { repo: "o/r" });
  assertEquals(result!.includes("Error"), true);
  assertEquals(result!.includes("number"), true);
});

Deno.test("executor: github_get_pull requires pr_number", async () => {
  const ctx = createMockContext();
  const executor = createGitHubToolExecutor(ctx);
  const result = await executor("github_get_pull", { repo: "o/r" });
  assertEquals(result!.includes("Error"), true);
  assertEquals(result!.includes("pr_number"), true);
});

Deno.test("executor: github_create_branch requires branch and sha", async () => {
  const ctx = createMockContext();
  const executor = createGitHubToolExecutor(ctx);
  const result1 = await executor("github_create_branch", { repo: "o/r", sha: "abc" });
  assertEquals(result1!.includes("Error"), true);
  assertEquals(result1!.includes("branch"), true);
  const result2 = await executor("github_create_branch", { repo: "o/r", branch: "feat" });
  assertEquals(result2!.includes("Error"), true);
  assertEquals(result2!.includes("sha"), true);
});

Deno.test("executor: github_delete_branch requires branch", async () => {
  const ctx = createMockContext();
  const executor = createGitHubToolExecutor(ctx);
  const result = await executor("github_delete_branch", { repo: "o/r" });
  assertEquals(result!.includes("Error"), true);
  assertEquals(result!.includes("branch"), true);
});

Deno.test("executor: github_cancel_run requires run_id", async () => {
  const ctx = createMockContext();
  const executor = createGitHubToolExecutor(ctx);
  const result = await executor("github_cancel_run", { repo: "o/r" });
  assertEquals(result!.includes("Error"), true);
  assertEquals(result!.includes("run_id"), true);
});

// ─── Response Formatting ─────────────────────────────────────────────────────

Deno.test("executor: github_list_repos returns JSON with _classification", async () => {
  const ctx = createMockContext({
    listRepos: () => Promise.resolve({
      ok: true as const,
      value: [{
        id: 1,
        fullName: "o/r",
        description: "test",
        visibility: "public" as const,
        defaultBranch: "main",
        htmlUrl: "https://github.com/o/r",
        classification: "PUBLIC" as const,
      }],
    }),
  });
  const executor = createGitHubToolExecutor(ctx);
  const result = await executor("github_list_repos", {});

  const parsed = JSON.parse(result!);
  assertEquals(parsed.repos.length, 1);
  assertEquals(parsed.repos[0]._classification, "PUBLIC");
});

Deno.test("executor: github_search_code returns JSON with results", async () => {
  const ctx = createMockContext({
    searchCode: () => Promise.resolve({
      ok: true as const,
      value: [{
        path: "src/main.ts",
        repo: "o/r",
        htmlUrl: "https://github.com/o/r/blob/main/src/main.ts",
        textMatches: ["import { foo }"],
        classification: "CONFIDENTIAL" as const,
      }],
    }),
  });
  const executor = createGitHubToolExecutor(ctx);
  const result = await executor("github_search_code", { query: "import foo" });

  const parsed = JSON.parse(result!);
  assertEquals(parsed.results.length, 1);
  assertEquals(parsed.results[0]._classification, "CONFIDENTIAL");
});

Deno.test("executor: github_create_issue returns created issue JSON", async () => {
  const ctx = createMockContext({
    createIssue: () => Promise.resolve({
      ok: true as const,
      value: {
        number: 5,
        title: "New issue",
        state: "open",
        author: "bot",
        body: "body text",
        htmlUrl: "https://github.com/o/r/issues/5",
        createdAt: "2024-01-01T00:00:00Z",
        labels: ["bug"],
        classification: "PUBLIC" as const,
      },
    }),
  });
  const executor = createGitHubToolExecutor(ctx);
  const result = await executor("github_create_issue", { repo: "o/r", title: "New issue" });

  const parsed = JSON.parse(result!);
  assertEquals(parsed.number, 5);
  assertEquals(parsed._classification, "PUBLIC");
});

Deno.test("executor: github_get_repo returns repo detail JSON", async () => {
  const ctx = createMockContext({
    getRepo: () => Promise.resolve({
      ok: true as const,
      value: {
        id: 1,
        fullName: "o/r",
        description: "test",
        visibility: "public" as const,
        defaultBranch: "main",
        htmlUrl: "https://github.com/o/r",
        cloneUrl: "https://github.com/o/r.git",
        sshUrl: "git@github.com:o/r.git",
        language: "TypeScript",
        stargazersCount: 42,
        forksCount: 5,
        topics: ["deno"],
        classification: "PUBLIC" as const,
      },
    }),
  });
  const executor = createGitHubToolExecutor(ctx);
  const result = await executor("github_get_repo", { repo: "o/r" });

  const parsed = JSON.parse(result!);
  assertEquals(parsed.language, "TypeScript");
  assertEquals(parsed.stars, 42);
  assertEquals(parsed._classification, "PUBLIC");
});

Deno.test("executor: github_list_comments returns comments JSON", async () => {
  const ctx = createMockContext({
    listComments: () => Promise.resolve({
      ok: true as const,
      value: [{
        id: 1,
        author: "alice",
        body: "LGTM",
        createdAt: "2024-01-01T00:00:00Z",
        htmlUrl: "https://github.com/o/r/issues/1#issuecomment-1",
        classification: "PUBLIC" as const,
      }],
    }),
  });
  const executor = createGitHubToolExecutor(ctx);
  const result = await executor("github_list_comments", { repo: "o/r", number: 1 });

  const parsed = JSON.parse(result!);
  assertEquals(parsed.comments.length, 1);
  assertEquals(parsed.comments[0].author, "alice");
});

// ─── Error Formatting ────────────────────────────────────────────────────────

Deno.test("executor: formats API error correctly", async () => {
  const ctx = createMockContext({
    listRepos: () => Promise.resolve({
      ok: false as const,
      error: { status: 401, message: "Bad credentials" },
    }),
  });
  const executor = createGitHubToolExecutor(ctx);
  const result = await executor("github_list_repos", {});
  assertEquals(result!.includes("401"), true);
  assertEquals(result!.includes("Bad credentials"), true);
});

Deno.test("executor: formats rate limit error", async () => {
  const ctx = createMockContext({
    listRepos: () => Promise.resolve({
      ok: false as const,
      error: { status: 403, message: "rate limit", rateLimitRemaining: 0, rateLimitReset: 1700000000 },
    }),
  });
  const executor = createGitHubToolExecutor(ctx);
  const result = await executor("github_list_repos", {});
  assertEquals(result!.includes("rate limit exceeded"), true);
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Create a mock GitHubToolContext with optional client method overrides. */
function createMockContext(
  overrides?: Partial<Record<keyof GitHubClient, (...args: unknown[]) => Promise<Result<unknown, unknown>>>>,
): GitHubToolContext {
  const defaultMethod = () =>
    Promise.resolve({
      ok: true as const,
      value: [],
    });

  const client: GitHubClient = {
    listRepos: overrides?.listRepos as GitHubClient["listRepos"] ?? defaultMethod as unknown as GitHubClient["listRepos"],
    getRepo: overrides?.getRepo as GitHubClient["getRepo"] ?? defaultMethod as unknown as GitHubClient["getRepo"],
    readFile: overrides?.readFile as GitHubClient["readFile"] ?? defaultMethod as unknown as GitHubClient["readFile"],
    listCommits: overrides?.listCommits as GitHubClient["listCommits"] ?? defaultMethod as unknown as GitHubClient["listCommits"],
    listBranches: overrides?.listBranches as GitHubClient["listBranches"] ?? defaultMethod as unknown as GitHubClient["listBranches"],
    createBranch: overrides?.createBranch as GitHubClient["createBranch"] ?? defaultMethod as unknown as GitHubClient["createBranch"],
    deleteBranch: overrides?.deleteBranch as GitHubClient["deleteBranch"] ?? defaultMethod as unknown as GitHubClient["deleteBranch"],
    listPulls: overrides?.listPulls as GitHubClient["listPulls"] ?? defaultMethod as unknown as GitHubClient["listPulls"],
    getPull: overrides?.getPull as GitHubClient["getPull"] ?? defaultMethod as unknown as GitHubClient["getPull"],
    createPull: overrides?.createPull as GitHubClient["createPull"] ?? defaultMethod as unknown as GitHubClient["createPull"],
    updatePull: overrides?.updatePull as GitHubClient["updatePull"] ?? defaultMethod as unknown as GitHubClient["updatePull"],
    listPullFiles: overrides?.listPullFiles as GitHubClient["listPullFiles"] ?? defaultMethod as unknown as GitHubClient["listPullFiles"],
    submitReview: overrides?.submitReview as GitHubClient["submitReview"] ?? defaultMethod as unknown as GitHubClient["submitReview"],
    mergePull: overrides?.mergePull as GitHubClient["mergePull"] ?? defaultMethod as unknown as GitHubClient["mergePull"],
    listIssues: overrides?.listIssues as GitHubClient["listIssues"] ?? defaultMethod as unknown as GitHubClient["listIssues"],
    getIssue: overrides?.getIssue as GitHubClient["getIssue"] ?? defaultMethod as unknown as GitHubClient["getIssue"],
    createIssue: overrides?.createIssue as GitHubClient["createIssue"] ?? defaultMethod as unknown as GitHubClient["createIssue"],
    updateIssue: overrides?.updateIssue as GitHubClient["updateIssue"] ?? defaultMethod as unknown as GitHubClient["updateIssue"],
    listComments: overrides?.listComments as GitHubClient["listComments"] ?? defaultMethod as unknown as GitHubClient["listComments"],
    createComment: overrides?.createComment as GitHubClient["createComment"] ?? defaultMethod as unknown as GitHubClient["createComment"],
    listWorkflowRuns: overrides?.listWorkflowRuns as GitHubClient["listWorkflowRuns"] ?? defaultMethod as unknown as GitHubClient["listWorkflowRuns"],
    cancelRun: overrides?.cancelRun as GitHubClient["cancelRun"] ?? defaultMethod as unknown as GitHubClient["cancelRun"],
    triggerWorkflow: overrides?.triggerWorkflow as GitHubClient["triggerWorkflow"] ?? defaultMethod as unknown as GitHubClient["triggerWorkflow"],
    searchCode: overrides?.searchCode as GitHubClient["searchCode"] ?? defaultMethod as unknown as GitHubClient["searchCode"],
    searchIssues: overrides?.searchIssues as GitHubClient["searchIssues"] ?? defaultMethod as unknown as GitHubClient["searchIssues"],
  };

  return {
    client,
    sessionTaint: "PUBLIC",
    sourceSessionId: "test-session" as SessionId,
  };
}
