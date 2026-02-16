/**
 * Tests for tool floor registry.
 * Covers spec §10.1 (tool floor enforcement, scenarios 1-7).
 */
import { assertEquals } from "@std/assert";
import { createToolFloorRegistry } from "../../../src/core/security/tool_floors.ts";
import type { ClassificationLevel } from "../../../src/core/types/classification.ts";

// --- Tool floor enforcement (spec §10.1, scenarios 1-7) ---

Deno.test("tool floor: run_command has CONFIDENTIAL floor", () => {
  const registry = createToolFloorRegistry();
  assertEquals(registry.getFloor("run_command"), "CONFIDENTIAL");
});

Deno.test("tool floor: all browser tools have CONFIDENTIAL floor", () => {
  const registry = createToolFloorRegistry();
  const browserTools = [
    "browser_navigate",
    "browser_snapshot",
    "browser_click",
    "browser_type",
    "browser_select",
    "browser_scroll",
    "browser_wait",
  ];
  for (const tool of browserTools) {
    assertEquals(registry.getFloor(tool), "CONFIDENTIAL", `${tool} should have CONFIDENTIAL floor`);
  }
});

Deno.test("tool floor: tools with no floor return null", () => {
  const registry = createToolFloorRegistry();
  const noFloorTools = [
    "read_file",
    "write_file",
    "edit_file",
    "list_directory",
    "search_files",
    "memory_save",
    "memory_get",
    "web_search",
    "web_fetch",
    "todo_read",
    "todo_write",
  ];
  for (const tool of noFloorTools) {
    assertEquals(registry.getFloor(tool), null, `${tool} should have no floor`);
  }
});

// --- Scenario 1: INTERNAL session invokes run_command → BLOCKED ---

Deno.test("tool floor: INTERNAL session cannot invoke run_command", () => {
  const registry = createToolFloorRegistry();
  assertEquals(registry.canInvoke("run_command", "INTERNAL"), false);
});

// --- Scenario 2: CONFIDENTIAL session invokes run_command → ALLOWED ---

Deno.test("tool floor: CONFIDENTIAL session can invoke run_command", () => {
  const registry = createToolFloorRegistry();
  assertEquals(registry.canInvoke("run_command", "CONFIDENTIAL"), true);
});

// --- Scenario 3: RESTRICTED session invokes run_command → ALLOWED ---

Deno.test("tool floor: RESTRICTED session can invoke run_command", () => {
  const registry = createToolFloorRegistry();
  assertEquals(registry.canInvoke("run_command", "RESTRICTED"), true);
});

// --- Scenario 4: INTERNAL session invokes browser_navigate → BLOCKED ---

Deno.test("tool floor: INTERNAL session cannot invoke browser_navigate", () => {
  const registry = createToolFloorRegistry();
  assertEquals(registry.canInvoke("browser_navigate", "INTERNAL"), false);
});

// --- Scenario 5: CONFIDENTIAL session invokes browser_navigate → ALLOWED ---

Deno.test("tool floor: CONFIDENTIAL session can invoke browser_navigate", () => {
  const registry = createToolFloorRegistry();
  assertEquals(registry.canInvoke("browser_navigate", "CONFIDENTIAL"), true);
});

// --- Scenario 6: INTERNAL session invokes read_file → ALLOWED (no floor) ---

Deno.test("tool floor: INTERNAL session can invoke read_file (no floor)", () => {
  const registry = createToolFloorRegistry();
  assertEquals(registry.canInvoke("read_file", "INTERNAL"), true);
});

// --- Scenario 7: Enterprise raises run_command to RESTRICTED ---

Deno.test("tool floor: enterprise can raise floor (run_command → RESTRICTED)", () => {
  const overrides = new Map<string, ClassificationLevel>([
    ["run_command", "RESTRICTED"],
  ]);
  const registry = createToolFloorRegistry(overrides);
  assertEquals(registry.getFloor("run_command"), "RESTRICTED");
  assertEquals(registry.canInvoke("run_command", "CONFIDENTIAL"), false);
  assertEquals(registry.canInvoke("run_command", "RESTRICTED"), true);
});

Deno.test("tool floor: enterprise CANNOT lower floor below hardcoded", () => {
  const overrides = new Map<string, ClassificationLevel>([
    ["browser_navigate", "PUBLIC"],
  ]);
  const registry = createToolFloorRegistry(overrides);
  // Hardcoded is CONFIDENTIAL, enterprise tries to set PUBLIC → max = CONFIDENTIAL
  assertEquals(registry.getFloor("browser_navigate"), "CONFIDENTIAL");
});

Deno.test("tool floor: enterprise can add floor to tool that had none", () => {
  const overrides = new Map<string, ClassificationLevel>([
    ["web_fetch", "CONFIDENTIAL"],
  ]);
  const registry = createToolFloorRegistry(overrides);
  assertEquals(registry.getFloor("web_fetch"), "CONFIDENTIAL");
  assertEquals(registry.canInvoke("web_fetch", "INTERNAL"), false);
  assertEquals(registry.canInvoke("web_fetch", "CONFIDENTIAL"), true);
});

Deno.test("tool floor: PUBLIC session cannot invoke any floored tool", () => {
  const registry = createToolFloorRegistry();
  assertEquals(registry.canInvoke("run_command", "PUBLIC"), false);
  assertEquals(registry.canInvoke("browser_navigate", "PUBLIC"), false);
});

Deno.test("tool floor: PUBLIC session can invoke unfloored tools", () => {
  const registry = createToolFloorRegistry();
  assertEquals(registry.canInvoke("read_file", "PUBLIC"), true);
  assertEquals(registry.canInvoke("memory_get", "PUBLIC"), true);
});
