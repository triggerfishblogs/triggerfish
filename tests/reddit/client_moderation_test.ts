/**
 * Reddit client tests — moderation, user info, and error handling.
 *
 * @module
 */
import { assertEquals } from "@std/assert";
import {
  createRateLimiter,
  createRedditClient,
} from "../../src/integrations/reddit/client.ts";
import { createMockClient, createRoutingFetch } from "./client_test.ts";

// ─── Mod Queue ───────────────────────────────────────────────────────────────

Deno.test("RedditClient: fetchModQueue parses items with INTERNAL classification", async () => {
  const modqueueResponse = {
    data: {
      children: [{
        kind: "t3",
        data: {
          id: "mod1",
          name: "t3_mod1",
          subreddit: "typescript",
          author: "spammer",
          title: "Buy cheap stuff",
          selftext: "spam content",
          mod_reports: [["Spam", "moderator1"]],
          user_reports: [],
          created_utc: 1700000000,
        },
      }],
    },
  };

  const { client } = createMockClient({
    "/modqueue": modqueueResponse,
  });

  const result = await client.fetchModQueue("typescript");
  assertEquals(result.ok, true);
  if (result.ok) {
    assertEquals(result.value.length, 1);
    assertEquals(result.value[0].kind, "post");
    assertEquals(result.value[0].author, "spammer");
    assertEquals(result.value[0].classification, "INTERNAL");
  }
});

// ─── Mod Log ─────────────────────────────────────────────────────────────────

Deno.test("RedditClient: fetchModLog parses actions with INTERNAL classification", async () => {
  const modlogResponse = {
    data: {
      children: [{
        data: {
          id: "log1",
          action: "removelink",
          mod: "moderator1",
          target_author: "spammer",
          target_permalink: "/r/typescript/comments/xyz/spam/",
          details: "spam",
          created_utc: 1700000000,
        },
      }],
    },
  };

  const { client } = createMockClient({
    "/log": modlogResponse,
  });

  const result = await client.fetchModLog("typescript");
  assertEquals(result.ok, true);
  if (result.ok) {
    assertEquals(result.value.length, 1);
    assertEquals(result.value[0].action, "removelink");
    assertEquals(result.value[0].moderator, "moderator1");
    assertEquals(result.value[0].classification, "INTERNAL");
  }
});

// ─── User Info ───────────────────────────────────────────────────────────────

Deno.test("RedditClient: fetchUserInfo parses user with PUBLIC classification", async () => {
  const userResponse = {
    data: {
      name: "devuser",
      created_utc: 1500000000,
      link_karma: 1000,
      comment_karma: 5000,
      is_mod: true,
      icon_img: "https://reddit.com/avatar.png",
    },
  };

  const { client } = createMockClient({
    "/about": userResponse,
  });

  const result = await client.fetchUserInfo("devuser");
  assertEquals(result.ok, true);
  if (result.ok) {
    assertEquals(result.value.name, "devuser");
    assertEquals(result.value.linkKarma, 1000);
    assertEquals(result.value.commentKarma, 5000);
    assertEquals(result.value.isMod, true);
    assertEquals(result.value.classification, "PUBLIC");
  }
});

// ─── Error Handling ──────────────────────────────────────────────────────────

Deno.test("RedditClient: returns error for 404", async () => {
  const { fetchFn } = createRoutingFetch({});
  const client = createRedditClient({
    clientId: "test",
    clientSecret: "test",
    refreshToken: "test",
    username: "test",
    fetchFn,
    rateLimiter: createRateLimiter({ maxRequests: 1000 }),
  });

  const result = await client.fetchSubredditInfo("nonexistent");
  assertEquals(result.ok, false);
  if (!result.ok) {
    assertEquals(result.error.status, 404);
  }
});

Deno.test("RedditClient: returns error for network failure", async () => {
  let callCount = 0;
  const fetchFn = (
    _url: string | URL | Request,
    _init?: RequestInit,
  ): Promise<Response> => {
    callCount++;
    if (callCount === 1) {
      return Promise.resolve(
        new Response(
          JSON.stringify({ access_token: "tok", expires_in: 3600 }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
      );
    }
    return Promise.reject(new Error("Network unreachable"));
  };

  const client = createRedditClient({
    clientId: "test",
    clientSecret: "test",
    refreshToken: "test",
    username: "test",
    fetchFn,
    rateLimiter: createRateLimiter({ maxRequests: 1000 }),
  });

  const result = await client.fetchPosts("typescript");
  assertEquals(result.ok, false);
  if (!result.ok) {
    assertEquals(result.error.status, 0);
    assertEquals(result.error.message.includes("Network unreachable"), true);
  }
});

Deno.test("RedditClient: returns error for token refresh failure", async () => {
  const fetchFn = (
    _url: string | URL | Request,
    _init?: RequestInit,
  ): Promise<Response> => {
    return Promise.resolve(
      new Response(JSON.stringify({ error: "invalid_grant" }), {
        status: 401,
        headers: { "content-type": "application/json" },
      }),
    );
  };

  const client = createRedditClient({
    clientId: "test",
    clientSecret: "test",
    refreshToken: "bad_token",
    username: "test",
    fetchFn,
    rateLimiter: createRateLimiter({ maxRequests: 1000 }),
  });

  const result = await client.fetchPosts("typescript");
  assertEquals(result.ok, false);
  if (!result.ok) {
    assertEquals(result.error.status, 401);
  }
});
