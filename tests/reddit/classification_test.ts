/**
 * Reddit classification boundary tests.
 *
 * Tests the pure redditContentClassification function and verifies
 * that API responses carry the correct _classification field across
 * all content types and security boundaries.
 */
import { assertEquals } from "@std/assert";
import {
  createRateLimiter,
  createRedditClient,
  redditContentClassification,
} from "../../src/integrations/reddit/client.ts";
import type { ClassificationLevel } from "../../src/core/types/classification.ts";

// ─── Pure Function: Content Type Mapping ─────────────────────────────────────

Deno.test("classification: public posts map to PUBLIC", () => {
  assertEquals(redditContentClassification("public_content"), "PUBLIC");
});

Deno.test("classification: modqueue maps to INTERNAL", () => {
  assertEquals(redditContentClassification("modqueue"), "INTERNAL");
});

Deno.test("classification: modlog maps to INTERNAL", () => {
  assertEquals(redditContentClassification("modlog"), "INTERNAL");
});

Deno.test("classification: user PII maps to CONFIDENTIAL", () => {
  assertEquals(redditContentClassification("user_pii"), "CONFIDENTIAL");
});

// ─── Classification Level Ordering ───────────────────────────────────────────

Deno.test("classification: PUBLIC < INTERNAL < CONFIDENTIAL ordering", () => {
  const levels: Record<ClassificationLevel, number> = {
    PUBLIC: 1,
    INTERNAL: 2,
    CONFIDENTIAL: 3,
    RESTRICTED: 4,
  };

  const publicLevel = levels[redditContentClassification("public_content")];
  const modqueueLevel = levels[redditContentClassification("modqueue")];
  const modlogLevel = levels[redditContentClassification("modlog")];
  const piiLevel = levels[redditContentClassification("user_pii")];

  assertEquals(publicLevel < modqueueLevel, true, "PUBLIC should be less than modqueue INTERNAL");
  assertEquals(modqueueLevel === modlogLevel, true, "modqueue and modlog should both be INTERNAL");
  assertEquals(modlogLevel < piiLevel, true, "INTERNAL should be less than CONFIDENTIAL");
});

// ─── API Response Classification: Posts ──────────────────────────────────────

Deno.test("classification: fetchPosts response carries PUBLIC", async () => {
  const { client } = createClassifiedMockClient({
    "/hot": {
      data: {
        children: [{
          data: {
            id: "p1",
            subreddit: "test",
            title: "Test Post",
            author: "user1",
            selftext: "content",
            url: "https://reddit.com/r/test/p1",
            permalink: "/r/test/comments/p1/",
            score: 10,
            num_comments: 2,
            created_utc: 1700000000,
            over_18: false,
          },
        }],
      },
    },
  });

  const result = await client.fetchPosts("test");
  assertEquals(result.ok, true);
  if (result.ok) {
    assertEquals(result.value[0].classification, "PUBLIC");
  }
});

// ─── API Response Classification: Post + Comments ────────────────────────────

Deno.test("classification: fetchPost response carries PUBLIC for post and comments", async () => {
  const { client } = createClassifiedMockClient({
    "/comments/": [
      {
        data: {
          children: [{
            data: {
              id: "p1",
              subreddit: "test",
              title: "Test",
              author: "user1",
              selftext: "content",
              url: "https://reddit.com/r/test/p1",
              permalink: "/r/test/comments/p1/",
              score: 10,
              num_comments: 1,
              created_utc: 1700000000,
              over_18: false,
            },
          }],
        },
      },
      {
        data: {
          children: [{
            kind: "t1",
            data: {
              id: "c1",
              link_id: "t3_p1",
              author: "commenter",
              body: "Nice!",
              score: 3,
              created_utc: 1700001000,
            },
          }],
        },
      },
    ],
  });

  const result = await client.fetchPost("p1");
  assertEquals(result.ok, true);
  if (result.ok) {
    assertEquals(result.value.post.classification, "PUBLIC");
    assertEquals(result.value.comments[0].classification, "PUBLIC");
  }
});

// ─── API Response Classification: Mod Queue ──────────────────────────────────

Deno.test("classification: fetchModQueue response carries INTERNAL", async () => {
  const { client } = createClassifiedMockClient({
    "/modqueue": {
      data: {
        children: [{
          kind: "t1",
          data: {
            id: "mq1",
            name: "t1_mq1",
            subreddit: "test",
            author: "user1",
            body: "reported content",
            mod_reports: [["Rule 1", "mod1"]],
            user_reports: [],
            created_utc: 1700000000,
          },
        }],
      },
    },
  });

  const result = await client.fetchModQueue("test");
  assertEquals(result.ok, true);
  if (result.ok) {
    assertEquals(result.value[0].classification, "INTERNAL");
  }
});

// ─── API Response Classification: Mod Log ────────────────────────────────────

Deno.test("classification: fetchModLog response carries INTERNAL", async () => {
  const { client } = createClassifiedMockClient({
    "/log": {
      data: {
        children: [{
          data: {
            id: "ml1",
            action: "removelink",
            mod: "mod1",
            target_author: "user1",
            target_permalink: "/r/test/comments/p1/",
            details: "spam",
            created_utc: 1700000000,
          },
        }],
      },
    },
  });

  const result = await client.fetchModLog("test");
  assertEquals(result.ok, true);
  if (result.ok) {
    assertEquals(result.value[0].classification, "INTERNAL");
  }
});

// ─── API Response Classification: User Info ──────────────────────────────────

Deno.test("classification: fetchUserInfo response carries PUBLIC (no PII)", async () => {
  const { client } = createClassifiedMockClient({
    "/about": {
      data: {
        name: "user1",
        created_utc: 1500000000,
        link_karma: 100,
        comment_karma: 200,
        is_mod: false,
        icon_img: "https://reddit.com/avatar.png",
      },
    },
  });

  const result = await client.fetchUserInfo("user1");
  assertEquals(result.ok, true);
  if (result.ok) {
    assertEquals(result.value.classification, "PUBLIC");
  }
});

// ─── Taint Escalation Boundaries ─────────────────────────────────────────────

Deno.test("classification: modqueue access should produce INTERNAL floor for session taint", () => {
  // This verifies the classification that would trigger taint escalation
  // The actual taint escalation happens in the policy hook layer
  const modqueueClassification = redditContentClassification("modqueue");
  assertEquals(modqueueClassification, "INTERNAL");
  // INTERNAL > PUBLIC, so accessing modqueue should escalate session taint
});

Deno.test("classification: public content does not require taint escalation from PUBLIC", () => {
  const publicClassification = redditContentClassification("public_content");
  assertEquals(publicClassification, "PUBLIC");
  // PUBLIC == PUBLIC, so no taint escalation needed
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

function createClassifiedMockClient(
  routes: Record<string, unknown>,
) {
  const fetchFn = (
    url: string | URL | Request,
    _init?: RequestInit,
  ): Promise<Response> => {
    const urlStr = String(url);

    // Token refresh
    if (urlStr.includes("/api/v1/access_token")) {
      return Promise.resolve(
        new Response(
          JSON.stringify({ access_token: "tok", expires_in: 3600 }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
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

  const client = createRedditClient({
    clientId: "test",
    clientSecret: "test",
    refreshToken: "test",
    username: "testbot",
    fetchFn,
    rateLimiter: createRateLimiter({ maxRequests: 1000 }),
  });

  return { client };
}
