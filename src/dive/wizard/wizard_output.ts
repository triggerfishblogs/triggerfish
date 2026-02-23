/**
 * File writing and completion output for the dive wizard.
 *
 * Generates the config, SPINE.md, and TRIGGER.md files,
 * stores secrets, and prints summary messages.
 *
 * @module
 */

import { join } from "@std/path";

import type { WizardAnswers } from "./wizard_types.ts";

import {
  createDirectoryTree,
  generateConfig,
  generateSpine,
  generateTrigger,
} from "./wizard_generators.ts";

import { storeWizardSecrets } from "./wizard_secrets.ts";

// ── TRIGGER.md ────────────────────────────────────────────────────────────────

/** Write TRIGGER.md if it does not already exist. */
async function writeTriggerFile(baseDir: string): Promise<void> {
  const triggerPath = join(baseDir, "TRIGGER.md");
  try {
    await Deno.stat(triggerPath);
    // Already exists - don't overwrite
  } catch {
    const triggerContent = generateTrigger();
    await Deno.writeTextFile(triggerPath, triggerContent);
    console.log(`  \u2713 Created: ${triggerPath}`);
  }
}

// ── Completion messages ───────────────────────────────────────────────────────

/** Print daemon start instructions based on user choice. */
function printDaemonStartHint(installDaemon: boolean): void {
  if (installDaemon) {
    console.log("  Starting Triggerfish daemon...");
  } else {
    console.log("  To start Triggerfish later:");
    console.log("    triggerfish start    # Background daemon");
    console.log("    triggerfish run      # Foreground (debug)");
  }
}

/** Print next-steps hints with file paths. */
function printNextStepsHint(spinePath: string, configPath: string): void {
  console.log("");
  console.log(`  Edit your agent's identity: ${spinePath}`);
  console.log(`  Edit configuration:         ${configPath}`);
  console.log("  Run health check:           triggerfish patrol");
  console.log("  Connect integrations:       triggerfish connect google");
  console.log("                              triggerfish connect github");
  console.log("");
}

/** Print the full completion summary block. */
function printCompletionSummary(options: {
  installDaemon: boolean;
  apiKeyPresent: boolean;
  spinePath: string;
  configPath: string;
}): void {
  if (options.apiKeyPresent) {
    console.log(
      "  \u2713 API key stored in OS keychain. triggerfish.yaml references it by name.",
    );
  }
  console.log("");
  console.log("  \u2713 Setup complete!");
  console.log("");
  printDaemonStartHint(options.installDaemon);
  printNextStepsHint(options.spinePath, options.configPath);
}

// ── Config + SPINE file writing ───────────────────────────────────────────────

/** Write triggerfish.yaml and SPINE.md, returning their paths. */
async function writeConfigAndSpineFiles(
  baseDir: string,
  answers: WizardAnswers,
): Promise<{ configPath: string; spinePath: string }> {
  const configPath = join(baseDir, "triggerfish.yaml");
  const spinePath = join(baseDir, "SPINE.md");

  const configContent = generateConfig(answers);
  await Deno.writeTextFile(configPath, configContent);
  console.log(`  \u2713 Created: ${configPath}`);

  const spineContent = generateSpine(answers);
  await Deno.writeTextFile(spinePath, spineContent);
  console.log(`  \u2713 Created: ${spinePath}`);

  return { configPath, spinePath };
}

// ── Public entry point ────────────────────────────────────────────────────────

/**
 * Write all wizard output files (directories, secrets, config, SPINE, TRIGGER)
 * and print the completion summary.
 */
export async function writeWizardOutputFiles(
  baseDir: string,
  answers: WizardAnswers,
): Promise<{ configPath: string; spinePath: string }> {
  await createDirectoryTree(baseDir);

  const storedKeys = await storeWizardSecrets(answers);
  if (storedKeys.length > 0) {
    console.log(
      `  \u2713 Secrets stored in OS keychain (${storedKeys.length} key(s))`,
    );
  }

  const paths = await writeConfigAndSpineFiles(baseDir, answers);
  await writeTriggerFile(baseDir);

  printCompletionSummary({
    installDaemon: answers.installDaemon,
    apiKeyPresent: answers.apiKey.length > 0,
    spinePath: paths.spinePath,
    configPath: paths.configPath,
  });

  return paths;
}
