/**
 * Tests for orchestrator-level role enforcement and tool classification.
 *
 * Verifies that resolveActiveToolList applies the filterTools callback,
 * that enforceNonOwnerToolCeiling works correctly with built-in
 * tool classifications, and that built-in tools never escalate taint
 * (taint comes from resources, not tools).
 */
import { assertEquals, assert } from "@std/assert";
import { resolveActiveToolList } from "../../src/agent/loop/loop_types.ts";
import {
  enforceNonOwnerToolCeiling,
  escalateToolPrefixTaint,
} from "../../src/agent/dispatch/access_control.ts";
import {
  mapToolPrefixClassifications,
} from "../../src/agent/orchestrator/orchestrator_types.ts";
import type { OrchestratorState } from "../../src/agent/orchestrator/orchestrator.ts";
import type { ToolDefinition } from "../../src/core/types/tool.ts";
import type { ClassificationLevel } from "../../src/core/types/classification.ts";
import { createLogger } from "../../src/core/logger/mod.ts";

/** Build a minimal ToolDefinition stub. */
function stubTool(name: string): ToolDefinition {
  return { name, description: `stub: ${name}`, parameters: {} };
}

/** Build a minimal OrchestratorState-like object for resolveActiveToolList. */
function buildMockState(opts: {
  baseTools: readonly ToolDefinition[];
  getExtraTools?: () => readonly ToolDefinition[];
  filterTools?: (
    tools: readonly ToolDefinition[],
    isOwner: boolean,
  ) => readonly ToolDefinition[];
  isOwnerSession?: () => boolean;
}): OrchestratorState {
  return {
    baseTools: opts.baseTools,
    getExtraTools: opts.getExtraTools,
    config: {
      hookRunner: {
        run: () => Promise.resolve({ action: "ALLOW" }),
        addRule: () => {},
      },
      providerRegistry: {
        get: () => undefined,
        getDefault: () => undefined,
        register: () => {},
        setDefault: () => {},
        list: () => [],
      },
      filterTools: opts.filterTools,
      isOwnerSession: opts.isOwnerSession,
    },
    history: new Map(),
    orchLog: createLogger("test-orchestrator"),
    debug: false,
  } as unknown as OrchestratorState;
}

// ─── resolveActiveToolList with filterTools ────────────────────────────────

Deno.test("resolveActiveToolList: owner session returns full list when filterTools set", () => {
  const tools = [stubTool("run_command"), stubTool("web_search")];
  const state = buildMockState({
    baseTools: tools,
    filterTools: (t, isOwner) => isOwner ? t : t.filter((x) => x.name !== "run_command"),
    isOwnerSession: () => true,
  });
  const result = resolveActiveToolList(state);
  assertEquals(result.length, 2);
});

Deno.test("resolveActiveToolList: non-owner session excludes owner-only tools", () => {
  const tools = [stubTool("run_command"), stubTool("web_search")];
  const state = buildMockState({
    baseTools: tools,
    filterTools: (t, isOwner) => isOwner ? t : t.filter((x) => x.name !== "run_command"),
    isOwnerSession: () => false,
  });
  const result = resolveActiveToolList(state);
  assertEquals(result.length, 1);
  assertEquals(result[0].name, "web_search");
});

Deno.test("resolveActiveToolList: no filterTools returns full list regardless of owner status", () => {
  const tools = [stubTool("run_command"), stubTool("web_search")];
  const state = buildMockState({ baseTools: tools });
  const result = resolveActiveToolList(state);
  assertEquals(result.length, 2);
});

Deno.test("resolveActiveToolList: isOwnerSession not provided defaults to owner (true)", () => {
  const tools = [stubTool("run_command"), stubTool("web_search")];
  const state = buildMockState({
    baseTools: tools,
    filterTools: (t, isOwner) => isOwner ? t : [],
  });
  const result = resolveActiveToolList(state);
  assertEquals(result.length, 2, "Should default to owner=true when isOwnerSession not set");
});

Deno.test("resolveActiveToolList: filterTools applies to extra tools too", () => {
  const state = buildMockState({
    baseTools: [stubTool("web_search")],
    getExtraTools: () => [stubTool("run_command")],
    filterTools: (t, isOwner) => isOwner ? t : t.filter((x) => x.name !== "run_command"),
    isOwnerSession: () => false,
  });
  const result = resolveActiveToolList(state);
  assertEquals(result.length, 1);
  assertEquals(result[0].name, "web_search");
});

// ─── mapToolPrefixClassifications with built-in tools ──────────────────────

Deno.test("mapToolPrefixClassifications: includes built-in tool classifications", () => {
  const map = mapToolPrefixClassifications({});
  assert(map.has("memory_search"), "Should have memory_search entry");
  assert(map.has("memory_save"), "Should have memory_save entry");
  assert(map.has("memory_delete"), "Should have memory_delete entry");
  assert(map.has("browser_"), "Should have browser_ prefix entry");
  assert(map.has("web_"), "Should have web_ prefix entry");
});

Deno.test("mapToolPrefixClassifications: all built-in tools are PUBLIC", () => {
  const map = mapToolPrefixClassifications({});
  const builtInPrefixes = [
    "memory_search", "memory_get", "memory_list", "memory_save", "memory_delete",
    "write_file", "edit_file", "run_command", "read_file", "list_directory", "search_files",
    "browser_", "secret_", "cron_", "trigger_", "read_skill",
    "subagent", "agents_", "claude_", "sessions_", "session_",
    "message", "signal_", "channels_", "plan_", "tidepool_",
    "web_", "todo_", "healthcheck", "summarize",
    "image_", "explore", "llm_task", "log_read",
  ];
  for (const prefix of builtInPrefixes) {
    assertEquals(
      map.get(prefix),
      "PUBLIC",
      `${prefix} should be PUBLIC — taint comes from resources, not tools`,
    );
  }
});

Deno.test("mapToolPrefixClassifications: integration overrides take precedence", () => {
  const map = mapToolPrefixClassifications({
    google: { classification: "CONFIDENTIAL" },
  });
  assertEquals(map.get("gmail_"), "CONFIDENTIAL", "Google override should take precedence");
  assert(map.has("web_"), "Built-in web_ should still be present");
});

// ─── enforceNonOwnerToolCeiling with built-in classifications ──────────────

Deno.test("enforceNonOwnerToolCeiling: non-owner with PUBLIC ceiling can use memory_search", () => {
  const map = mapToolPrefixClassifications({});
  const err = enforceNonOwnerToolCeiling(
    "memory_search",
    "PUBLIC" as ClassificationLevel,
    map,
  );
  assertEquals(err, null, "memory_search (PUBLIC) should be allowed for PUBLIC ceiling");
});

Deno.test("enforceNonOwnerToolCeiling: non-owner with PUBLIC ceiling can use run_command", () => {
  const map = mapToolPrefixClassifications({});
  const err = enforceNonOwnerToolCeiling(
    "run_command",
    "PUBLIC" as ClassificationLevel,
    map,
  );
  assertEquals(err, null, "run_command (PUBLIC) should be allowed — tools are PUBLIC");
});

Deno.test("enforceNonOwnerToolCeiling: non-owner with PUBLIC ceiling can use web_search", () => {
  const map = mapToolPrefixClassifications({});
  const err = enforceNonOwnerToolCeiling(
    "web_search",
    "PUBLIC" as ClassificationLevel,
    map,
  );
  assertEquals(err, null, "web_search (PUBLIC) should be allowed for PUBLIC ceiling");
});

Deno.test("enforceNonOwnerToolCeiling: non-owner with PUBLIC ceiling can use memory_save", () => {
  const map = mapToolPrefixClassifications({});
  const err = enforceNonOwnerToolCeiling(
    "memory_save",
    "PUBLIC" as ClassificationLevel,
    map,
  );
  assertEquals(err, null, "memory_save (PUBLIC) should be allowed — it is in the map now");
});

Deno.test("enforceNonOwnerToolCeiling: non-owner with null ceiling blocks all tools", () => {
  const map = mapToolPrefixClassifications({});
  const err = enforceNonOwnerToolCeiling(
    "web_search",
    null,
    map,
  );
  assert(err !== null, "null ceiling should block all tool calls");
  assert(err!.includes("not available"), "Error should state tools not available");
});

// ─── escalateToolPrefixTaint: built-in tools never escalate above PUBLIC ───

Deno.test("escalateToolPrefixTaint: built-in tools only escalate to PUBLIC (no-op)", () => {
  const map = mapToolPrefixClassifications({});
  const builtInTools = [
    "memory_save", "memory_delete", "memory_search", "memory_get",
    "write_file", "read_file", "run_command", "browser_navigate",
    "llm_task", "explore", "image_generate", "log_read",
  ];
  for (const tool of builtInTools) {
    let escalatedLevel: ClassificationLevel | null = null;
    escalateToolPrefixTaint(tool, map, (level: ClassificationLevel) => {
      escalatedLevel = level;
    });
    if (escalatedLevel !== null) {
      assertEquals(
        escalatedLevel,
        "PUBLIC",
        `${tool} should only escalate to PUBLIC (no-op) — taint comes from resources`,
      );
    }
  }
});

Deno.test("escalateToolPrefixTaint: integration tools escalate to their configured level", () => {
  const map = mapToolPrefixClassifications({
    google: { classification: "CONFIDENTIAL" },
  });
  let escalatedLevel: ClassificationLevel | null = null;
  escalateToolPrefixTaint("gmail_send", map, (level: ClassificationLevel) => {
    escalatedLevel = level;
  });
  assertEquals(escalatedLevel, "CONFIDENTIAL", "Integration tools escalate to their config level");
});
