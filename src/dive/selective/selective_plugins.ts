/**
 * Plugin reconfiguration for the selective wizard.
 *
 * Prompts the user to enable/disable plugins and collects
 * per-plugin configuration such as Obsidian vault path.
 *
 * @module
 */

import { Checkbox, Input, Select } from "@cliffy/prompt";
import { join } from "@std/path";

import { expandTilde } from "../../cli/config/paths.ts";
import { readNestedConfigValue } from "./selective_config.ts";

// ── Obsidian vault path ───────────────────────────────────────────────────────

/** Prompt and validate a path to an Obsidian vault directory. */
async function promptObsidianVaultPath(
  currentVaultPath: string,
): Promise<string> {
  let vaultPath = "";
  while (true) {
    vaultPath = await Input.prompt({
      message: "Path to your Obsidian vault",
      default: currentVaultPath || undefined,
    });
    if (vaultPath.length === 0) {
      console.log("  Vault path is required for Obsidian plugin.");
      continue;
    }
    vaultPath = expandTilde(vaultPath);
    try {
      await Deno.stat(join(vaultPath, ".obsidian"));
      return vaultPath;
    } catch {
      console.log(
        `  Not a valid Obsidian vault (no .obsidian/ folder at ${vaultPath})`,
      );
    }
  }
}

// ── Obsidian config assembly ──────────────────────────────────────────────────

/** Build the Obsidian plugin config object from vault path and classification. */
function buildObsidianPluginConfig(
  vaultPath: string,
  classification: string,
): Record<string, unknown> {
  return {
    obsidian: {
      enabled: true,
      vault_path: vaultPath,
      classification,
      daily_notes: { folder: "daily", date_format: "YYYY-MM-DD" },
    },
  };
}

// ── Public entry point ────────────────────────────────────────────────────────

/** Reconfigure the plugins section interactively. */
export async function reconfigurePlugins(
  existingConfig: Record<string, unknown>,
): Promise<Record<string, unknown> | undefined> {
  console.log("");
  console.log("  Plugins");
  console.log("");

  const hasObsidian =
    readNestedConfigValue(existingConfig, "plugins.obsidian.enabled") === true;

  const selectedPlugins = await Checkbox.prompt({
    message: "Which plugins would you like to configure?",
    options: [
      {
        name: "Obsidian (local vault integration)",
        value: "obsidian",
        checked: hasObsidian,
      },
    ],
  });

  if (!selectedPlugins.includes("obsidian")) {
    console.log("  No plugins selected.");
    return undefined;
  }

  const currentVaultPath = (readNestedConfigValue(
    existingConfig,
    "plugins.obsidian.vault_path",
  ) as string | undefined) ?? "";
  const vaultPath = await promptObsidianVaultPath(currentVaultPath);

  const currentClassification = (readNestedConfigValue(
    existingConfig,
    "plugins.obsidian.classification",
  ) as string | undefined) ?? "INTERNAL";
  const classification = await Select.prompt({
    message: "Vault classification level",
    options: ["INTERNAL", "PUBLIC", "CONFIDENTIAL", "RESTRICTED"],
    default: currentClassification,
  });

  console.log("  \u2713 Obsidian vault configured");
  return buildObsidianPluginConfig(vaultPath, classification);
}
