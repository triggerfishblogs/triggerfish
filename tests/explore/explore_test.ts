/**
 * Tests for the explore tool — structured codebase understanding.
 *
 * Covers: tool definitions, executor chain behavior, depth levels,
 * result assembly, token budget truncation, focus parameter handling,
 * LLM summary vs template fallback, and plan mode integration.
 */
import { assertEquals, assert, assertStringIncludes } from "@std/assert";
import {
  getExploreToolDefinitions,
  createExploreToolExecutor,
  buildAgentTasks,
  assembleResult,
  EXPLORE_SYSTEM_PROMPT,
} from "../../src/tools/explore/mod.ts";
import type { ExploreResult } from "../../src/tools/explore/mod.ts";
import { PLAN_ALLOWED_TOOLS } from "../../src/agent/plan_types.ts";

// ─── Tool definitions ──────────────────────────────────────────

Deno.test("getExploreToolDefinitions returns correct tool definition", () => {
  const defs = getExploreToolDefinitions();
  assertEquals(defs.length, 1);
  assertEquals(defs[0].name, "explore");
  assert(defs[0].description.length > 0);
  assert(defs[0].parameters.path);
  assertEquals(defs[0].parameters.path.required, true);
  assert(defs[0].parameters.focus);
  assertEquals(defs[0].parameters.focus.required, false);
  assert(defs[0].parameters.depth);
  assertEquals(defs[0].parameters.depth.required, false);
});

// ─── Executor: chain behavior ──────────────────────────────────

Deno.test("createExploreToolExecutor returns null for non-explore tool names", async () => {
  // deno-lint-ignore require-await
  const executor = createExploreToolExecutor(async () => "");
  const result = await executor("read_file", { path: "/tmp" });
  assertEquals(result, null);
});

Deno.test("createExploreToolExecutor returns null for unknown tool names", async () => {
  // deno-lint-ignore require-await
  const executor = createExploreToolExecutor(async () => "");
  const result = await executor("some_other_tool", { foo: "bar" });
  assertEquals(result, null);
});

// ─── Executor: validation ──────────────────────────────────────

Deno.test("Executor validates required path parameter", async () => {
  // deno-lint-ignore require-await
  const executor = createExploreToolExecutor(async () => "response");
  const result = await executor("explore", {});
  assert(result !== null);
  assertStringIncludes(result!, "Error");
  assertStringIncludes(result!, "path");
});

Deno.test("Executor validates empty path parameter", async () => {
  // deno-lint-ignore require-await
  const executor = createExploreToolExecutor(async () => "response");
  const result = await executor("explore", { path: "" });
  assert(result !== null);
  assertStringIncludes(result!, "Error");
});

Deno.test("Executor defaults depth to standard when not provided", async () => {
  const calls: string[] = [];
  // deno-lint-ignore require-await
  const executor = createExploreToolExecutor(async (task) => {
    calls.push(task);
    return "agent response";
  });
  const result = await executor("explore", { path: "/tmp/test" });
  assert(result !== null);
  const parsed = JSON.parse(result!) as ExploreResult;
  assertEquals(parsed.depth, "standard");
});

// ─── Agent task counts by depth ────────────────────────────────

Deno.test("Shallow depth spawns 2 sub-agents", async () => {
  let callCount = 0;
  // deno-lint-ignore require-await
  const executor = createExploreToolExecutor(async () => {
    callCount++;
    return "response";
  });
  await executor("explore", { path: "/tmp", depth: "shallow" });
  assertEquals(callCount, 2);
});

Deno.test("Standard depth spawns 3 sub-agents (no focus)", async () => {
  let callCount = 0;
  // deno-lint-ignore require-await
  const executor = createExploreToolExecutor(async () => {
    callCount++;
    return "response";
  });
  await executor("explore", { path: "/tmp", depth: "standard" });
  assertEquals(callCount, 3);
});

Deno.test("Standard depth spawns 4 sub-agents (with focus)", async () => {
  let callCount = 0;
  // deno-lint-ignore require-await
  const executor = createExploreToolExecutor(async () => {
    callCount++;
    return "response";
  });
  await executor("explore", {
    path: "/tmp",
    depth: "standard",
    focus: "auth patterns",
  });
  assertEquals(callCount, 4);
});

Deno.test("Deep depth spawns 5 sub-agents (no focus)", async () => {
  let callCount = 0;
  // deno-lint-ignore require-await
  const executor = createExploreToolExecutor(async () => {
    callCount++;
    return "response";
  });
  await executor("explore", { path: "/tmp", depth: "deep" });
  assertEquals(callCount, 5);
});

Deno.test("Deep depth spawns 6 sub-agents (with focus)", async () => {
  let callCount = 0;
  // deno-lint-ignore require-await
  const executor = createExploreToolExecutor(async () => {
    callCount++;
    return "response";
  });
  await executor("explore", {
    path: "/tmp",
    depth: "deep",
    focus: "test structure",
  });
  assertEquals(callCount, 6);
});

// ─── buildAgentTasks ───────────────────────────────────────────

Deno.test("buildAgentTasks returns correct task names for each depth", () => {
  const shallow = buildAgentTasks("/tmp", "shallow");
  assertEquals(shallow.map((t) => t.name), ["tree", "manifest"]);

  const standard = buildAgentTasks("/tmp", "standard");
  assertEquals(standard.map((t) => t.name), ["tree", "manifest", "pattern"]);

  const standardFocus = buildAgentTasks("/tmp", "standard", "auth");
  assertEquals(standardFocus.map((t) => t.name), [
    "tree",
    "manifest",
    "pattern",
    "focus",
  ]);

  const deep = buildAgentTasks("/tmp", "deep");
  assertEquals(deep.map((t) => t.name), [
    "tree",
    "manifest",
    "pattern",
    "import",
    "git",
  ]);

  const deepFocus = buildAgentTasks("/tmp", "deep", "testing");
  assertEquals(deepFocus.map((t) => t.name), [
    "tree",
    "manifest",
    "pattern",
    "focus",
    "import",
    "git",
  ]);
});

// ─── Focus parameter in prompts ────────────────────────────────

Deno.test("Focus parameter appears in agent prompts when provided", () => {
  const tasks = buildAgentTasks("/src", "standard", "how auth works");
  const focusTask = tasks.find((t) => t.name === "focus");
  assert(focusTask !== undefined);
  assertStringIncludes(focusTask!.prompt, "how auth works");
});

Deno.test("No focus agent when focus not provided", () => {
  const tasks = buildAgentTasks("/src", "standard");
  const focusTask = tasks.find((t) => t.name === "focus");
  assertEquals(focusTask, undefined);
});

// ─── Result assembly ───────────────────────────────────────────

Deno.test("assembleResult produces valid structure", () => {
  const results = new Map<string, string>();
  results.set(
    "tree",
    `src/
├── mod.ts  # Barrel export
├── core/   # Core types
└── agent/  # LLM stuff`,
  );
  results.set(
    "manifest",
    `## Dependencies
- \`@std/assert\` v1.0

## Entry Points
- \`src/main.ts\` — CLI entry`,
  );
  results.set(
    "pattern",
    `**Error handling**: Uses Result<T,E> pattern throughout. Example: \`src/core/types/result.ts\`

**Module structure**: One concept per file with barrel exports via mod.ts. Example: \`src/core/mod.ts\``,
  );

  const result = assembleResult("/project", "standard", results);

  assertEquals(result.path, "/project");
  assertEquals(result.depth, "standard");
  assert(result.tree.length > 0);
  assert(result.key_files.length > 0);
  assert(result.patterns.length > 0);
  assertEquals(result.focus_findings, "");
});

Deno.test("assembleResult includes focus findings", () => {
  const results = new Map<string, string>();
  results.set("tree", "src/");
  results.set("manifest", "");
  results.set("pattern", "");
  results.set("focus", "Found auth patterns in src/auth/middleware.ts");

  const result = assembleResult("/project", "standard", results);
  assertStringIncludes(result.focus_findings, "auth patterns");
});

Deno.test("assembleResult includes git info in tree for deep exploration", () => {
  const results = new Map<string, string>();
  results.set("tree", "src/");
  results.set("manifest", "");
  results.set("git", "## Recent Commits\n- abc123 feat: add auth");

  const result = assembleResult("/project", "deep", results);
  assertStringIncludes(result.tree, "Git Status");
  assertStringIncludes(result.tree, "abc123");
});

// ─── Token budget truncation ───────────────────────────────────

Deno.test("key_files capped at 20", () => {
  const results = new Map<string, string>();
  // Generate tree with many key files
  const lines: string[] = [];
  for (let i = 0; i < 30; i++) {
    lines.push(`- \`file${i}.ts\` — Role ${i}`);
  }
  results.set("tree", lines.join("\n"));
  results.set("manifest", "");

  const result = assembleResult("/project", "standard", results);
  assert(result.key_files.length <= 20);
});

Deno.test("patterns capped at 8", () => {
  const results = new Map<string, string>();
  results.set("tree", "");
  results.set("manifest", "");
  // Generate many patterns
  const patternLines: string[] = [];
  for (let i = 0; i < 15; i++) {
    patternLines.push(
      `**Pattern${i}**: Description of pattern ${i}. Example: \`src/p${i}.ts\``,
    );
  }
  results.set("pattern", patternLines.join("\n\n"));

  const result = assembleResult("/project", "standard", results);
  assert(result.patterns.length <= 8);
});

Deno.test("tree truncated when too long", () => {
  const results = new Map<string, string>();
  const longTree = Array.from({ length: 300 }, (_, i) => `line ${i}`).join(
    "\n",
  );
  results.set("tree", longTree);
  results.set("manifest", "");

  const result = assembleResult("/project", "shallow", results);
  assertStringIncludes(result.tree, "truncated");
});

// ─── Summary generation ────────────────────────────────────────

Deno.test("llmTask used for summary when available", async () => {
  const executor = createExploreToolExecutor(
    // deno-lint-ignore require-await
    async () => "agent response",
    // deno-lint-ignore require-await
    async (_prompt: string) => "LLM-generated summary of the codebase.",
  );

  const result = await executor("explore", { path: "/tmp" });
  assert(result !== null);
  const parsed = JSON.parse(result!) as ExploreResult;
  assertEquals(parsed.summary, "LLM-generated summary of the codebase.");
});

Deno.test("Template fallback when llmTask not provided", async () => {
  // deno-lint-ignore require-await
  const executor = createExploreToolExecutor(async () => "agent response");
  const result = await executor("explore", { path: "/tmp" });
  assert(result !== null);
  const parsed = JSON.parse(result!) as ExploreResult;
  assertStringIncludes(parsed.summary, "Explored /tmp");
  assertStringIncludes(parsed.summary, "standard depth");
});

Deno.test("Template fallback when llmTask throws", async () => {
  const executor = createExploreToolExecutor(
    // deno-lint-ignore require-await
    async () => "agent response",
    // deno-lint-ignore require-await
    async () => {
      throw new Error("LLM unavailable");
    },
  );

  const result = await executor("explore", { path: "/tmp" });
  assert(result !== null);
  const parsed = JSON.parse(result!) as ExploreResult;
  assertStringIncludes(parsed.summary, "Explored /tmp");
});

// ─── Error handling ────────────────────────────────────────────

Deno.test("Executor handles sub-agent errors gracefully", async () => {
  // deno-lint-ignore require-await
  const executor = createExploreToolExecutor(async () => {
    throw new Error("spawn failed");
  });
  const result = await executor("explore", { path: "/tmp" });
  assert(result !== null);
  // Should still produce valid JSON even with error responses
  const parsed = JSON.parse(result!) as ExploreResult;
  assertEquals(parsed.path, "/tmp");
});

// ─── Plan mode integration ─────────────────────────────────────

Deno.test("explore is in PLAN_ALLOWED_TOOLS", () => {
  assert(PLAN_ALLOWED_TOOLS.includes("explore"));
});

// ─── System prompt ─────────────────────────────────────────────

Deno.test("EXPLORE_SYSTEM_PROMPT is non-empty and mentions explore", () => {
  assert(EXPLORE_SYSTEM_PROMPT.length > 0);
  assertStringIncludes(EXPLORE_SYSTEM_PROMPT, "explore");
});

// ─── Invalid depth handled ─────────────────────────────────────

Deno.test("Invalid depth defaults to standard", async () => {
  let callCount = 0;
  // deno-lint-ignore require-await
  const executor = createExploreToolExecutor(async () => {
    callCount++;
    return "response";
  });
  const result = await executor("explore", {
    path: "/tmp",
    depth: "ultra_deep",
  });
  assert(result !== null);
  const parsed = JSON.parse(result!) as ExploreResult;
  assertEquals(parsed.depth, "standard");
  // standard without focus = 3 agents
  assertEquals(callCount, 3);
});
