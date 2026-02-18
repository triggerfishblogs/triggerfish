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

Deno.test("tool floor: interactive browser tools have INTERNAL floor", () => {
  const registry = createToolFloorRegistry();
  const interactiveBrowserTools = [
    "browser_click",
    "browser_type",
    "browser_select",
  ];
  for (const tool of interactiveBrowserTools) {
    assertEquals(registry.getFloor(tool), "INTERNAL", `${tool} should have INTERNAL floor`);
  }
});

Deno.test("tool floor: read-only browser tools have no floor", () => {
  const registry = createToolFloorRegistry();
  const readOnlyBrowserTools = [
    "browser_navigate",
    "browser_snapshot",
    "browser_scroll",
    "browser_wait",
  ];
  for (const tool of readOnlyBrowserTools) {
    assertEquals(registry.getFloor(tool), null, `${tool} should have no floor`);
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

// --- Scenario 4: PUBLIC session invokes browser_navigate → ALLOWED (no floor) ---

Deno.test("tool floor: PUBLIC session can invoke browser_navigate (no floor)", () => {
  const registry = createToolFloorRegistry();
  assertEquals(registry.canInvoke("browser_navigate", "PUBLIC"), true);
});

// --- Scenario 5: PUBLIC session cannot invoke browser_click (INTERNAL floor) ---

Deno.test("tool floor: PUBLIC session cannot invoke browser_click", () => {
  const registry = createToolFloorRegistry();
  assertEquals(registry.canInvoke("browser_click", "PUBLIC"), false);
});

// --- Scenario 5b: INTERNAL session can invoke browser_click (meets INTERNAL floor) ---

Deno.test("tool floor: INTERNAL session can invoke browser_click", () => {
  const registry = createToolFloorRegistry();
  assertEquals(registry.canInvoke("browser_click", "INTERNAL"), true);
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
    ["run_command", "PUBLIC"],
  ]);
  const registry = createToolFloorRegistry(overrides);
  // Hardcoded is CONFIDENTIAL, enterprise tries to set PUBLIC → max = CONFIDENTIAL
  assertEquals(registry.getFloor("run_command"), "CONFIDENTIAL");
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

Deno.test("tool floor: PUBLIC session cannot invoke floored tools", () => {
  const registry = createToolFloorRegistry();
  assertEquals(registry.canInvoke("run_command", "PUBLIC"), false);
  assertEquals(registry.canInvoke("browser_click", "PUBLIC"), false);
  assertEquals(registry.canInvoke("browser_type", "PUBLIC"), false);
  assertEquals(registry.canInvoke("browser_select", "PUBLIC"), false);
});

Deno.test("tool floor: PUBLIC session can invoke unfloored tools", () => {
  const registry = createToolFloorRegistry();
  assertEquals(registry.canInvoke("read_file", "PUBLIC"), true);
  assertEquals(registry.canInvoke("memory_get", "PUBLIC"), true);
});
