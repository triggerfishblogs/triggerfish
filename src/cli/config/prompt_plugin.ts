/**
 * Interactive prompts for plugin configuration.
 * @module
 */

import { join } from "@std/path";
import { Confirm, Input, Select } from "@cliffy/prompt";
import { expandTilde } from "./paths.ts";

import type { PLUGIN_TYPES } from "./yaml_paths.ts";

type PluginType = typeof PLUGIN_TYPES[number];

/** Validate that a path contains an Obsidian vault (.obsidian/ marker). */
async function validateVaultPath(vaultPath: string): Promise<boolean> {
  try {
    await Deno.stat(join(vaultPath, ".obsidian"));
    return true;
  } catch {
    console.log(
      `  Not a valid Obsidian vault (no .obsidian/ folder found at ${vaultPath})`,
    );
    console.log("  Please enter the root folder of your Obsidian vault.");
    return false;
  }
}

/** Prompt for and validate an Obsidian vault path. */
async function promptVaultPath(): Promise<string> {
  while (true) {
    const raw = await Input.prompt({
      message: "Path to your Obsidian vault",
    });
    if (raw.length === 0) {
      console.log("  Vault path is required.");
      continue;
    }
    const expanded = expandTilde(raw);
    if (await validateVaultPath(expanded)) {
      return expanded;
    }
  }
}

/** Prompt for Obsidian vault settings: classification and daily notes. */
async function promptObsidianSettings(): Promise<Record<string, unknown>> {
  const classification = await Select.prompt({
    message: "Vault classification level",
    options: ["INTERNAL", "PUBLIC", "CONFIDENTIAL", "RESTRICTED"],
    default: "INTERNAL",
  });

  const config: Record<string, unknown> = { classification };

  const enableDaily = await Confirm.prompt({
    message: "Enable daily notes?",
    default: true,
  });
  if (enableDaily) {
    config.daily_notes = { folder: "daily", date_format: "YYYY-MM-DD" };
  }

  return config;
}

/** Prompt for Obsidian plugin configuration. */
async function promptObsidianConfig(): Promise<Record<string, unknown>> {
  const vaultPath = await promptVaultPath();
  const settings = await promptObsidianSettings();

  console.log("  \u2713 Obsidian vault configured");
  return { enabled: true, vault_path: vaultPath, ...settings };
}

/** Prompt for plugin-specific config fields and return the config object. */
export async function promptPluginConfig(
  pluginType: PluginType,
): Promise<Record<string, unknown>> {
  switch (pluginType) {
    case "obsidian":
      return await promptObsidianConfig();
    default:
      return {};
  }
}
