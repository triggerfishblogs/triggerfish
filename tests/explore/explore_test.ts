/**
 * Tests for the explore tool — single-agent codebase exploration.
 *
 * Covers: tool definitions, executor chain behavior, depth levels,
 * prompt construction, focus parameter handling, error handling,
 * adaptive budget computation, and plan mode integration.
 */
import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import {
  buildExplorePrompt,
  computeExploreIterationBudget,
  createExploreToolExecutor,
  EXPLORE_SYSTEM_PROMPT,
  getExploreToolDefinitions,
} from "../../src/tools/explore/mod.ts";
import { PLAN_ALLOWED_TOOLS } from "../../src/agent/plan/types.ts";

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
  const executor = createExploreToolExecutor({ spawnSubagent: async () => "" });
  const result = await executor("read_file", { path: "/tmp" });
  assertEquals(result, null);
});

Deno.test("createExploreToolExecutor returns null for unknown tool names", async () => {
  // deno-lint-ignore require-await
  const executor = createExploreToolExecutor({ spawnSubagent: async () => "" });
  const result = await executor("some_other_tool", { foo: "bar" });
  assertEquals(result, null);
});

// ─── Executor: validation ──────────────────────────────────────

Deno.test("Executor validates required path parameter", async () => {
  const executor = createExploreToolExecutor({
    // deno-lint-ignore require-await
    spawnSubagent: async () => "response",
  });
  const result = await executor("explore", {});
  assert(result !== null);
  assertStringIncludes(result!, "Error");
  assertStringIncludes(result!, "path");
});

Deno.test("Executor validates empty path parameter", async () => {
  const executor = createExploreToolExecutor({
    // deno-lint-ignore require-await
    spawnSubagent: async () => "response",
  });
  const result = await executor("explore", { path: "" });
  assert(result !== null);
  assertStringIncludes(result!, "Error");
});

// ─── Single agent spawning ─────────────────────────────────────

Deno.test("Executor spawns exactly one subagent per call", async () => {
  let callCount = 0;
  const executor = createExploreToolExecutor({
    // deno-lint-ignore require-await
    spawnSubagent: async () => {
      callCount++;
      return "exploration results";
    },
  });
  await executor("explore", { path: "/tmp/test" });
  assertEquals(callCount, 1);
});

Deno.test("Executor spawns one subagent regardless of depth", async () => {
  for (const depth of ["shallow", "standard", "deep"]) {
    let callCount = 0;
    const executor = createExploreToolExecutor({
      // deno-lint-ignore require-await
      spawnSubagent: async () => {
        callCount++;
        return "results";
      },
    });
    await executor("explore", { path: "/tmp", depth });
    assertEquals(callCount, 1, `depth=${depth} should spawn exactly 1 agent`);
  }
});

Deno.test("Executor spawns one subagent with focus parameter", async () => {
  let callCount = 0;
  const executor = createExploreToolExecutor({
    // deno-lint-ignore require-await
    spawnSubagent: async () => {
      callCount++;
      return "focus results";
    },
  });
  await executor("explore", {
    path: "/tmp",
    depth: "standard",
    focus: "auth patterns",
  });
  assertEquals(callCount, 1);
});

// ─── Agent response passthrough ────────────────────────────────

Deno.test("Executor returns agent response directly", async () => {
  const agentResponse = "## Directory Structure\nsrc/\n├── core/\n└── agent/";
  const executor = createExploreToolExecutor({
    // deno-lint-ignore require-await
    spawnSubagent: async () => agentResponse,
  });
  const result = await executor("explore", { path: "/tmp" });
  assertEquals(result, agentResponse);
});

Deno.test("Invalid depth defaults to standard", async () => {
  let receivedPrompt = "";
  const executor = createExploreToolExecutor({
    // deno-lint-ignore require-await
    spawnSubagent: async (prompt) => {
      receivedPrompt = prompt;
      return "response";
    },
  });
  await executor("explore", { path: "/tmp", depth: "ultra_deep" });
  // Standard depth includes pattern detection instructions
  assertStringIncludes(receivedPrompt, "Detect coding patterns");
});

// ─── buildExplorePrompt ────────────────────────────────────────

Deno.test("Shallow prompt includes path and tree instructions", () => {
  const prompt = buildExplorePrompt("/project", "shallow");
  assertStringIncludes(prompt, "/project");
  assertStringIncludes(prompt, "directory structure");
  assertStringIncludes(prompt, "## Directory Structure");
  assertStringIncludes(prompt, "## Key Files");
});

Deno.test("Shallow prompt excludes standard-depth sections", () => {
  const prompt = buildExplorePrompt("/project", "shallow");
  assert(!prompt.includes("## Dependencies"));
  assert(!prompt.includes("## Patterns"));
  assert(!prompt.includes("Detect coding patterns"));
});

Deno.test("Standard prompt includes patterns and dependencies", () => {
  const prompt = buildExplorePrompt("/project", "standard");
  assertStringIncludes(prompt, "Detect coding patterns");
  assertStringIncludes(prompt, "## Dependencies");
  assertStringIncludes(prompt, "## Patterns & Conventions");
});

Deno.test("Standard prompt excludes deep-only sections", () => {
  const prompt = buildExplorePrompt("/project", "standard");
  assert(!prompt.includes("## Module Dependencies"));
  assert(!prompt.includes("## Git Status"));
  assert(!prompt.includes("git log"));
});

Deno.test("Deep prompt includes all sections", () => {
  const prompt = buildExplorePrompt("/project", "deep");
  assertStringIncludes(prompt, "## Directory Structure");
  assertStringIncludes(prompt, "## Dependencies");
  assertStringIncludes(prompt, "## Patterns & Conventions");
  assertStringIncludes(prompt, "## Module Dependencies");
  assertStringIncludes(prompt, "## Git Status");
  assertStringIncludes(prompt, "git log");
  assertStringIncludes(prompt, "Trace imports");
});

Deno.test("Focus parameter appears in prompt when provided", () => {
  const prompt = buildExplorePrompt("/src", "standard", "how auth works");
  assertStringIncludes(prompt, "how auth works");
  assertStringIncludes(prompt, "Priority focus");
});

Deno.test("No focus instructions when focus not provided", () => {
  const prompt = buildExplorePrompt("/src", "standard");
  assert(!prompt.includes("Priority focus"));
});

// ─── Error handling ────────────────────────────────────────────

Deno.test("Executor handles sub-agent errors gracefully", async () => {
  const executor = createExploreToolExecutor({
    // deno-lint-ignore require-await
    spawnSubagent: async () => {
      throw new Error("spawn failed");
    },
  });
  const result = await executor("explore", { path: "/tmp" });
  assert(result !== null);
  assertStringIncludes(result!, "Explore agent error");
  assertStringIncludes(result!, "spawn failed");
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

// ─── Prompt passes path to agent ───────────────────────────────

Deno.test("Subagent receives prompt containing the target path", async () => {
  let receivedPrompt = "";
  const executor = createExploreToolExecutor({
    // deno-lint-ignore require-await
    spawnSubagent: async (prompt) => {
      receivedPrompt = prompt;
      return "results";
    },
  });
  await executor("explore", { path: "/var/project/src" });
  assertStringIncludes(receivedPrompt, "/var/project/src");
});

Deno.test("Subagent prompt instructs read-only tool usage", async () => {
  let receivedPrompt = "";
  const executor = createExploreToolExecutor({
    // deno-lint-ignore require-await
    spawnSubagent: async (prompt) => {
      receivedPrompt = prompt;
      return "results";
    },
  });
  await executor("explore", { path: "/tmp" });
  assertStringIncludes(receivedPrompt, "read-only tools");
});

// ─── Adaptive budget computation ───────────────────────────────

Deno.test("computeExploreIterationBudget: null entryCount returns default 5", () => {
  assertEquals(computeExploreIterationBudget(null, "standard"), 5);
  assertEquals(computeExploreIterationBudget(null, "shallow"), 5);
  assertEquals(computeExploreIterationBudget(null, "deep"), 5);
});

Deno.test("computeExploreIterationBudget: shallow always returns 3", () => {
  assertEquals(computeExploreIterationBudget(0, "shallow"), 3);
  assertEquals(computeExploreIterationBudget(3, "shallow"), 3);
  assertEquals(computeExploreIterationBudget(20, "shallow"), 3);
  assertEquals(computeExploreIterationBudget(100, "shallow"), 3);
});

Deno.test("computeExploreIterationBudget: standard uses entry count brackets", () => {
  // 0-5 entries → 3
  assertEquals(computeExploreIterationBudget(0, "standard"), 3);
  assertEquals(computeExploreIterationBudget(5, "standard"), 3);
  // 6-15 entries → 5
  assertEquals(computeExploreIterationBudget(6, "standard"), 5);
  assertEquals(computeExploreIterationBudget(15, "standard"), 5);
  // 16-30 entries → 7
  assertEquals(computeExploreIterationBudget(16, "standard"), 7);
  assertEquals(computeExploreIterationBudget(30, "standard"), 7);
  // 31+ entries → 10
  assertEquals(computeExploreIterationBudget(31, "standard"), 10);
  assertEquals(computeExploreIterationBudget(200, "standard"), 10);
});

Deno.test("computeExploreIterationBudget: deep adds 3 to base, capped at 12", () => {
  // 0-5 entries → base 3 + 3 = 6
  assertEquals(computeExploreIterationBudget(3, "deep"), 6);
  // 6-15 entries → base 5 + 3 = 8
  assertEquals(computeExploreIterationBudget(10, "deep"), 8);
  // 16-30 entries → base 7 + 3 = 10
  assertEquals(computeExploreIterationBudget(20, "deep"), 10);
  // 31+ entries → base 10 + 3 = 13 → capped at 12
  assertEquals(computeExploreIterationBudget(50, "deep"), 12);
});

// ─── Preflight integration ─────────────────────────────────────

Deno.test("Executor passes computed budget as maxIterations to spawnSubagent", async () => {
  let receivedOpts: { readonly maxIterations?: number } | undefined;
  const executor = createExploreToolExecutor({
    // deno-lint-ignore require-await
    spawnSubagent: async (_task, _tools, spawnOpts) => {
      receivedOpts = spawnOpts;
      return "results";
    },
    // deno-lint-ignore require-await
    preflightListDirectory: async () => "a.ts\nb.ts\nc.ts",
  });
  await executor("explore", { path: "/tmp", depth: "standard" });
  // 3 entries + standard → budget = 3
  assertEquals(receivedOpts?.maxIterations, 3);
});

Deno.test("Executor uses default budget when preflight returns null", async () => {
  let receivedOpts: { readonly maxIterations?: number } | undefined;
  const executor = createExploreToolExecutor({
    // deno-lint-ignore require-await
    spawnSubagent: async (_task, _tools, spawnOpts) => {
      receivedOpts = spawnOpts;
      return "results";
    },
    // deno-lint-ignore require-await
    preflightListDirectory: async () => null,
  });
  await executor("explore", { path: "/nonexistent", depth: "standard" });
  assertEquals(receivedOpts?.maxIterations, 5);
});

Deno.test("Executor uses default budget when preflight throws", async () => {
  let receivedOpts: { readonly maxIterations?: number } | undefined;
  const executor = createExploreToolExecutor({
    // deno-lint-ignore require-await
    spawnSubagent: async (_task, _tools, spawnOpts) => {
      receivedOpts = spawnOpts;
      return "results";
    },
    // deno-lint-ignore require-await
    preflightListDirectory: async () => {
      throw new Error("permission denied");
    },
  });
  await executor("explore", { path: "/tmp", depth: "standard" });
  assertEquals(receivedOpts?.maxIterations, 5);
});

Deno.test("Executor uses default budget when no preflight provided", async () => {
  let receivedOpts: { readonly maxIterations?: number } | undefined;
  const executor = createExploreToolExecutor({
    // deno-lint-ignore require-await
    spawnSubagent: async (_task, _tools, spawnOpts) => {
      receivedOpts = spawnOpts;
      return "results";
    },
  });
  await executor("explore", { path: "/tmp", depth: "standard" });
  assertEquals(receivedOpts?.maxIterations, 5);
});

Deno.test("Executor computes deep budget from large directory", async () => {
  let receivedOpts: { readonly maxIterations?: number } | undefined;
  // 35 entries → base 10, deep +3 = 13 → capped at 12
  const entries = Array.from({ length: 35 }, (_, i) => `file${i}.ts`).join(
    "\n",
  );
  const executor = createExploreToolExecutor({
    // deno-lint-ignore require-await
    spawnSubagent: async (_task, _tools, spawnOpts) => {
      receivedOpts = spawnOpts;
      return "results";
    },
    // deno-lint-ignore require-await
    preflightListDirectory: async () => entries,
  });
  await executor("explore", { path: "/tmp", depth: "deep" });
  assertEquals(receivedOpts?.maxIterations, 12);
});

Deno.test("Executor handles empty directory listing", async () => {
  let receivedOpts: { readonly maxIterations?: number } | undefined;
  const executor = createExploreToolExecutor({
    // deno-lint-ignore require-await
    spawnSubagent: async (_task, _tools, spawnOpts) => {
      receivedOpts = spawnOpts;
      return "results";
    },
    // deno-lint-ignore require-await
    preflightListDirectory: async () => "(empty directory)",
  });
  await executor("explore", { path: "/tmp/empty", depth: "standard" });
  // 0 entries → budget = 3
  assertEquals(receivedOpts?.maxIterations, 3);
});
