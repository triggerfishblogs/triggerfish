/**
 * Tests for the release_notes LLM tool.
 *
 * Verifies tool definitions, executor behavior with mock fetcher,
 * and error handling.
 */
import { assertEquals, assert, assertStringIncludes } from "@std/assert";
import {
  createReleaseNotesToolExecutor,
  getReleaseNotesToolDefinitions,
  RELEASE_NOTES_SYSTEM_PROMPT,
} from "../../src/tools/release_notes.ts";
import type {
  ReleaseNoteRange,
  ReleaseNotesResult,
} from "../../src/tools/release_notes.ts";

// ─── Tool definitions ────────────────────────────────────────────────────────

Deno.test("release_notes: tool definitions include release_notes", () => {
  const defs = getReleaseNotesToolDefinitions();
  assertEquals(defs.length, 1);
  assertEquals(defs[0].name, "release_notes");
  assert(defs[0].parameters.from_version !== undefined);
  assert(defs[0].parameters.to_version !== undefined);
});

Deno.test("release_notes: system prompt is non-empty", () => {
  assert(RELEASE_NOTES_SYSTEM_PROMPT.length > 0);
  assertStringIncludes(RELEASE_NOTES_SYSTEM_PROMPT, "release_notes");
});

// ─── Executor with mock fetcher ──────────────────────────────────────────────

function createMockFetcher(
  response: ReleaseNotesResult,
): (from: string, to: string) => Promise<ReleaseNotesResult> {
  return (_from: string, _to: string) => Promise.resolve(response);
}

const MOCK_RANGE: ReleaseNoteRange = {
  from: "v0.2.16",
  to: "v0.3.3",
  releases: [
    {
      tag: "v0.3.0",
      name: "v0.3.0",
      body: "Major release with new features",
      publishedAt: "2026-01-15T00:00:00Z",
    },
    {
      tag: "v0.3.3",
      name: "Bug Fix Release",
      body: "Fixed critical issues",
      publishedAt: "2026-02-01T00:00:00Z",
    },
  ],
};

Deno.test("release_notes executor: returns null for non-matching tool name", async () => {
  const fetcher = createMockFetcher({ ok: true, value: MOCK_RANGE });
  const executor = createReleaseNotesToolExecutor(fetcher, "v0.3.3");
  const result = await executor("some_other_tool", {});
  assertEquals(result, null);
});

Deno.test("release_notes executor: returns formatted markdown for valid request", async () => {
  const fetcher = createMockFetcher({ ok: true, value: MOCK_RANGE });
  const executor = createReleaseNotesToolExecutor(fetcher, "v0.3.3");
  const result = await executor("release_notes", { from_version: "v0.2.16" });
  assert(result !== null);
  assertStringIncludes(result!, "Major release");
  assertStringIncludes(result!, "Fixed critical issues");
  assertStringIncludes(result!, "v0.3.0");
});

Deno.test("release_notes executor: uses current version as default to_version", async () => {
  let capturedTo = "";
  const fetcher = (from: string, to: string) => {
    capturedTo = to;
    return Promise.resolve({ ok: true, value: MOCK_RANGE } as ReleaseNotesResult);
  };
  const executor = createReleaseNotesToolExecutor(fetcher, "v0.5.0");
  await executor("release_notes", { from_version: "v0.3.0" });
  assertEquals(capturedTo, "v0.5.0");
});

Deno.test("release_notes executor: uses explicit to_version when provided", async () => {
  let capturedTo = "";
  const fetcher = (from: string, to: string) => {
    capturedTo = to;
    return Promise.resolve({ ok: true, value: MOCK_RANGE } as ReleaseNotesResult);
  };
  const executor = createReleaseNotesToolExecutor(fetcher, "v0.5.0");
  await executor("release_notes", {
    from_version: "v0.2.16",
    to_version: "v0.3.3",
  });
  assertEquals(capturedTo, "v0.3.3");
});

Deno.test("release_notes executor: errors on missing from_version", async () => {
  const fetcher = createMockFetcher({ ok: true, value: MOCK_RANGE });
  const executor = createReleaseNotesToolExecutor(fetcher, "v0.3.3");
  const result = await executor("release_notes", {});
  assert(result !== null);
  assertStringIncludes(result!, "Error");
  assertStringIncludes(result!, "from_version");
});

Deno.test("release_notes executor: errors on empty from_version", async () => {
  const fetcher = createMockFetcher({ ok: true, value: MOCK_RANGE });
  const executor = createReleaseNotesToolExecutor(fetcher, "v0.3.3");
  const result = await executor("release_notes", { from_version: "" });
  assert(result !== null);
  assertStringIncludes(result!, "Error");
});

Deno.test("release_notes executor: errors when running dev build without to_version", async () => {
  const fetcher = createMockFetcher({ ok: true, value: MOCK_RANGE });
  const executor = createReleaseNotesToolExecutor(fetcher, "dev");
  const result = await executor("release_notes", { from_version: "v0.2.16" });
  assert(result !== null);
  assertStringIncludes(result!, "development build");
});

Deno.test("release_notes executor: propagates fetcher errors", async () => {
  const fetcher = createMockFetcher({
    ok: false,
    error: "GitHub API returned HTTP 403 fetching releases",
  });
  const executor = createReleaseNotesToolExecutor(fetcher, "v0.3.3");
  const result = await executor("release_notes", { from_version: "v0.2.16" });
  assert(result !== null);
  assertStringIncludes(result!, "Error");
  assertStringIncludes(result!, "403");
});

Deno.test("release_notes executor: handles empty release range", async () => {
  const emptyRange: ReleaseNoteRange = {
    from: "v0.9.0",
    to: "v1.0.0",
    releases: [],
  };
  const fetcher = createMockFetcher({ ok: true, value: emptyRange });
  const executor = createReleaseNotesToolExecutor(fetcher, "v1.0.0");
  const result = await executor("release_notes", { from_version: "v0.9.0" });
  assert(result !== null);
  assertStringIncludes(result!, "No releases found");
});
