/**
 * Role-based tool filter tests.
 *
 * Verifies that filterToolsForRole correctly restricts owner-only tools
 * for non-owner sessions while passing all tools for owner sessions.
 */

import { assertEquals } from "@std/assert";
import {
  filterToolsForRole,
  OWNER_ONLY_TOOLS,
} from "../../src/gateway/tools/defs/role_filter.ts";
import type { ToolDefinition } from "../../src/core/types/tool.ts";

// ─── Fixtures ─────────────────────────────────────────────────────────────

function makeTool(name: string): ToolDefinition {
  return { name, description: `Tool: ${name}`, parameters: {} };
}

const ALL_TOOLS: readonly ToolDefinition[] = [
  makeTool("run_command"),
  makeTool("write_file"),
  makeTool("edit_file"),
  makeTool("browser_navigate"),
  makeTool("browser_snapshot"),
  makeTool("browser_click"),
  makeTool("browser_type"),
  makeTool("browser_select"),
  makeTool("browser_scroll"),
  makeTool("browser_wait"),
  makeTool("browser_describe"),
  makeTool("browser_close"),
  makeTool("memory_save"),
  makeTool("memory_delete"),
  makeTool("read_skill"),
  makeTool("cron_create"),
  makeTool("cron_delete"),
  makeTool("secret_save"),
  makeTool("secret_delete"),
  makeTool("subagent"),
  // Safe tools that non-owners should be able to use:
  makeTool("memory_search"),
  makeTool("memory_get"),
  makeTool("memory_list"),
  makeTool("web_search"),
  makeTool("web_fetch"),
  makeTool("todo_add"),
  makeTool("todo_list"),
  makeTool("read_file"),
  makeTool("list_directory"),
];

// ─── Owner tests ───────────────────────────────────────────────────────────

Deno.test("filterToolsForRole: owner receives all tools", () => {
  const result = filterToolsForRole(ALL_TOOLS, true);
  assertEquals(result.length, ALL_TOOLS.length);
});

Deno.test("filterToolsForRole: owner receives run_command", () => {
  const result = filterToolsForRole(ALL_TOOLS, true);
  const names = result.map((t) => t.name);
  assertEquals(names.includes("run_command"), true);
});

Deno.test("filterToolsForRole: owner receives browser_navigate", () => {
  const result = filterToolsForRole(ALL_TOOLS, true);
  const names = result.map((t) => t.name);
  assertEquals(names.includes("browser_navigate"), true);
});

// ─── Non-owner blocked tools ───────────────────────────────────────────────

Deno.test("filterToolsForRole: non-owner never receives run_command", () => {
  const result = filterToolsForRole(ALL_TOOLS, false);
  assertEquals(result.some((t) => t.name === "run_command"), false);
});

Deno.test("filterToolsForRole: non-owner never receives write_file", () => {
  const result = filterToolsForRole(ALL_TOOLS, false);
  assertEquals(result.some((t) => t.name === "write_file"), false);
});

Deno.test("filterToolsForRole: non-owner never receives edit_file", () => {
  const result = filterToolsForRole(ALL_TOOLS, false);
  assertEquals(result.some((t) => t.name === "edit_file"), false);
});

Deno.test("filterToolsForRole: non-owner never receives browser_navigate", () => {
  const result = filterToolsForRole(ALL_TOOLS, false);
  assertEquals(result.some((t) => t.name === "browser_navigate"), false);
});

Deno.test("filterToolsForRole: non-owner never receives all browser_* tools", () => {
  const result = filterToolsForRole(ALL_TOOLS, false);
  const browserTools = result.filter((t) => t.name.startsWith("browser_"));
  assertEquals(browserTools.length, 0);
});

Deno.test("filterToolsForRole: non-owner never receives memory_save", () => {
  const result = filterToolsForRole(ALL_TOOLS, false);
  assertEquals(result.some((t) => t.name === "memory_save"), false);
});

Deno.test("filterToolsForRole: non-owner never receives memory_delete", () => {
  const result = filterToolsForRole(ALL_TOOLS, false);
  assertEquals(result.some((t) => t.name === "memory_delete"), false);
});

Deno.test("filterToolsForRole: non-owner never receives secret_save", () => {
  const result = filterToolsForRole(ALL_TOOLS, false);
  assertEquals(result.some((t) => t.name === "secret_save"), false);
});

Deno.test("filterToolsForRole: non-owner never receives secret_delete", () => {
  const result = filterToolsForRole(ALL_TOOLS, false);
  assertEquals(result.some((t) => t.name === "secret_delete"), false);
});

Deno.test("filterToolsForRole: non-owner never receives cron_create", () => {
  const result = filterToolsForRole(ALL_TOOLS, false);
  assertEquals(result.some((t) => t.name === "cron_create"), false);
});

Deno.test("filterToolsForRole: non-owner never receives subagent", () => {
  const result = filterToolsForRole(ALL_TOOLS, false);
  assertEquals(result.some((t) => t.name === "subagent"), false);
});

// ─── Non-owner safe tools ──────────────────────────────────────────────────

Deno.test("filterToolsForRole: non-owner can use memory_search", () => {
  const result = filterToolsForRole(ALL_TOOLS, false);
  assertEquals(result.some((t) => t.name === "memory_search"), true);
});

Deno.test("filterToolsForRole: non-owner can use memory_get", () => {
  const result = filterToolsForRole(ALL_TOOLS, false);
  assertEquals(result.some((t) => t.name === "memory_get"), true);
});

Deno.test("filterToolsForRole: non-owner can use memory_list", () => {
  const result = filterToolsForRole(ALL_TOOLS, false);
  assertEquals(result.some((t) => t.name === "memory_list"), true);
});

Deno.test("filterToolsForRole: non-owner can use web_search", () => {
  const result = filterToolsForRole(ALL_TOOLS, false);
  assertEquals(result.some((t) => t.name === "web_search"), true);
});

Deno.test("filterToolsForRole: non-owner can use todo_add and todo_list", () => {
  const result = filterToolsForRole(ALL_TOOLS, false);
  assertEquals(result.some((t) => t.name === "todo_add"), true);
  assertEquals(result.some((t) => t.name === "todo_list"), true);
});

Deno.test("filterToolsForRole: non-owner can use read_file", () => {
  const result = filterToolsForRole(ALL_TOOLS, false);
  assertEquals(result.some((t) => t.name === "read_file"), true);
});

// ─── OWNER_ONLY_TOOLS set ─────────────────────────────────────────────────

Deno.test("OWNER_ONLY_TOOLS: is a ReadonlySet", () => {
  assertEquals(OWNER_ONLY_TOOLS instanceof Set, true);
});

Deno.test("OWNER_ONLY_TOOLS: contains expected privileged tools", () => {
  assertEquals(OWNER_ONLY_TOOLS.has("run_command"), true);
  assertEquals(OWNER_ONLY_TOOLS.has("write_file"), true);
  assertEquals(OWNER_ONLY_TOOLS.has("browser_navigate"), true);
  assertEquals(OWNER_ONLY_TOOLS.has("memory_save"), true);
  assertEquals(OWNER_ONLY_TOOLS.has("subagent"), true);
  assertEquals(OWNER_ONLY_TOOLS.has("secret_save"), true);
});

Deno.test("OWNER_ONLY_TOOLS: does not contain safe tools", () => {
  assertEquals(OWNER_ONLY_TOOLS.has("memory_search"), false);
  assertEquals(OWNER_ONLY_TOOLS.has("web_search"), false);
  assertEquals(OWNER_ONLY_TOOLS.has("todo_add"), false);
  assertEquals(OWNER_ONLY_TOOLS.has("read_file"), false);
});
