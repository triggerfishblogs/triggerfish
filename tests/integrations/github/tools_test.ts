/**
 * GitHub tools tests.
 *
 * Tests all 14 tool definitions, parameter validation,
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

Deno.test("getGitHubToolDefinitions: returns 14 tool definitions", () => {
  const defs = getGitHubToolDefinitions();
  assertEquals(defs.length, 14);
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

Deno.test("getGitHubToolDefinitions: expected tool names present", () => {
  const defs = getGitHubToolDefinitions();
  const names = new Set(defs.map((d) => d.name));
  const expected = [
    "github_repos_list",
    "github_repos_read_file",
    "github_repos_commits",
    "github_pulls_list",
    "github_pulls_create",
    "github_pulls_review",
    "github_pulls_merge",
    "github_issues_list",
    "github_issues_create",
    "github_issues_comment",
    "github_actions_runs",
    "github_actions_trigger",
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
  const result = await executor("github_repos_list", {});
  assertEquals(typeof result, "string");
  assertEquals(result!.includes("not configured"), true);
});

// ─── Parameter Validation ────────────────────────────────────────────────────

Deno.test("executor: github_repos_read_file requires repo param", async () => {
  const ctx = createMockContext();
  const executor = createGitHubToolExecutor(ctx);
  const result = await executor("github_repos_read_file", { path: "README.md" });
  assertEquals(result!.includes("Error"), true);
});

Deno.test("executor: github_repos_read_file requires path param", async () => {
  const ctx = createMockContext();
  const executor = createGitHubToolExecutor(ctx);
  const result = await executor("github_repos_read_file", { repo: "o/r" });
  assertEquals(result!.includes("Error"), true);
});

Deno.test('executor: rejects invalid repo format (no slash)', async () => {
  const ctx = createMockContext();
  const executor = createGitHubToolExecutor(ctx);
  const result = await executor("github_repos_read_file", { repo: "invalid", path: "f" });
  assertEquals(result!.includes("owner/name"), true);
});

Deno.test("executor: github_pulls_create requires title", async () => {
  const ctx = createMockContext();
  const executor = createGitHubToolExecutor(ctx);
  const result = await executor("github_pulls_create", { repo: "o/r", head: "feature", base: "main" });
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

Deno.test("executor: github_issues_comment requires number", async () => {
  const ctx = createMockContext();
  const executor = createGitHubToolExecutor(ctx);
  const result = await executor("github_issues_comment", { repo: "o/r", body: "hi" });
  assertEquals(result!.includes("Error"), true);
  assertEquals(result!.includes("number"), true);
});

// ─── Response Formatting ─────────────────────────────────────────────────────

Deno.test("executor: github_repos_list returns JSON with _classification", async () => {
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
  const result = await executor("github_repos_list", {});

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

Deno.test("executor: github_issues_create returns created issue JSON", async () => {
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
  const result = await executor("github_issues_create", { repo: "o/r", title: "New issue" });

  const parsed = JSON.parse(result!);
  assertEquals(parsed.number, 5);
  assertEquals(parsed._classification, "PUBLIC");
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
  const result = await executor("github_repos_list", {});
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
  const result = await executor("github_repos_list", {});
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
    readFile: overrides?.readFile as GitHubClient["readFile"] ?? defaultMethod as unknown as GitHubClient["readFile"],
    listCommits: overrides?.listCommits as GitHubClient["listCommits"] ?? defaultMethod as unknown as GitHubClient["listCommits"],
    listPulls: overrides?.listPulls as GitHubClient["listPulls"] ?? defaultMethod as unknown as GitHubClient["listPulls"],
    createPull: overrides?.createPull as GitHubClient["createPull"] ?? defaultMethod as unknown as GitHubClient["createPull"],
    submitReview: overrides?.submitReview as GitHubClient["submitReview"] ?? defaultMethod as unknown as GitHubClient["submitReview"],
    mergePull: overrides?.mergePull as GitHubClient["mergePull"] ?? defaultMethod as unknown as GitHubClient["mergePull"],
    listIssues: overrides?.listIssues as GitHubClient["listIssues"] ?? defaultMethod as unknown as GitHubClient["listIssues"],
    createIssue: overrides?.createIssue as GitHubClient["createIssue"] ?? defaultMethod as unknown as GitHubClient["createIssue"],
    createComment: overrides?.createComment as GitHubClient["createComment"] ?? defaultMethod as unknown as GitHubClient["createComment"],
    listWorkflowRuns: overrides?.listWorkflowRuns as GitHubClient["listWorkflowRuns"] ?? defaultMethod as unknown as GitHubClient["listWorkflowRuns"],
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
