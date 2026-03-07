/**
 * Reddit client tests — API request construction, auth headers, response parsing.
 *
 * @module
 */
import { assertEquals } from "@std/assert";
import {
  createRateLimiter,
  createRedditClient,
  redditContentClassification,
} from "../../src/integrations/reddit/client.ts";
import type { RedditClient } from "../../src/integrations/reddit/client.ts";

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Standard raw subreddit about response. */
function rawSubredditAbout() {
  return {
    data: {
      display_name: "typescript",
      title: "TypeScript",
      public_description: "TypeScript language discussion",
      subscribers: 100000,
      accounts_active: 500,
      subreddit_type: "public",
    },
  };
}

/** Standard raw rules response. */
function rawSubredditRules() {
  return {
    rules: [
      { short_name: "No spam", description: "Do not post spam" },
    ],
  };
}

/** Standard raw post listing response. */
function rawPostListing() {
  return {
    data: {
      children: [
        {
          data: {
            id: "abc123",
            subreddit: "typescript",
            title: "Cool TS Feature",
            author: "devuser",
            selftext: "Check this out",
            url: "https://reddit.com/r/typescript/comments/abc123",
            permalink: "/r/typescript/comments/abc123/cool_ts_feature/",
            score: 42,
            num_comments: 7,
            created_utc: 1700000000,
            over_18: false,
          },
        },
      ],
    },
  };
}

/** Standard raw single post + comments response. */
function rawSinglePost() {
  return [
    {
      data: {
        children: [
          {
            data: {
              id: "abc123",
              subreddit: "typescript",
              title: "Cool TS Feature",
              author: "devuser",
              selftext: "Check this out",
              url: "https://reddit.com/r/typescript/comments/abc123",
              permalink: "/r/typescript/comments/abc123/cool_ts_feature/",
              score: 42,
              num_comments: 1,
              created_utc: 1700000000,
              over_18: false,
            },
          },
        ],
      },
    },
    {
      data: {
        children: [
          {
            kind: "t1",
            data: {
              id: "comment1",
              link_id: "t3_abc123",
              author: "commenter",
              body: "Great post!",
              score: 5,
              created_utc: 1700001000,
            },
          },
        ],
      },
    },
  ];
}

/** Create a mock fetch that routes based on URL path. */
export function createRoutingFetch(
  routes: Record<string, unknown>,
  tokenBody?: unknown,
): { fetchFn: typeof fetch; captured: { url: string; init?: RequestInit }[] } {
  const captured: { url: string; init?: RequestInit }[] = [];

  const fetchFn = (
    url: string | URL | Request,
    init?: RequestInit,
  ): Promise<Response> => {
    const urlStr = String(url);
    captured.push({ url: urlStr, init });

    if (urlStr.includes("/api/v1/access_token")) {
      const body = tokenBody ?? {
        access_token: "test_access_token",
        expires_in: 3600,
      };
      return Promise.resolve(
        new Response(JSON.stringify(body), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      );
    }

    for (const [pattern, body] of Object.entries(routes)) {
      if (urlStr.includes(pattern)) {
        return Promise.resolve(
          new Response(JSON.stringify(body), {
            status: 200,
            headers: { "content-type": "application/json" },
          }),
        );
      }
    }

    return Promise.resolve(
      new Response(JSON.stringify({ error: "Not Found" }), {
        status: 404,
        headers: { "content-type": "application/json" },
      }),
    );
  };

  return { fetchFn, captured };
}

/** Create a mock client with routing fetch. */
export function createMockClient(
  routes: Record<string, unknown>,
): { client: RedditClient; captured: { url: string; init?: RequestInit }[] } {
  const { fetchFn, captured } = createRoutingFetch(routes);
  const client = createRedditClient({
    clientId: "test_client_id",
    clientSecret: "test_client_secret",
    refreshToken: "test_refresh_token",
    username: "testbot",
    fetchFn,
    rateLimiter: createRateLimiter({ maxRequests: 1000 }),
  });
  return { client, captured };
}

// ─── Classification Mapping ──────────────────────────────────────────────────

Deno.test("redditContentClassification: public_content → PUBLIC", () => {
  assertEquals(redditContentClassification("public_content"), "PUBLIC");
});

Deno.test("redditContentClassification: modqueue → INTERNAL", () => {
  assertEquals(redditContentClassification("modqueue"), "INTERNAL");
});

Deno.test("redditContentClassification: modlog → INTERNAL", () => {
  assertEquals(redditContentClassification("modlog"), "INTERNAL");
});

Deno.test("redditContentClassification: user_pii → CONFIDENTIAL", () => {
  assertEquals(redditContentClassification("user_pii"), "CONFIDENTIAL");
});

// ─── Auth Header ─────────────────────────────────────────────────────────────

Deno.test("RedditClient: sends Bearer auth header after token refresh", async () => {
  const { client, captured } = createMockClient({
    "/about": rawSubredditAbout(),
    "/about/rules": rawSubredditRules(),
  });

  await client.fetchSubredditInfo("typescript");

  const tokenCall = captured.find((c) => c.url.includes("access_token"));
  assertEquals(tokenCall !== undefined, true);

  const apiCall = captured.find((c) => c.url.includes("/about") && !c.url.includes("access_token"));
  const authHeader = (apiCall?.init?.headers as Record<string, string>)
    ?.Authorization;
  assertEquals(authHeader, "Bearer test_access_token");
});

Deno.test("RedditClient: sends correct User-Agent", async () => {
  const { client, captured } = createMockClient({
    "/about": rawSubredditAbout(),
    "/about/rules": rawSubredditRules(),
  });

  await client.fetchSubredditInfo("typescript");

  const apiCall = captured.find((c) =>
    c.url.includes("/about") && !c.url.includes("access_token")
  );
  const ua = (apiCall?.init?.headers as Record<string, string>)?.["User-Agent"];
  assertEquals(ua, "triggerfish:test_client_id:1.0.0 (by /u/testbot)");
});

// ─── Subreddit Info ──────────────────────────────────────────────────────────

Deno.test("RedditClient: fetchSubredditInfo parses correctly", async () => {
  const { client } = createMockClient({
    "/about/rules": rawSubredditRules(),
    "/about": rawSubredditAbout(),
  });

  const result = await client.fetchSubredditInfo("typescript");
  assertEquals(result.ok, true);
  if (result.ok) {
    assertEquals(result.value.name, "typescript");
    assertEquals(result.value.subscribers, 100000);
    assertEquals(result.value.rules.length, 1);
    assertEquals(result.value.rules[0].shortName, "No spam");
    assertEquals(result.value.classification, "PUBLIC");
  }
});

// ─── Posts ────────────────────────────────────────────────────────────────────

Deno.test("RedditClient: fetchPosts parses listing", async () => {
  const { client } = createMockClient({
    "/hot": rawPostListing(),
  });

  const result = await client.fetchPosts("typescript");
  assertEquals(result.ok, true);
  if (result.ok) {
    assertEquals(result.value.length, 1);
    assertEquals(result.value[0].id, "abc123");
    assertEquals(result.value[0].title, "Cool TS Feature");
    assertEquals(result.value[0].author, "devuser");
    assertEquals(result.value[0].score, 42);
    assertEquals(result.value[0].classification, "PUBLIC");
  }
});

// ─── Single Post ─────────────────────────────────────────────────────────────

Deno.test("RedditClient: fetchPost parses post + comments", async () => {
  const { client } = createMockClient({
    "/comments/": rawSinglePost(),
  });

  const result = await client.fetchPost("abc123");
  assertEquals(result.ok, true);
  if (result.ok) {
    assertEquals(result.value.post.id, "abc123");
    assertEquals(result.value.post.classification, "PUBLIC");
    assertEquals(result.value.comments.length, 1);
    assertEquals(result.value.comments[0].author, "commenter");
    assertEquals(result.value.comments[0].classification, "PUBLIC");
  }
});
