/**
 * CLI skill command — manage skills from The Reef marketplace.
 *
 * Provides search, install, update, publish, and list subcommands
 * for interacting with The Reef skill registry.
 *
 * @module
 */

import { join } from "@std/path";
import { resolveBaseDir } from "../config/paths.ts";
import { createReefRegistry } from "../../tools/skills/registry.ts";
import { createSkillLoader } from "../../tools/skills/loader.ts";
import type { ReefSkillListing } from "../../tools/skills/registry.ts";

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Resolve the managed skills directory path. */
function resolveManagedSkillsDir(): string {
  return join(resolveBaseDir(), "skills");
}

/** Format a skill listing for CLI display. */
function formatSkillListing(skill: ReefSkillListing): string {
  const lines = [
    `  ${skill.name}@${skill.version}`,
    `    ${skill.description}`,
    `    Category: ${skill.category}  Tags: ${skill.tags.join(", ")}`,
    `    Ceiling: ${skill.classificationCeiling}`,
  ];
  return lines.join("\n");
}

// ─── Subcommand handlers ─────────────────────────────────────────────────────

/** Search The Reef for skills matching a query. */
async function handleSkillSearch(
  flags: Readonly<Record<string, boolean | string>>,
): Promise<void> {
  const query = flags.query as string | undefined;
  if (!query) {
    console.log("Usage: triggerfish skill search <query>");
    Deno.exit(1);
  }
  const registry = createReefRegistry();
  const result = await registry.search({ query });
  if (!result.ok) {
    console.log(`Error: ${result.error}`);
    Deno.exit(1);
  }
  if (result.value.length === 0) {
    console.log(`No skills found matching "${query}".`);
    return;
  }
  console.log(`\nFound ${result.value.length} skill(s):\n`);
  for (const skill of result.value) {
    console.log(formatSkillListing(skill));
    console.log();
  }
}

/** Install a skill from The Reef. */
async function handleSkillInstall(
  flags: Readonly<Record<string, boolean | string>>,
): Promise<void> {
  const name = flags.skill_name as string | undefined;
  if (!name) {
    console.log("Usage: triggerfish skill install <name>");
    Deno.exit(1);
  }
  const managedDir = resolveManagedSkillsDir();
  await Deno.mkdir(managedDir, { recursive: true });
  const registry = createReefRegistry();
  const result = await registry.install(name, managedDir);
  if (!result.ok) {
    console.log(`Error: ${result.error}`);
    Deno.exit(1);
  }
  console.log(result.value);
}

/** Check for and optionally install skill updates. */
async function handleSkillUpdate(
  flags: Readonly<Record<string, boolean | string>>,
): Promise<void> {
  const specificName = flags.skill_name as string | undefined;
  const managedDir = resolveManagedSkillsDir();

  const loader = createSkillLoader({
    directories: [managedDir],
    dirTypes: { [managedDir]: "managed" },
  });
  const installedSkills = await loader.discover();

  const skillsToCheck = specificName
    ? installedSkills.filter((s) => s.name === specificName)
    : installedSkills;

  if (skillsToCheck.length === 0) {
    const msg = specificName
      ? `Skill "${specificName}" is not installed.`
      : "No managed skills installed.";
    console.log(msg);
    return;
  }

  const registry = createReefRegistry();
  const result = await registry.checkUpdates(
    skillsToCheck.map((s) => ({ name: s.name, version: s.version })),
  );
  if (!result.ok) {
    console.log(`Error: ${result.error}`);
    Deno.exit(1);
  }
  if (result.value.length === 0) {
    console.log("All skills are up to date.");
    return;
  }
  console.log(`Updates available for: ${result.value.join(", ")}`);
  console.log(
    'Run "triggerfish skill install <name>" to update a specific skill.',
  );
}

/** Validate and prepare a skill for publishing to The Reef. */
async function handleSkillPublish(
  flags: Readonly<Record<string, boolean | string>>,
): Promise<void> {
  const skillPath = flags.skill_path as string | undefined;
  if (!skillPath) {
    console.log("Usage: triggerfish skill publish <path-to-SKILL.md>");
    Deno.exit(1);
  }
  const registry = createReefRegistry();
  const result = await registry.publish(skillPath);
  if (!result.ok) {
    console.log(`Error: ${result.error}`);
    Deno.exit(1);
  }
  console.log(`\nSkill validated and prepared for publishing.`);
  console.log(`Files generated at: ${result.value}`);
  await attemptGhPublish(result.value);
}

/** Try to publish via gh CLI, or print manual instructions. */
async function attemptGhPublish(tempDir: string): Promise<void> {
  try {
    const check = new Deno.Command("gh", { args: ["--version"] });
    const checkOutput = await check.output();
    if (!checkOutput.success) {
      printManualPublishInstructions(tempDir);
      return;
    }
  } catch {
    printManualPublishInstructions(tempDir);
    return;
  }
  console.log("\nGitHub CLI detected. To submit your skill:");
  console.log("  1. Fork greghavens/reef-registry on GitHub");
  console.log(
    "  2. Copy the generated files from the temp directory to your fork",
  );
  console.log("  3. Push and open a PR against greghavens/reef-registry");
  console.log(`\n  Generated files: ${tempDir}/skills/`);
}

/** Print instructions for manual PR submission. */
function printManualPublishInstructions(tempDir: string): void {
  console.log("\nTo submit your skill to The Reef:");
  console.log("  1. Fork https://github.com/greghavens/reef-registry");
  console.log(
    `  2. Copy the contents of ${tempDir}/skills/ to your fork's skills/ directory`,
  );
  console.log("  3. Push your changes and open a Pull Request");
  console.log(
    "\nInstall the GitHub CLI (gh) for a more streamlined experience.",
  );
}

/** List locally installed managed skills. */
async function handleSkillList(): Promise<void> {
  const managedDir = resolveManagedSkillsDir();
  const loader = createSkillLoader({
    directories: [managedDir],
    dirTypes: { [managedDir]: "managed" },
  });
  const skills = await loader.discover();
  if (skills.length === 0) {
    console.log("No managed skills installed.");
    console.log(
      '\nSearch The Reef with: triggerfish skill search <query>',
    );
    return;
  }
  console.log(`${skills.length} managed skill(s):\n`);
  for (const skill of skills) {
    console.log(`  ${skill.name}@${skill.version}`);
    console.log(`    ${skill.description}`);
    console.log(`    Ceiling: ${skill.classificationCeiling}`);
    console.log();
  }
}

/** Print skill subcommand usage help. */
function printSkillUsage(): void {
  console.log("Usage: triggerfish skill <subcommand>");
  console.log("\nSubcommands:");
  console.log("  search <query>           Search The Reef for skills");
  console.log("  install <name>           Install a skill from The Reef");
  console.log("  update [name]            Check for skill updates");
  console.log(
    "  publish <path>           Validate and prepare a skill for publishing",
  );
  console.log(
    "  list                     List locally installed managed skills",
  );
}

// ─── Entry point ─────────────────────────────────────────────────────────────

/**
 * Dispatch skill subcommands from the CLI.
 *
 * Routes to search, install, update, publish, or list handlers
 * based on the parsed subcommand.
 */
export async function runSkill(
  subcommand: string | undefined,
  flags: Readonly<Record<string, boolean | string>>,
): Promise<void> {
  switch (subcommand) {
    case "search":
      await handleSkillSearch(flags);
      break;
    case "install":
      await handleSkillInstall(flags);
      break;
    case "update":
      await handleSkillUpdate(flags);
      break;
    case "publish":
      await handleSkillPublish(flags);
      break;
    case "list":
      await handleSkillList();
      break;
    default:
      printSkillUsage();
      break;
  }
}
