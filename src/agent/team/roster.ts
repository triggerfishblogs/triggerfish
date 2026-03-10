/**
 * Team roster prompt generation.
 *
 * Generates a system prompt section injected into each team member's
 * session. The prompt is specific to each member — it tells them their
 * own role, their teammates, and how to collaborate.
 *
 * @module
 */

import type { TeamMemberInstance } from "./types.ts";

/** Options for building a member's roster prompt. */
export interface RosterPromptOptions {
  /** Team name. */
  readonly teamName: string;
  /** Team objective/task. */
  readonly task: string;
  /** The member this prompt is for. */
  readonly member: TeamMemberInstance;
  /** All members in the team (including the current member). */
  readonly allMembers: readonly TeamMemberInstance[];
}

/** Build the lead-specific instructions section. */
function buildLeadInstructions(): string {
  return [
    "",
    "You are the team lead. You are responsible for:",
    "- Breaking down the team objective into assignments for team members",
    "- Receiving completed work from team members",
    "- Deciding when the objective is met",
    "- Calling team_disband when the team's work is done",
    "",
    "When you receive the initial task, decompose it and send assignments to the",
    "appropriate team members using sessions_send.",
  ].join("\n");
}

/** Build the teammate listing section. */
function buildTeammateList(
  currentRole: string,
  allMembers: readonly TeamMemberInstance[],
): string {
  const teammates = allMembers.filter((m) => m.role !== currentRole);
  if (teammates.length === 0) return "";

  const lines = teammates.map(
    (m) =>
      `- **${m.role}**${
        m.isLead ? " (lead)" : ""
      } (session: ${m.sessionId}): ${m.description}`,
  );

  return ["", "**Your teammates:**", ...lines].join("\n");
}

/** Build the collaboration instructions section. */
function buildCollaborationInstructions(isLead: boolean): string {
  const lines = [
    "",
    "**How to collaborate:**",
    "- Use sessions_send to send work, results, or questions to a teammate",
    "- Address teammates by their session ID",
    "- When your work on a piece is complete, send the deliverable to whoever",
    "  needs it next (the lead, or directly to another member if the handoff is clear)",
    "- You will receive work from teammates as inbound messages",
  ];

  if (!isLead) {
    lines.push(
      "- If you are unsure who should receive your output, send it to the lead",
    );
  }

  return lines.join("\n");
}

/** Build the resilience instructions section. */
function buildResilienceInstructions(): string {
  return [
    "",
    "**Critical rules:**",
    "- NEVER apologize or say you are unable to complete the task",
    "- If a tool call fails (rate limit, timeout, error), retry after a pause or try an alternative approach",
    "- If web_search fails, try a different query or use web_fetch on a known URL",
    "- If all approaches fail, report WHAT you tried and WHAT partial results you have — never just say sorry",
    "- Always produce a concrete deliverable, even if partial or based on limited data",
    "- Do NOT narrate your plans — execute them immediately with tool calls",
  ].join("\n");
}

/** Build the classification notice section. */
function buildClassificationNotice(
  ceiling: string | undefined,
): string {
  const ceilingText = ceiling ?? "unrestricted";
  return [
    "",
    `**Classification:** Your classification ceiling is ${ceilingText}.`,
    "Data you send to teammates is subject to write-down rules. You cannot send",
    "data to a teammate whose session is at a lower classification level than",
    "the data's classification.",
  ].join("\n");
}

/**
 * Build the team roster system prompt for a specific member.
 *
 * Each member gets a personalized prompt that identifies their role,
 * lists their teammates with session IDs, and explains collaboration.
 */
export function buildTeamRosterPrompt(options: RosterPromptOptions): string {
  const { teamName, task, member, allMembers } = options;

  const sections = [
    `## Team: ${teamName}`,
    "",
    `You are the **${member.role}** on this team.`,
    "",
    `**Your role:** ${member.description}`,
    "",
    `**Team objective:** ${task}`,
  ];

  if (member.isLead) {
    sections.push(buildLeadInstructions());
  }

  sections.push(buildTeammateList(member.role, allMembers));
  sections.push(buildCollaborationInstructions(member.isLead));
  sections.push(buildResilienceInstructions());
  sections.push(buildClassificationNotice(member.classificationCeiling));

  return sections.join("\n");
}
