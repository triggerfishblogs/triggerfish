/**
 * Agent identity reconfiguration for the selective wizard.
 *
 * Parses the existing SPINE.md to extract name and mission defaults,
 * then prompts the user to update agent name, mission, and tone.
 *
 * @module
 */

import { Input, Select } from "@cliffy/prompt";

import { generateSpine } from "./wizard_generators.ts";

import type { ToneChoice, WizardAnswers } from "./wizard_types.ts";

// ── SPINE.md parsing ──────────────────────────────────────────────────────────

/** Extract the agent name from a SPINE.md heading line. */
function extractAgentName(spineContent: string): string {
  const nameMatch = spineContent.match(/^# (.+)$/m);
  return nameMatch?.[1] ?? "Triggerfish";
}

/** Extract the mission statement (first non-empty, non-heading line after the heading). */
function extractMissionStatement(spineContent: string): string {
  const lines = spineContent.split("\n");
  const headingIdx = lines.findIndex((l) => l.startsWith("# "));
  const fallback = "A helpful AI assistant that keeps my data safe.";
  if (headingIdx < 0) return fallback;

  for (let i = headingIdx + 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.length > 0 && !line.startsWith("#")) {
      return line;
    }
  }
  return fallback;
}

/** Parse agent name and mission from an existing SPINE.md. */
function parseSpineDefaults(
  existingSpine: string,
): { agentName: string; mission: string } {
  return {
    agentName: extractAgentName(existingSpine),
    mission: extractMissionStatement(existingSpine),
  };
}

// ── Tone prompt ───────────────────────────────────────────────────────────────

/** Prompt for communication tone and optional custom description. */
async function promptToneSelection(): Promise<{
  tone: ToneChoice;
  customTone: string;
}> {
  const tone = (await Select.prompt({
    message: "Communication tone",
    options: [
      { name: "Professional", value: "professional" },
      { name: "Casual", value: "casual" },
      { name: "Terse", value: "terse" },
      { name: "Custom", value: "custom" },
    ],
  })) as ToneChoice;

  let customTone = "";
  if (tone === "custom") {
    customTone = await Input.prompt({
      message: "Describe the tone you want",
    });
  }
  return { tone, customTone };
}

// ── Public entry point ────────────────────────────────────────────────────────

/** Reconfigure agent name, mission, and tone, writing an updated SPINE.md. */
export async function reconfigureAgentIdentity(
  existingSpine: string,
  spinePath: string,
): Promise<void> {
  console.log("");
  console.log("  Agent Name & Personality");
  console.log("");

  const defaults = parseSpineDefaults(existingSpine);

  const agentName = await Input.prompt({
    message: "Agent name",
    default: defaults.agentName,
  });
  const mission = await Input.prompt({
    message: "Mission (one sentence)",
    default: defaults.mission,
  });
  const { tone, customTone } = await promptToneSelection();

  const spineContent = generateSpine({
    agentName,
    mission,
    tone,
    customTone,
  } as WizardAnswers);
  await Deno.writeTextFile(spinePath, spineContent);
  console.log(`  \u2713 Updated: ${spinePath}`);
}
