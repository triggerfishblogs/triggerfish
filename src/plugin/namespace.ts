/**
 * Plugin tool name encoding and decoding.
 *
 * All plugin tools are namespaced as `plugin_<pluginName>_<toolName>` to
 * prevent collisions with built-in tools and between plugins. This mirrors
 * the MCP pattern of `mcp_<serverId>_<toolName>`.
 *
 * @module
 */

import type { ToolDefinition } from "../core/types/tool.ts";

/** Encode a plugin tool name into its namespaced form. */
export function encodePluginToolName(
  pluginName: string,
  toolName: string,
): string {
  return `plugin_${pluginName}_${toolName}`;
}

/**
 * Decode a namespaced tool name into plugin name and original tool name.
 *
 * Uses longest-match-first against known plugin names to handle plugins
 * whose names contain underscores.
 *
 * @returns Decoded parts or null if the name is not a plugin tool
 */
export function decodePluginToolName(
  fullName: string,
  pluginNames: readonly string[],
): { readonly pluginName: string; readonly toolName: string } | null {
  if (!fullName.startsWith("plugin_")) return null;
  const rest = fullName.slice("plugin_".length);
  const sorted = [...pluginNames].sort((a, b) => b.length - a.length);
  for (const name of sorted) {
    const prefix = `${name}_`;
    if (rest.startsWith(prefix)) {
      return { pluginName: name, toolName: rest.slice(prefix.length) };
    }
  }
  return null;
}

/**
 * Namespace tool definitions by prefixing names and annotating descriptions.
 *
 * Each tool's name becomes `plugin_<pluginName>_<originalName>` and
 * its description is prefixed with `[Plugin: <pluginName>]`.
 */
export function namespaceToolDefinitions(
  pluginName: string,
  tools: readonly ToolDefinition[],
): ToolDefinition[] {
  return tools.map((tool) => ({
    ...tool,
    name: encodePluginToolName(pluginName, tool.name),
    description: `[Plugin: ${pluginName}] ${tool.description}`,
  }));
}
