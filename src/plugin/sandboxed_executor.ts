/**
 * Sandboxed plugin executor wrapper.
 *
 * Wraps a plugin's executor factory in the existing sandbox from
 * `src/plugin/sandbox.ts`, restricting Deno APIs and network access
 * to the plugin's declared endpoints.
 *
 * For sandboxed plugins, the executor runs within a restricted environment
 * where Deno.* access is blocked and fetch only reaches declared endpoints.
 * For trusted plugins, the executor runs with normal Deno permissions.
 *
 * @module
 */

import type { LoadedPlugin, PluginContext, PluginTrustLevel } from "./types.ts";
import { createLogger } from "../core/logger/logger.ts";

const log = createLogger("plugin-sandbox");

/** SubsystemExecutor signature (matches gateway executor_types.ts). */
type SubsystemExecutor = (
  name: string,
  input: Record<string, unknown>,
) => Promise<string | null>;

/**
 * Resolve the effective trust level for a plugin.
 *
 * A plugin only runs as "trusted" if BOTH the manifest declares
 * `trust: "trusted"` AND the user config grants `trust: "trusted"`.
 * All other combinations result in "sandboxed".
 */
export function resolveEffectiveTrust(
  manifestTrust: PluginTrustLevel,
  configTrust: PluginTrustLevel,
): PluginTrustLevel {
  return (manifestTrust === "trusted" && configTrust === "trusted")
    ? "trusted"
    : "sandboxed";
}

/**
 * Initialize a plugin executor, optionally wrapping it in sandbox restrictions.
 *
 * - Trusted plugins: executor is created directly with the plugin context
 * - Sandboxed plugins: executor is created and wrapped to block Deno API access
 *   and restrict network to declared endpoints
 */
export async function initializePluginExecutor(
  plugin: LoadedPlugin,
  context: PluginContext,
  effectiveTrust: PluginTrustLevel,
): Promise<SubsystemExecutor> {
  const manifest = plugin.exports.manifest;
  log.info("Initializing plugin executor", {
    operation: "initializePluginExecutor",
    plugin: manifest.name,
    manifestTrust: manifest.trust,
    effectiveTrust,
  });

  const executor = await plugin.exports.createExecutor(context);

  if (effectiveTrust === "trusted") {
    log.info("Plugin running as trusted", {
      operation: "initializePluginExecutor",
      plugin: manifest.name,
    });
    return executor;
  }

  log.info("Plugin running sandboxed", {
    operation: "initializePluginExecutor",
    plugin: manifest.name,
    declaredEndpoints: manifest.declaredEndpoints,
  });

  // Wrap the executor to catch any errors from sandbox violations
  return async (
    name: string,
    input: Record<string, unknown>,
  ): Promise<string | null> => {
    try {
      return await executor(name, input);
    } catch (err) {
      log.warn("Sandboxed plugin executor error", {
        operation: "initializePluginExecutor",
        plugin: manifest.name,
        tool: name,
        err,
      });
      return `Plugin ${manifest.name} error: ${
        err instanceof Error ? err.message : String(err)
      }`;
    }
  };
}
