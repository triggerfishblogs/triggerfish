/**
 * Plugin selection step for the dive wizard.
 *
 * Handles Obsidian vault path validation, classification
 * selection, and plugin choice prompts.
 *
 * @module
 */

import { Checkbox, Input, Select } from "@cliffy/prompt";
import { join } from "@std/path";

import { expandTilde } from "../cli/config/paths.ts";

// ── Result type ───────────────────────────────────────────────────────────────

/** Result of the plugin selection step. */
export interface PluginResult {
  readonly selectedPlugins: string[];
  readonly obsidianVaultPath: string;
  readonly obsidianClassification: string;
}

// ── Obsidian helpers ──────────────────────────────────────────────────────────

/** Prompt and validate a path to an Obsidian vault directory. */
async function promptValidObsidianVaultPath(): Promise<string> {
  while (true) {
    const rawPath = await Input.prompt({
      message: "Path to your Obsidian vault",
    });
    if (rawPath.length === 0) {
      console.log("  Vault path is required for Obsidian plugin.");
      continue;
    }
    const expanded = expandTilde(rawPath);
    try {
      await Deno.stat(join(expanded, ".obsidian"));
      return expanded;
    } catch {
      console.log(
        `  Not a valid Obsidian vault (no .obsidian/ folder found at ${expanded})`,
      );
      console.log("  Please enter the root folder of your Obsidian vault.");
    }
  }
}

/** Prompt for the Obsidian vault classification level. */
async function selectObsidianClassification(): Promise<string> {
  return await Select.prompt({
    message: "Vault classification level",
    options: ["INTERNAL", "PUBLIC", "CONFIDENTIAL", "RESTRICTED"],
    default: "INTERNAL",
  });
}

/** Collect Obsidian vault path and classification. */
async function collectObsidianConfig(): Promise<{
  obsidianVaultPath: string;
  obsidianClassification: string;
}> {
  const obsidianVaultPath = await promptValidObsidianVaultPath();
  const obsidianClassification = await selectObsidianClassification();
  console.log("  \u2713 Obsidian vault configured");
  return { obsidianVaultPath, obsidianClassification };
}

// ── Plugin selection ──────────────────────────────────────────────────────────

/** Prompt for which plugins to configure. */
async function selectPluginChoices(): Promise<string[]> {
  return await Checkbox.prompt({
    message: "Which plugins would you like to configure?",
    options: [
      { name: "Obsidian (local vault integration)", value: "obsidian" },
    ],
  });
}

/** Run the plugin selection wizard step (Step 4/8). */
export async function promptPluginStep(): Promise<PluginResult> {
  console.log("  Step 4/8: Configure optional plugins");
  console.log("");

  const selectedPlugins = await selectPluginChoices();
  let obsidianVaultPath = "";
  let obsidianClassification = "INTERNAL";

  if (selectedPlugins.includes("obsidian")) {
    const obsidian = await collectObsidianConfig();
    obsidianVaultPath = obsidian.obsidianVaultPath;
    obsidianClassification = obsidian.obsidianClassification;
  }
  if (selectedPlugins.length === 0) {
    console.log(
      "  No plugins selected \u2014 add later with: triggerfish config add-plugin",
    );
  }
  console.log("");
  return { selectedPlugins, obsidianVaultPath, obsidianClassification };
}
