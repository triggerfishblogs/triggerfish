/**
 * Reddit tools tests — definitions, validation, fallthrough.
 *
 * @module
 */
import { assertEquals } from "@std/assert";
import {
  createRedditToolExecutor,
  getRedditToolDefinitions,
  REDDIT_TOOLS_SYSTEM_PROMPT,
} from "../../src/integrations/reddit/tools.ts";
import { createMockToolContext } from "./tools_helpers_test.ts";

// ─── Tool Definitions ────────────────────────────────────────────────────────

Deno.test("getRedditToolDefinitions: returns 1 consolidated tool definition", () => {
  const defs = getRedditToolDefinitions();
  assertEquals(defs.length, 1);
});

Deno.test("getRedditToolDefinitions: tool has reddit_ prefix", () => {
  const defs = getRedditToolDefinitions();
  for (const def of defs) {
    assertEquals(
      def.name.startsWith("reddit_"),
      true,
      `${def.name} missing reddit_ prefix`,
    );
  }
});

Deno.test("getRedditToolDefinitions: tool has description", () => {
  const defs = getRedditToolDefinitions();
  for (const def of defs) {
    assertEquals(typeof def.description, "string");
    assertEquals(
      def.description.length > 0,
      true,
      `${def.name} has empty description`,
    );
  }
});

Deno.test("getRedditToolDefinitions: expected tool names present", () => {
  const defs = getRedditToolDefinitions();
  const names = new Set(defs.map((d) => d.name));
  assertEquals(names.has("reddit_read"), true, "Missing tool: reddit_read");
});

Deno.test("getRedditToolDefinitions: tool has required action parameter", () => {
  const defs = getRedditToolDefinitions();
  for (const def of defs) {
    const actionParam = def.parameters.action;
    assertEquals(
      actionParam !== undefined,
      true,
      `${def.name} missing action parameter`,
    );
    assertEquals(actionParam.required, true, `${def.name} action not required`);
    assertEquals(actionParam.type, "string", `${def.name} action not string`);
  }
});

// ─── System Prompt ───────────────────────────────────────────────────────────

Deno.test("REDDIT_TOOLS_SYSTEM_PROMPT: is a non-empty string", () => {
  assertEquals(typeof REDDIT_TOOLS_SYSTEM_PROMPT, "string");
  assertEquals(REDDIT_TOOLS_SYSTEM_PROMPT.length > 0, true);
});

Deno.test("REDDIT_TOOLS_SYSTEM_PROMPT: mentions classification mapping", () => {
  assertEquals(REDDIT_TOOLS_SYSTEM_PROMPT.includes("PUBLIC"), true);
  assertEquals(REDDIT_TOOLS_SYSTEM_PROMPT.includes("INTERNAL"), true);
  assertEquals(REDDIT_TOOLS_SYSTEM_PROMPT.includes("CONFIDENTIAL"), true);
});

// ─── Fallthrough ─────────────────────────────────────────────────────────────

Deno.test("createRedditToolExecutor: returns null for non-reddit tools", async () => {
  const executor = createRedditToolExecutor(undefined);
  const result = await executor("web_search", { query: "test" });
  assertEquals(result, null);
});

Deno.test("createRedditToolExecutor: returns null for unknown reddit_ tool", async () => {
  const ctx = createMockToolContext();
  const executor = createRedditToolExecutor(ctx);
  const result = await executor("reddit_unknown_tool", { action: "list" });
  assertEquals(result, null);
});

// ─── Not Configured ──────────────────────────────────────────────────────────

Deno.test("createRedditToolExecutor: returns error when not configured", async () => {
  const executor = createRedditToolExecutor(undefined);
  const result = await executor("reddit_read", { action: "posts" });
  assertEquals(typeof result, "string");
  assertEquals(result!.includes("not configured"), true);
});

// ─── Action Validation ──────────────────────────────────────────────────────

Deno.test("executor: returns error when action is missing", async () => {
  const ctx = createMockToolContext();
  const executor = createRedditToolExecutor(ctx);
  const result = await executor("reddit_read", {});
  assertEquals(result!.includes("action"), true);
});

Deno.test("executor: returns error for unknown action", async () => {
  const ctx = createMockToolContext();
  const executor = createRedditToolExecutor(ctx);
  const result = await executor("reddit_read", { action: "nonexistent" });
  assertEquals(result!.includes("unknown action"), true);
  assertEquals(result!.includes("nonexistent"), true);
});

// ─── Parameter Validation ────────────────────────────────────────────────────

Deno.test("executor: subreddit_info requires subreddit", async () => {
  const ctx = createMockToolContext();
  const executor = createRedditToolExecutor(ctx);
  const result = await executor("reddit_read", { action: "subreddit_info" });
  assertEquals(result!.includes("Error"), true);
  assertEquals(result!.includes("subreddit"), true);
});

Deno.test("executor: posts requires subreddit", async () => {
  const ctx = createMockToolContext();
  const executor = createRedditToolExecutor(ctx);
  const result = await executor("reddit_read", { action: "posts" });
  assertEquals(result!.includes("Error"), true);
  assertEquals(result!.includes("subreddit"), true);
});

Deno.test("executor: post requires post_id", async () => {
  const ctx = createMockToolContext();
  const executor = createRedditToolExecutor(ctx);
  const result = await executor("reddit_read", { action: "post" });
  assertEquals(result!.includes("Error"), true);
  assertEquals(result!.includes("post_id"), true);
});

Deno.test("executor: modqueue requires subreddit", async () => {
  const ctx = createMockToolContext();
  const executor = createRedditToolExecutor(ctx);
  const result = await executor("reddit_read", { action: "modqueue" });
  assertEquals(result!.includes("Error"), true);
  assertEquals(result!.includes("subreddit"), true);
});

Deno.test("executor: modlog requires subreddit", async () => {
  const ctx = createMockToolContext();
  const executor = createRedditToolExecutor(ctx);
  const result = await executor("reddit_read", { action: "modlog" });
  assertEquals(result!.includes("Error"), true);
  assertEquals(result!.includes("subreddit"), true);
});

Deno.test("executor: user_info requires username", async () => {
  const ctx = createMockToolContext();
  const executor = createRedditToolExecutor(ctx);
  const result = await executor("reddit_read", { action: "user_info" });
  assertEquals(result!.includes("Error"), true);
  assertEquals(result!.includes("username"), true);
});
