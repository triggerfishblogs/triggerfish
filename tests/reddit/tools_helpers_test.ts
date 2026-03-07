/**
 * Reddit tools tests — response formatting, error formatting, and shared helpers.
 *
 * @module
 */
import { assertEquals } from "@std/assert";
import {
  createRedditToolExecutor,
} from "../../src/integrations/reddit/tools.ts";
import type { RedditToolContext } from "../../src/integrations/reddit/tools.ts";
import type { RedditClient } from "../../src/integrations/reddit/client.ts";
import type { SessionId } from "../../src/core/types/session.ts";
import type { Result } from "../../src/core/types/classification.ts";
import type { RedditError } from "../../src/integrations/reddit/types.ts";

// ─── Shared Helper ──────────────────────────────────────────────────────────

type ClientOverrides = Partial<
  Record<
    keyof RedditClient,
    (...args: never[]) => Promise<Result<unknown, RedditError>>
  >
>;

/** Create a mock RedditToolContext with optional client method overrides. */
export function createMockToolContext(overrides?: ClientOverrides): RedditToolContext {
  const defaultMethod = () =>
    Promise.resolve({ ok: true as const, value: [] });

  const client: RedditClient = {
    fetchSubredditInfo: overrides?.fetchSubredditInfo as
      RedditClient["fetchSubredditInfo"] ??
      defaultMethod as unknown as RedditClient["fetchSubredditInfo"],
    fetchPosts: overrides?.fetchPosts as RedditClient["fetchPosts"] ??
      defaultMethod as unknown as RedditClient["fetchPosts"],
    fetchPost: overrides?.fetchPost as RedditClient["fetchPost"] ??
      defaultMethod as unknown as RedditClient["fetchPost"],
    fetchModQueue: overrides?.fetchModQueue as RedditClient["fetchModQueue"] ??
      defaultMethod as unknown as RedditClient["fetchModQueue"],
    fetchModLog: overrides?.fetchModLog as RedditClient["fetchModLog"] ??
      defaultMethod as unknown as RedditClient["fetchModLog"],
    fetchUserInfo: overrides?.fetchUserInfo as RedditClient["fetchUserInfo"] ??
      defaultMethod as unknown as RedditClient["fetchUserInfo"],
  };

  return {
    client,
    sessionTaint: "PUBLIC",
    sourceSessionId: "test-session" as SessionId,
  };
}

// ─── Response Formatting ─────────────────────────────────────────────────────

Deno.test("executor: subreddit_info returns JSON with _classification", async () => {
  const ctx = createMockToolContext({
    fetchSubredditInfo: () =>
      Promise.resolve({
        ok: true as const,
        value: {
          name: "typescript",
          title: "TypeScript",
          description: "TS discussion",
          subscribers: 100000,
          activeUsers: 500,
          subredditType: "public",
          rules: [{ shortName: "No spam", description: "Do not post spam" }],
          classification: "PUBLIC" as const,
        },
      }),
  });
  const executor = createRedditToolExecutor(ctx);
  const result = await executor("reddit_read", {
    action: "subreddit_info",
    subreddit: "typescript",
  });

  const parsed = JSON.parse(result!);
  assertEquals(parsed.name, "typescript");
  assertEquals(parsed.subscribers, 100000);
  assertEquals(parsed._classification, "PUBLIC");
});

Deno.test("executor: posts returns JSON array with _classification", async () => {
  const ctx = createMockToolContext({
    fetchPosts: () =>
      Promise.resolve({
        ok: true as const,
        value: [{
          id: "abc123",
          subreddit: "typescript",
          title: "Cool Feature",
          author: "devuser",
          selftext: "text",
          url: "https://reddit.com/r/typescript/abc123",
          permalink: "/r/typescript/comments/abc123/",
          score: 42,
          numComments: 7,
          createdUtc: 1700000000,
          isNsfw: false,
          classification: "PUBLIC" as const,
        }],
      }),
  });
  const executor = createRedditToolExecutor(ctx);
  const result = await executor("reddit_read", {
    action: "posts",
    subreddit: "typescript",
  });

  const parsed = JSON.parse(result!);
  assertEquals(parsed.posts.length, 1);
  assertEquals(parsed.posts[0].id, "abc123");
  assertEquals(parsed.posts[0]._classification, "PUBLIC");
});

Deno.test("executor: modqueue returns JSON with INTERNAL classification", async () => {
  const ctx = createMockToolContext({
    fetchModQueue: () =>
      Promise.resolve({
        ok: true as const,
        value: [{
          id: "mod1",
          kind: "post" as const,
          subreddit: "typescript",
          author: "spammer",
          title: "Buy stuff",
          body: "spam",
          reportReasons: ["Spam"],
          createdUtc: 1700000000,
          classification: "INTERNAL" as const,
        }],
      }),
  });
  const executor = createRedditToolExecutor(ctx);
  const result = await executor("reddit_read", {
    action: "modqueue",
    subreddit: "typescript",
  });

  const parsed = JSON.parse(result!);
  assertEquals(parsed.items.length, 1);
  assertEquals(parsed.items[0]._classification, "INTERNAL");
});

Deno.test("executor: user_info returns JSON with _classification", async () => {
  const ctx = createMockToolContext({
    fetchUserInfo: () =>
      Promise.resolve({
        ok: true as const,
        value: {
          name: "devuser",
          createdUtc: 1500000000,
          linkKarma: 1000,
          commentKarma: 5000,
          isMod: true,
          iconUrl: "https://reddit.com/avatar.png",
          classification: "PUBLIC" as const,
        },
      }),
  });
  const executor = createRedditToolExecutor(ctx);
  const result = await executor("reddit_read", {
    action: "user_info",
    username: "devuser",
  });

  const parsed = JSON.parse(result!);
  assertEquals(parsed.name, "devuser");
  assertEquals(parsed.linkKarma, 1000);
  assertEquals(parsed._classification, "PUBLIC");
});

// ─── Error Formatting ────────────────────────────────────────────────────────

Deno.test("executor: formats API error correctly", async () => {
  const ctx = createMockToolContext({
    fetchSubredditInfo: () =>
      Promise.resolve({
        ok: false as const,
        error: { status: 403, message: "Forbidden" },
      }),
  });
  const executor = createRedditToolExecutor(ctx);
  const result = await executor("reddit_read", {
    action: "subreddit_info",
    subreddit: "private_sub",
  });
  assertEquals(result!.includes("403"), true);
  assertEquals(result!.includes("Forbidden"), true);
});

Deno.test("executor: formats rate limit error", async () => {
  const ctx = createMockToolContext({
    fetchPosts: () =>
      Promise.resolve({
        ok: false as const,
        error: {
          status: 429,
          message: "Too Many Requests",
          rateLimitRemaining: 0,
          rateLimitReset: 30,
        },
      }),
  });
  const executor = createRedditToolExecutor(ctx);
  const result = await executor("reddit_read", {
    action: "posts",
    subreddit: "typescript",
  });
  assertEquals(result!.includes("rate limit"), true);
});
