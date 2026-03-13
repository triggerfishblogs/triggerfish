/**
 * CLI plugin command — manage plugins from The Reef and local directory.
 *
 * Provides search, install, update, publish, and list subcommands
 * for interacting with the plugin Reef registry and the local
 * `~/.triggerfish/plugins/` directory.
 *
 * Dependencies are injected from the CLI wiring layer to avoid
 * importing gateway/ from a non-startup CLI command file.
 *
 * @module
 */

import type { PluginReefRegistry } from "../../plugin/reef.ts";
import { scanPluginDirectory } from "../../plugin/scanner.ts";

/** Dependencies injected by the CLI wiring layer. */
export interface PluginCommandDeps {
  /** Factory to create a plugin Reef registry client. */
  readonly createRegistry: () => PluginReefRegistry;
  /** Resolve the plugins directory path. */
  readonly resolvePluginsDir: () => string;
}

/** Search The Reef for plugins. */
async function handlePluginSearch(
  flags: Readonly<Record<string, boolean | string>>,
  deps: PluginCommandDeps,
): Promise<void> {
  const query = flags.query as string | undefined;
  if (!query) {
    console.error("Usage: triggerfish plugin search <query>");
    Deno.exit(1);
  }
  const registry = deps.createRegistry();
  const result = await registry.search(query);
  if (!result.ok) {
    console.error(`Error: ${result.error}`);
    Deno.exit(1);
  }
  if (result.value.length === 0) {
    console.log(`No plugins found matching "${query}".`);
    return;
  }
  console.log(`\nFound ${result.value.length} plugin(s):\n`);
  for (const plugin of result.value) {
    console.log(`  ${plugin.name}@${plugin.version}`);
    console.log(`    ${plugin.description}`);
    console.log(
      `    Classification: ${plugin.classification}  Trust: ${plugin.trust}`,
    );
    if (plugin.tags.length > 0) {
      console.log(`    Tags: ${plugin.tags.join(", ")}`);
    }
    console.log();
  }
}

/** Install a plugin from The Reef. */
async function handlePluginInstall(
  flags: Readonly<Record<string, boolean | string>>,
  deps: PluginCommandDeps,
): Promise<void> {
  const name = flags.plugin_name as string | undefined;
  if (!name) {
    console.error("Usage: triggerfish plugin install <name>");
    Deno.exit(1);
  }
  const pluginsDir = deps.resolvePluginsDir();
  await Deno.mkdir(pluginsDir, { recursive: true });
  const registry = deps.createRegistry();
  const result = await registry.install(name, pluginsDir);
  if (!result.ok) {
    console.error(`Error: ${result.error}`);
    Deno.exit(1);
  }
  console.log(result.value);
  console.log(
    "\nTo activate, add the following to your triggerfish.yaml:",
  );
  console.log(`  plugins:`);
  console.log(`    ${name}:`);
  console.log(`      enabled: true`);
  console.log(
    "\nThen restart Triggerfish, or use the plugin_install tool at runtime.",
  );
}

/** Check for plugin updates. */
async function handlePluginUpdate(
  flags: Readonly<Record<string, boolean | string>>,
  deps: PluginCommandDeps,
): Promise<void> {
  const specificName = flags.plugin_name as string | undefined;
  const pluginsDir = deps.resolvePluginsDir();

  // Discover installed plugins
  const installed: { name: string; version?: string }[] = [];
  try {
    for await (const entry of Deno.readDir(pluginsDir)) {
      if (!entry.isDirectory) continue;
      if (specificName && entry.name !== specificName) continue;
      try {
        const mod = await import(`${pluginsDir}/${entry.name}/mod.ts`);
        installed.push({
          name: entry.name,
          version: mod.manifest?.version,
        });
      } catch {
        installed.push({ name: entry.name });
      }
    }
  } catch {
    console.log("No plugins directory found.");
    return;
  }

  if (installed.length === 0) {
    console.log(
      specificName
        ? `Plugin "${specificName}" is not installed.`
        : "No plugins installed.",
    );
    return;
  }

  const registry = deps.createRegistry();
  const result = await registry.checkUpdates(installed);
  if (!result.ok) {
    console.error(`Error: ${result.error}`);
    Deno.exit(1);
  }
  if (result.value.length === 0) {
    console.log("All plugins are up to date.");
    return;
  }
  console.log(`Updates available for: ${result.value.join(", ")}`);
  console.log(
    'Run "triggerfish plugin install <name>" to update a specific plugin.',
  );
}

/** Validate and prepare a plugin for Reef publishing. */
async function handlePluginPublish(
  flags: Readonly<Record<string, boolean | string>>,
  deps: PluginCommandDeps,
): Promise<void> {
  const pluginDir = flags.plugin_path as string | undefined;
  if (!pluginDir) {
    console.error("Usage: triggerfish plugin publish <path-to-plugin-dir>");
    Deno.exit(1);
  }
  const registry = deps.createRegistry();
  const result = await registry.publish(pluginDir);
  if (!result.ok) {
    console.error(`Error: ${result.error}`);
    Deno.exit(1);
  }
  console.log("\nPlugin validated and prepared for publishing.");
  console.log(`Files generated at: ${result.value}`);
  console.log("\nTo submit to The Reef:");
  console.log("  1. Fork https://github.com/greghavens/reef-registry");
  console.log(
    `  2. Copy the contents of ${result.value}/plugins/ to your fork`,
  );
  console.log("  3. Push your changes and open a Pull Request");
}

/** Scan a local plugin for security issues. */
async function handlePluginScan(
  flags: Readonly<Record<string, boolean | string>>,
  _deps: PluginCommandDeps,
): Promise<void> {
  const pluginDir = flags.plugin_path as string | undefined;
  if (!pluginDir) {
    console.error("Usage: triggerfish plugin scan <path-to-plugin-dir>");
    Deno.exit(1);
  }
  const result = await scanPluginDirectory(pluginDir);
  console.log(`\nScanned ${result.scannedFiles.length} file(s).`);
  if (result.ok) {
    console.log("Security scan passed.");
    if (result.warnings.length > 0) {
      console.log(`\nWarnings (non-blocking):`);
      for (const w of result.warnings) {
        console.log(`  - ${w}`);
      }
    }
  } else {
    console.error("Security scan FAILED.");
    for (const w of result.warnings) {
      console.error(`  - ${w}`);
    }
    Deno.exit(1);
  }
}

/** List locally installed plugins. */
async function handlePluginList(deps: PluginCommandDeps): Promise<void> {
  const pluginsDir = deps.resolvePluginsDir();
  const plugins: {
    name: string;
    version?: string;
    classification?: string;
    trust?: string;
  }[] = [];

  try {
    for await (const entry of Deno.readDir(pluginsDir)) {
      if (!entry.isDirectory) continue;
      try {
        const mod = await import(`${pluginsDir}/${entry.name}/mod.ts`);
        if (mod.manifest) {
          plugins.push({
            name: entry.name,
            version: mod.manifest.version,
            classification: mod.manifest.classification,
            trust: mod.manifest.trust,
          });
        } else {
          plugins.push({ name: entry.name });
        }
      } catch {
        plugins.push({ name: entry.name });
      }
    }
  } catch {
    console.log("No plugins directory found (~/.triggerfish/plugins/).");
    console.log(
      '\nSearch The Reef with: triggerfish plugin search <query>',
    );
    return;
  }

  if (plugins.length === 0) {
    console.log("No plugins installed.");
    return;
  }

  console.log(`${plugins.length} plugin(s):\n`);
  for (const p of plugins) {
    const version = p.version ? `@${p.version}` : "";
    console.log(`  ${p.name}${version}`);
    if (p.classification) {
      console.log(
        `    Classification: ${p.classification}  Trust: ${p.trust ?? "unknown"}`,
      );
    }
  }
}

/** Print plugin subcommand usage help. */
function printPluginUsage(): void {
  console.log("Usage: triggerfish plugin <subcommand>");
  console.log("\nSubcommands:");
  console.log(
    "  search <query>           Search The Reef for plugins",
  );
  console.log(
    "  install <name>           Install a plugin from The Reef",
  );
  console.log(
    "  update [name]            Check for plugin updates",
  );
  console.log(
    "  publish <dir>            Validate and prepare a plugin for publishing",
  );
  console.log(
    "  scan <dir>               Run security scan on a local plugin",
  );
  console.log(
    "  list                     List locally installed plugins",
  );
}

/**
 * Dispatch plugin subcommands from the CLI.
 *
 * Routes to search, install, update, publish, scan, or list handlers
 * based on the parsed subcommand.
 */
export async function runPlugin(
  subcommand: string | undefined,
  flags: Readonly<Record<string, boolean | string>>,
  deps: PluginCommandDeps,
): Promise<void> {
  switch (subcommand) {
    case "search":
      await handlePluginSearch(flags, deps);
      break;
    case "install":
      await handlePluginInstall(flags, deps);
      break;
    case "update":
      await handlePluginUpdate(flags, deps);
      break;
    case "publish":
      await handlePluginPublish(flags, deps);
      break;
    case "scan":
      await handlePluginScan(flags, deps);
      break;
    case "list":
      await handlePluginList(deps);
      break;
    default:
      printPluginUsage();
      break;
  }
}
