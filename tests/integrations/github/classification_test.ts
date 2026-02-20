/**
 * GitHub classification boundary tests.
 *
 * Tests the pure visibilityToClassification function and verifies
 * that API responses carry the correct _classification field.
 */
import { assertEquals } from "@std/assert";
import { visibilityToClassification, createGitHubClient } from "../../../src/integrations/github/client.ts";
import type { ClassificationLevel } from "../../../src/core/types/classification.ts";

// ─── Pure Function: Default Mapping ──────────────────────────────────────────

Deno.test("classification: public repos map to PUBLIC", () => {
  assertEquals(visibilityToClassification("public", "any/repo"), "PUBLIC");
});

Deno.test("classification: private repos map to CONFIDENTIAL", () => {
  assertEquals(visibilityToClassification("private", "any/repo"), "CONFIDENTIAL");
});

Deno.test("classification: internal repos map to INTERNAL", () => {
  assertEquals(visibilityToClassification("internal", "any/repo"), "INTERNAL");
});

// ─── Pure Function: Per-Repo Overrides ───────────────────────────────────────

Deno.test("classification: per-repo override elevates public to RESTRICTED", () => {
  const config = {
    overrides: { "acme/top-secret": "RESTRICTED" as ClassificationLevel },
  };
  assertEquals(
    visibilityToClassification("public", "acme/top-secret", config),
    "RESTRICTED",
  );
});

Deno.test("classification: per-repo override lowers private to PUBLIC", () => {
  const config = {
    overrides: { "acme/open-source": "PUBLIC" as ClassificationLevel },
  };
  assertEquals(
    visibilityToClassification("private", "acme/open-source", config),
    "PUBLIC",
  );
});

Deno.test("classification: override only applies to matching repo", () => {
  const config = {
    overrides: { "acme/secret": "RESTRICTED" as ClassificationLevel },
  };
  // Different repo, same org
  assertEquals(
    visibilityToClassification("private", "acme/other", config),
    "CONFIDENTIAL",
  );
});

Deno.test("classification: no config means default mapping", () => {
  assertEquals(
    visibilityToClassification("private", "any/repo", undefined),
    "CONFIDENTIAL",
  );
});

Deno.test("classification: empty overrides means default mapping", () => {
  assertEquals(
    visibilityToClassification("private", "any/repo", { overrides: {} }),
    "CONFIDENTIAL",
  );
});

// ─── API Responses Carry Classification ──────────────────────────────────────

Deno.test("classification: listRepos response carries classification for public", async () => {
  const rawRepos = [{
    id: 1,
    full_name: "o/pub",
    description: null,
    visibility: "public",
    private: false,
    default_branch: "main",
    html_url: "https://github.com/o/pub",
  }];

  const client = createGitHubClient({
    token: "ghp_test",
    fetchFn: () => Promise.resolve(
      new Response(JSON.stringify(rawRepos), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    ),
  });

  const result = await client.listRepos();
  assertEquals(result.ok, true);
  if (result.ok) {
    assertEquals(result.value[0].classification, "PUBLIC");
  }
});

Deno.test("classification: listRepos response carries CONFIDENTIAL for private", async () => {
  const rawRepos = [{
    id: 2,
    full_name: "o/priv",
    description: null,
    visibility: "private",
    private: true,
    default_branch: "main",
    html_url: "https://github.com/o/priv",
  }];

  const client = createGitHubClient({
    token: "ghp_test",
    fetchFn: () => Promise.resolve(
      new Response(JSON.stringify(rawRepos), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    ),
  });

  const result = await client.listRepos();
  assertEquals(result.ok, true);
  if (result.ok) {
    assertEquals(result.value[0].classification, "CONFIDENTIAL");
  }
});

Deno.test("classification: searchCode carries CONFIDENTIAL for private repos", async () => {
  const rawSearch = {
    items: [{
      path: "src/main.ts",
      html_url: "https://github.com/o/r/blob/main/src/main.ts",
      repository: { full_name: "o/r", visibility: "private", private: true },
      text_matches: [],
    }],
  };

  const client = createGitHubClient({
    token: "ghp_test",
    fetchFn: () => Promise.resolve(
      new Response(JSON.stringify(rawSearch), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    ),
  });

  const result = await client.searchCode("test");
  assertEquals(result.ok, true);
  if (result.ok) {
    assertEquals(result.value[0].classification, "CONFIDENTIAL");
  }
});

Deno.test("classification: searchCode carries PUBLIC for public repos", async () => {
  const rawSearch = {
    items: [{
      path: "README.md",
      html_url: "https://github.com/o/pub/blob/main/README.md",
      repository: { full_name: "o/pub", visibility: "public", private: false },
      text_matches: [],
    }],
  };

  const client = createGitHubClient({
    token: "ghp_test",
    fetchFn: () => Promise.resolve(
      new Response(JSON.stringify(rawSearch), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    ),
  });

  const result = await client.searchCode("readme");
  assertEquals(result.ok, true);
  if (result.ok) {
    assertEquals(result.value[0].classification, "PUBLIC");
  }
});

// ─── Classification with Client Config Overrides ─────────────────────────────

Deno.test("classification: client uses config overrides in listRepos", async () => {
  const rawRepos = [{
    id: 1,
    full_name: "acme/secret",
    description: null,
    visibility: "public",
    private: false,
    default_branch: "main",
    html_url: "https://github.com/acme/secret",
  }];

  const client = createGitHubClient({
    token: "ghp_test",
    fetchFn: () => Promise.resolve(
      new Response(JSON.stringify(rawRepos), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    ),
    classificationConfig: {
      overrides: { "acme/secret": "RESTRICTED" },
    },
  });

  const result = await client.listRepos();
  assertEquals(result.ok, true);
  if (result.ok) {
    assertEquals(result.value[0].classification, "RESTRICTED");
  }
});
