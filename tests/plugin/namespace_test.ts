/**
 * Tests for plugin tool name encoding, decoding, and namespacing.
 *
 * @module
 */

import { assertEquals } from "@std/assert";
import {
  decodePluginToolName,
  encodePluginToolName,
  namespaceToolDefinitions,
} from "../../src/plugin/namespace.ts";

Deno.test("encodePluginToolName produces plugin_<name>_<tool> format", () => {
  assertEquals(
    encodePluginToolName("obsidian", "search"),
    "plugin_obsidian_search",
  );
});

Deno.test("encodePluginToolName handles hyphenated plugin names", () => {
  assertEquals(
    encodePluginToolName("system-info", "system_time"),
    "plugin_system-info_system_time",
  );
});

Deno.test("decodePluginToolName returns null for non-plugin tools", () => {
  assertEquals(decodePluginToolName("web_fetch", ["obsidian"]), null);
});

Deno.test("decodePluginToolName returns null when prefix missing", () => {
  assertEquals(decodePluginToolName("mcp_server_tool", ["obsidian"]), null);
});

Deno.test("decodePluginToolName extracts plugin name and tool name", () => {
  const result = decodePluginToolName("plugin_obsidian_search", ["obsidian"]);
  assertEquals(result, { pluginName: "obsidian", toolName: "search" });
});

Deno.test("decodePluginToolName uses longest-match-first for ambiguous names", () => {
  const result = decodePluginToolName(
    "plugin_my-plugin-ext_tool",
    ["my-plugin", "my-plugin-ext"],
  );
  assertEquals(result, { pluginName: "my-plugin-ext", toolName: "tool" });
});

Deno.test("decodePluginToolName returns null for unknown plugin name", () => {
  const result = decodePluginToolName("plugin_unknown_tool", ["obsidian"]);
  assertEquals(result, null);
});

Deno.test("namespaceToolDefinitions prefixes tool names", () => {
  const tools = [
    { name: "search", description: "Search notes", parameters: {} },
    { name: "create", description: "Create note", parameters: {} },
  ];
  const namespaced = namespaceToolDefinitions("obsidian", tools);
  assertEquals(namespaced[0].name, "plugin_obsidian_search");
  assertEquals(namespaced[1].name, "plugin_obsidian_create");
});

Deno.test("namespaceToolDefinitions annotates descriptions", () => {
  const tools = [
    { name: "search", description: "Search notes", parameters: {} },
  ];
  const namespaced = namespaceToolDefinitions("obsidian", tools);
  assertEquals(
    namespaced[0].description,
    "[Plugin: obsidian] Search notes",
  );
});

Deno.test("namespaceToolDefinitions preserves parameters", () => {
  const tools = [{
    name: "search",
    description: "Search",
    parameters: {
      query: { type: "string", description: "Search query", required: true },
    },
  }];
  const namespaced = namespaceToolDefinitions("test", tools);
  assertEquals(namespaced[0].parameters, tools[0].parameters);
});
