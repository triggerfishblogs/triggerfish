/**
 * Composite plugin executor.
 *
 * Creates a single SubsystemExecutor that dispatches tool calls to the
 * correct plugin based on the `plugin_<name>_` prefix in the tool name.
 *
 * @module
 */

import type { PluginRegistry } from "./registry.ts";
import { decodePluginToolName } from "./namespace.ts";
import { createLogger } from "../core/logger/logger.ts";

const log = createLogger("plugin-executor");

/** SubsystemExecutor signature (matches gateway executor_types.ts). */
type SubsystemExecutor = (
  name: string,
  input: Record<string, unknown>,
) => Promise<string | null>;

/**
 * Create a composite plugin executor that dispatches to the correct plugin.
 *
 * Decodes the tool name prefix to find the owning plugin, then delegates
 * to that plugin's executor with the original (un-namespaced) tool name.
 */
export function createPluginExecutor(
  registry: PluginRegistry,
): SubsystemExecutor {
  return async (
    name: string,
    input: Record<string, unknown>,
  ): Promise<string | null> => {
    const decoded = decodePluginToolName(name, registry.getPluginNames());
    if (!decoded) return null;

    const plugin = registry.getPlugin(decoded.pluginName);
    if (!plugin) {
      log.warn("Plugin executor: plugin not found after decode", {
        operation: "createPluginExecutor",
        pluginName: decoded.pluginName,
        toolName: decoded.toolName,
      });
      return null;
    }

    log.debug("Plugin executor dispatching", {
      operation: "createPluginExecutor",
      plugin: decoded.pluginName,
      tool: decoded.toolName,
    });

    return await plugin.executor(decoded.toolName, input);
  };
}
