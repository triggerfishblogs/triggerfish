/**
 * LLM-callable plugin management tools.
 *
 * Provides `plugin_list`, `plugin_install`, `plugin_reload`, and
 * `plugin_scan` tools that the agent can invoke to manage plugins at
 * runtime. The primary flow is: agent builds a plugin in the exec
 * workspace, scans it, then loads it — no config or restart required.
 *
 * @module
 */

import type { ClassificationLevel } from "../core/types/classification.ts";
import type { ToolDefinition } from "../core/types/tool.ts";
import type { PluginRegistry } from "./registry.ts";
import type { PluginContext, PluginTrustLevel } from "./types.ts";
import { importPluginModule } from "./loader.ts";
import { namespaceToolDefinitions } from "./namespace.ts";
import {
  initializePluginExecutor,
  resolveEffectiveTrust,
} from "./sandboxed_executor.ts";
import { createLogger } from "../core/logger/logger.ts";

const log = createLogger("plugin-tools");

/** Tool definitions for plugin management. */
export const PLUGIN_TOOL_DEFINITIONS: readonly ToolDefinition[] = [
  {
    name: "plugin_list",
    description:
      "List all registered plugins with their status, version, classification, trust level, and source path.",
    parameters: {},
  },
  {
    name: "plugin_install",
    description:
      "Install and activate a plugin at runtime. Accepts either a name (loads from ~/.triggerfish/plugins/<name>/mod.ts) or a path to a directory containing mod.ts. The plugin is security-scanned, validated, and loaded as sandboxed by default. No config entry is required — the agent can build a plugin and immediately load it.",
    parameters: {
      name: {
        type: "string",
        description:
          "Plugin name. If path is not provided, loads from ~/.triggerfish/plugins/<name>/mod.ts",
        required: true,
      },
      path: {
        type: "string",
        description:
          "Absolute path to the plugin directory containing mod.ts. Use this when loading a plugin the agent just built (e.g. in the workspace). Overrides the default plugins directory.",
      },
    },
  },
  {
    name: "plugin_reload",
    description:
      "Reload a currently registered plugin by unregistering and re-importing its module from its original source path. Use after modifying plugin source code.",
    parameters: {
      name: {
        type: "string",
        description: "Name of the plugin to reload",
        required: true,
      },
    },
  },
  {
    name: "plugin_scan",
    description:
      "Run the security scanner on a plugin directory before installing. Returns warnings about dangerous patterns (eval, prompt injection, subprocess calls, etc.). Use this to validate a plugin you just built before calling plugin_install.",
    parameters: {
      path: {
        type: "string",
        description:
          "Absolute path to the plugin directory containing mod.ts",
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
  /** Security scanner for plugin content. */
  readonly scanPlugin: (
    pluginDir: string,
  ) => Promise<{
    readonly ok: boolean;
    readonly warnings: readonly string[];
    readonly scannedFiles: readonly string[];
  }>;
}

/** Format plugin list for display. */
function executePluginList(registry: PluginRegistry): string {
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

/** Resolve the plugin directory path from name and optional explicit path. */
function resolvePluginDir(
  name: string,
  explicitPath?: string,
): string {
  if (explicitPath) {
    return explicitPath;
  }
  const homeDir = Deno.env.get("HOME") ?? Deno.env.get("USERPROFILE") ?? "";
  return `${homeDir}/.triggerfish/plugins/${name}`;
}

/** Build a PluginContext for a plugin. */
function buildPluginContext(
  name: string,
  opts: PluginToolsOptions,
  pluginCfg: Record<string, unknown>,
): PluginContext {
  return {
    pluginName: name,
    getSessionTaint: opts.getSessionTaint,
    escalateTaint: () => {},
    log: {
      debug: (msg, ctx) => log.debug(msg, { ...ctx, plugin: name }),
      info: (msg, ctx) => log.info(msg, { ...ctx, plugin: name }),
      warn: (msg, ctx) => log.warn(msg, { ...ctx, plugin: name }),
      error: (msg, ctx) => log.error(msg, { ...ctx, plugin: name }),
    },
    config: pluginCfg,
  };
}

/** Run security scan on a plugin directory. */
async function executePluginScan(
  path: string,
  opts: PluginToolsOptions,
): Promise<string> {
  const scanResult = await opts.scanPlugin(path);
  if (scanResult.ok) {
    return JSON.stringify({
      ok: true,
      message: "Plugin passed security scan.",
      scannedFiles: scanResult.scannedFiles,
    });
  }
  return JSON.stringify({
    ok: false,
    message: "Plugin failed security scan.",
    warnings: scanResult.warnings,
    scannedFiles: scanResult.scannedFiles,
  });
}

/** Install a plugin at runtime from a name or explicit path. */
async function executePluginInstall(
  name: string,
  opts: PluginToolsOptions,
  explicitPath?: string,
): Promise<string> {
  if (opts.registry.getPlugin(name)) {
    return `Plugin "${name}" is already registered. Use plugin_reload to update it.`;
  }

  const pluginDir = resolvePluginDir(name, explicitPath);
  const modPath = `${pluginDir}/mod.ts`;

  // Security scan is mandatory
  const scanResult = await opts.scanPlugin(pluginDir);
  if (!scanResult.ok) {
    log.warn("Plugin install blocked by security scanner", {
      operation: "executePluginInstall",
      plugin: name,
      warnings: scanResult.warnings,
    });
    return `Plugin "${name}" failed security scan: ${scanResult.warnings.join("; ")}`;
  }

  const importResult = await importPluginModule(modPath);
  if (!importResult.ok) {
    return `Plugin install failed: ${importResult.error}`;
  }

  if (importResult.value.manifest.name !== name) {
    return `Plugin directory "${name}" does not match manifest name "${importResult.value.manifest.name}"`;
  }

  // Config is optional — fall back to sandboxed with manifest classification
  const pluginCfg = opts.pluginsConfig[name];
  const configTrust: PluginTrustLevel = pluginCfg?.trust ?? "sandboxed";
  const effectiveTrust = resolveEffectiveTrust(
    importResult.value.manifest.trust,
    configTrust,
  );

  const context = buildPluginContext(
    name,
    opts,
    (pluginCfg as Record<string, unknown>) ?? {},
  );

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
      source: modPath,
    });

    return `Plugin "${name}@${importResult.value.manifest.version}" installed successfully (${effectiveTrust}). Tools: ${
      namespacedTools.map((t) => t.name).join(", ")
    }`;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return `Plugin "${name}" initialization failed: ${msg}`;
  }
}

/** Reload a plugin by unregistering and re-importing from its original source. */
async function executePluginReload(
  name: string,
  opts: PluginToolsOptions,
): Promise<string> {
  const existing = opts.registry.getPlugin(name);
  if (!existing) {
    return `Plugin "${name}" is not registered. Use plugin_install first.`;
  }

  // Derive the plugin directory from the stored source path
  const sourcePath = existing.loaded.sourcePath;
  const pluginDir = sourcePath.replace(/\/mod\.ts$/, "");

  // Remove old registration
  opts.registry.unregisterPlugin(name);
  const prefix = `plugin_${name}_`;
  opts.toolClassifications.delete(prefix);
  opts.integrationClassifications.delete(prefix);

  // Re-install from original source location
  const result = await executePluginInstall(name, opts, pluginDir);
  if (result.includes("failed") || result.includes("blocked")) {
    // Rollback: re-register the old version
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
 * plugin_reload, and plugin_scan tool calls. The agent can build a
 * plugin, scan it, and load it in a single conversation.
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
        const path = typeof input.path === "string" ? input.path : undefined;
        return executePluginInstall(name, opts, path);
      }
      case "plugin_reload": {
        const name = input.name;
        if (typeof name !== "string" || name.length === 0) {
          return 'Plugin reload requires a "name" parameter.';
        }
        return executePluginReload(name, opts);
      }
      case "plugin_scan": {
        const path = input.path;
        if (typeof path !== "string" || path.length === 0) {
          return 'Plugin scan requires a "path" parameter.';
        }
        return executePluginScan(path, opts);
      }
      default:
        return null;
    }
  };
}
