/**
 * LLM-callable plugin management tools.
 *
 * Provides `plugin_list`, `plugin_install`, and `plugin_reload` tools
 * that the agent can invoke to manage plugins at runtime without
 * requiring a Triggerfish restart.
 *
 * @module
 */

import type { ClassificationLevel } from "../core/types/classification.ts";
import type { ToolDefinition } from "../core/types/tool.ts";
import type { PluginRegistry } from "./registry.ts";
import type { PluginContext, PluginTrustLevel } from "./types.ts";
import { importPluginModule } from "./loader.ts";
import { namespaceToolDefinitions } from "./namespace.ts";
import { initializePluginExecutor, resolveEffectiveTrust } from "./sandboxed_executor.ts";
import { createLogger } from "../core/logger/logger.ts";

const log = createLogger("plugin-tools");

/** Tool definitions for plugin management. */
export const PLUGIN_TOOL_DEFINITIONS: readonly ToolDefinition[] = [
  {
    name: "plugin_list",
    description:
      "List all installed and registered plugins with their status, version, classification, and trust level.",
    parameters: {},
  },
  {
    name: "plugin_install",
    description:
      "Install and activate a plugin from the plugins directory at runtime. The plugin must already exist in ~/.triggerfish/plugins/<name>/mod.ts and be enabled in config.",
    parameters: {
      name: {
        type: "string",
        description: "Plugin name (directory name in ~/.triggerfish/plugins/)",
        required: true,
      },
    },
  },
  {
    name: "plugin_reload",
    description:
      "Reload a currently registered plugin by unregistering and re-importing its module. Use after modifying plugin source code.",
    parameters: {
      name: {
        type: "string",
        description: "Name of the plugin to reload",
        required: true,
      },
    },
  },
];

/** Options for creating the plugin management executor. */
export interface PluginToolsOptions {
  /** The live plugin registry. */
  readonly registry: PluginRegistry;
  /** Get the current session taint level. */
  readonly getSessionTaint: () => ClassificationLevel;
  /** Plugin configuration from triggerfish.yaml. */
  readonly pluginsConfig: Readonly<
    Record<
      string,
      | {
          readonly enabled?: boolean;
          readonly trust?: PluginTrustLevel;
          readonly classification?: string;
        }
      | undefined
    >
  >;
  /** Mutable tool classifications map to inject plugin prefixes into. */
  readonly toolClassifications: Map<string, ClassificationLevel>;
  /** Mutable integration classifications map. */
  readonly integrationClassifications: Map<string, ClassificationLevel>;
  /** Optional security scanner for plugin content. */
  readonly scanPlugin?: (
    pluginDir: string,
  ) => Promise<{ readonly ok: boolean; readonly warnings: readonly string[] }>;
}

/** Format plugin list for display. */
function executePluginList(
  registry: PluginRegistry,
): string {
  const plugins = registry.getAllPlugins();
  if (plugins.length === 0) {
    return "No plugins are currently registered.";
  }
  const entries = plugins.map((p) => {
    const m = p.loaded.exports.manifest;
    return {
      name: m.name,
      version: m.version,
      classification: m.classification,
      trust: m.trust,
      tools: p.namespacedTools.map((t) => t.name),
      source: p.loaded.sourcePath,
    };
  });
  return JSON.stringify(entries, null, 2);
}

/** Install a plugin at runtime. */
async function executePluginInstall(
  name: string,
  opts: PluginToolsOptions,
): Promise<string> {
  if (opts.registry.getPlugin(name)) {
    return `Plugin "${name}" is already registered. Use plugin_reload to update it.`;
  }

  const pluginCfg = opts.pluginsConfig[name];
  if (!pluginCfg?.enabled) {
    return `Plugin "${name}" is not enabled in triggerfish.yaml. Add plugins.${name}.enabled: true to your config.`;
  }

  const homeDir = Deno.env.get("HOME") ?? Deno.env.get("USERPROFILE") ?? "";
  const modPath = `${homeDir}/.triggerfish/plugins/${name}/mod.ts`;

  // Security scan if scanner is available
  if (opts.scanPlugin) {
    const pluginDir = `${homeDir}/.triggerfish/plugins/${name}`;
    const scanResult = await opts.scanPlugin(pluginDir);
    if (!scanResult.ok) {
      log.warn("Plugin install blocked by security scanner", {
        operation: "executePluginInstall",
        plugin: name,
        warnings: scanResult.warnings,
      });
      return `Plugin "${name}" failed security scan: ${scanResult.warnings.join("; ")}`;
    }
  }

  const importResult = await importPluginModule(modPath);
  if (!importResult.ok) {
    return `Plugin install failed: ${importResult.error}`;
  }

  if (importResult.value.manifest.name !== name) {
    return `Plugin directory "${name}" does not match manifest name "${importResult.value.manifest.name}"`;
  }

  const configTrust: PluginTrustLevel = pluginCfg.trust ?? "sandboxed";
  const effectiveTrust = resolveEffectiveTrust(
    importResult.value.manifest.trust,
    configTrust,
  );

  const context: PluginContext = {
    pluginName: name,
    getSessionTaint: opts.getSessionTaint,
    escalateTaint: () => {},
    log: {
      debug: (msg, ctx) => log.debug(msg, { ...ctx, plugin: name }),
      info: (msg, ctx) => log.info(msg, { ...ctx, plugin: name }),
      warn: (msg, ctx) => log.warn(msg, { ...ctx, plugin: name }),
      error: (msg, ctx) => log.error(msg, { ...ctx, plugin: name }),
    },
    config: (pluginCfg as Record<string, unknown>) ?? {},
  };

  try {
    const executor = await initializePluginExecutor(
      { exports: importResult.value, sourcePath: modPath },
      context,
      effectiveTrust,
    );
    const namespacedTools = namespaceToolDefinitions(
      name,
      importResult.value.toolDefinitions,
    );

    opts.registry.registerPlugin({
      loaded: { exports: importResult.value, sourcePath: modPath },
      executor,
      namespacedTools,
    });

    const classification = importResult.value.manifest.classification;
    const prefix = `plugin_${name}_`;
    opts.toolClassifications.set(prefix, classification);
    opts.integrationClassifications.set(prefix, classification);

    log.info("Plugin installed at runtime", {
      operation: "executePluginInstall",
      plugin: name,
      version: importResult.value.manifest.version,
      effectiveTrust,
    });

    return `Plugin "${name}@${importResult.value.manifest.version}" installed successfully. Tools: ${
      namespacedTools.map((t) => t.name).join(", ")
    }`;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return `Plugin "${name}" initialization failed: ${msg}`;
  }
}

/** Reload a plugin by unregistering and re-importing. */
async function executePluginReload(
  name: string,
  opts: PluginToolsOptions,
): Promise<string> {
  const existing = opts.registry.getPlugin(name);
  if (!existing) {
    return `Plugin "${name}" is not registered. Use plugin_install first.`;
  }

  // Remove old registration
  opts.registry.unregisterPlugin(name);
  const prefix = `plugin_${name}_`;
  opts.toolClassifications.delete(prefix);
  opts.integrationClassifications.delete(prefix);

  // Re-install
  const result = await executePluginInstall(name, opts);
  if (result.includes("failed") || result.includes("blocked")) {
    // Re-register the old version if reload failed
    opts.registry.registerPlugin(existing);
    const classification = existing.loaded.exports.manifest.classification;
    opts.toolClassifications.set(prefix, classification);
    opts.integrationClassifications.set(prefix, classification);
    return `Plugin "${name}" reload failed (old version restored): ${result}`;
  }
  return result.replace("installed", "reloaded");
}

/**
 * Create the plugin management tool executor.
 *
 * Returns a SubsystemExecutor that handles plugin_list, plugin_install,
 * and plugin_reload tool calls.
 */
export function createPluginToolExecutor(
  opts: PluginToolsOptions,
): (name: string, input: Record<string, unknown>) => Promise<string | null> {
  // deno-lint-ignore require-await
  return async (
    toolName: string,
    input: Record<string, unknown>,
  ): Promise<string | null> => {
    switch (toolName) {
      case "plugin_list":
        return executePluginList(opts.registry);
      case "plugin_install": {
        const name = input.name;
        if (typeof name !== "string" || name.length === 0) {
          return 'Plugin install requires a "name" parameter.';
        }
        return executePluginInstall(name, opts);
      }
      case "plugin_reload": {
        const name = input.name;
        if (typeof name !== "string" || name.length === 0) {
          return 'Plugin reload requires a "name" parameter.';
        }
        return executePluginReload(name, opts);
      }
      default:
        return null;
    }
  };
}
