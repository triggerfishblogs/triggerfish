/**
 * Team roster prompt generation tests.
 *
 * Verifies that each member receives a personalized prompt
 * with their role, teammates, and collaboration instructions.
 */
import { assert, assertStringIncludes } from "@std/assert";
import { buildTeamRosterPrompt } from "../../../src/agent/team/roster.ts";
import type { TeamMemberInstance } from "../../../src/agent/team/types.ts";
import type { SessionId } from "../../../src/core/types/session.ts";

// ─── Test helpers ────────────────────────────────────────────────────────────

function createTestMembers(): TeamMemberInstance[] {
  return [
    {
      role: "architect",
      description: "Designs system architecture",
      isLead: true,
      sessionId: "sess-arch" as SessionId,
      model: "gpt-4",
      status: "active",
      currentTaint: "PUBLIC",
      lastActivityAt: new Date(),
    },
    {
      role: "researcher",
      description: "Researches technical topics",
      isLead: false,
      sessionId: "sess-research" as SessionId,
      model: "gpt-4",
      status: "active",
      currentTaint: "PUBLIC",
      lastActivityAt: new Date(),
    },
    {
      role: "writer",
      description: "Writes documentation",
      isLead: false,
      sessionId: "sess-writer" as SessionId,
      model: "gpt-4",
      classificationCeiling: "INTERNAL",
      status: "active",
      currentTaint: "PUBLIC",
      lastActivityAt: new Date(),
    },
  ];
}

// ─── Lead prompt tests ───────────────────────────────────────────────────────

Deno.test("buildTeamRosterPrompt: lead gets team name and role", () => {
  const members = createTestMembers();
  const lead = members[0];

  const prompt = buildTeamRosterPrompt({
    teamName: "Design Team",
    task: "Design a new API",
    member: lead,
    allMembers: members,
  });

  assertStringIncludes(prompt, "## Team: Design Team");
  assertStringIncludes(prompt, "**architect**");
  assertStringIncludes(prompt, "Designs system architecture");
});

Deno.test("buildTeamRosterPrompt: lead gets lead-specific instructions", () => {
  const members = createTestMembers();
  const lead = members[0];

  const prompt = buildTeamRosterPrompt({
    teamName: "Design Team",
    task: "Design a new API",
    member: lead,
    allMembers: members,
  });

  assertStringIncludes(prompt, "You are the team lead");
  assertStringIncludes(prompt, "team_disband");
  assertStringIncludes(prompt, "Breaking down the team objective");
});

Deno.test("buildTeamRosterPrompt: lead sees teammates with session IDs", () => {
  const members = createTestMembers();
  const lead = members[0];

  const prompt = buildTeamRosterPrompt({
    teamName: "Design Team",
    task: "Design a new API",
    member: lead,
    allMembers: members,
  });

  assertStringIncludes(prompt, "researcher");
  assertStringIncludes(prompt, "sess-research");
  assertStringIncludes(prompt, "writer");
  assertStringIncludes(prompt, "sess-writer");
  // Lead should not see itself in teammates
  assert(!prompt.includes("sess-arch"));
});

Deno.test("buildTeamRosterPrompt: lead does not get 'send to lead' instruction", () => {
  const members = createTestMembers();
  const lead = members[0];

  const prompt = buildTeamRosterPrompt({
    teamName: "Design Team",
    task: "Design a new API",
    member: lead,
    allMembers: members,
  });

  assert(!prompt.includes("send it to the lead"));
});

// ─── Non-lead prompt tests ───────────────────────────────────────────────────

Deno.test("buildTeamRosterPrompt: non-lead gets role and team objective", () => {
  const members = createTestMembers();
  const researcher = members[1];

  const prompt = buildTeamRosterPrompt({
    teamName: "Design Team",
    task: "Design a new API",
    member: researcher,
    allMembers: members,
  });

  assertStringIncludes(prompt, "**researcher**");
  assertStringIncludes(prompt, "Design a new API");
});

Deno.test("buildTeamRosterPrompt: non-lead does not get lead instructions", () => {
  const members = createTestMembers();
  const researcher = members[1];

  const prompt = buildTeamRosterPrompt({
    teamName: "Design Team",
    task: "Design a new API",
    member: researcher,
    allMembers: members,
  });

  assert(!prompt.includes("You are the team lead"));
});

Deno.test("buildTeamRosterPrompt: non-lead sees teammates including lead", () => {
  const members = createTestMembers();
  const researcher = members[1];

  const prompt = buildTeamRosterPrompt({
    teamName: "Design Team",
    task: "Design a new API",
    member: researcher,
    allMembers: members,
  });

  assertStringIncludes(prompt, "architect");
  assertStringIncludes(prompt, "(lead)");
  assertStringIncludes(prompt, "sess-arch");
  assertStringIncludes(prompt, "writer");
  // Should not see itself
  assert(!prompt.includes("sess-research"));
});

Deno.test("buildTeamRosterPrompt: non-lead gets 'send to lead' fallback instruction", () => {
  const members = createTestMembers();
  const researcher = members[1];

  const prompt = buildTeamRosterPrompt({
    teamName: "Design Team",
    task: "Design a new API",
    member: researcher,
    allMembers: members,
  });

  assertStringIncludes(prompt, "send it to the lead");
});

// ─── Classification notice tests ─────────────────────────────────────────────

Deno.test("buildTeamRosterPrompt: shows classification ceiling when set", () => {
  const members = createTestMembers();
  const writer = members[2]; // has INTERNAL ceiling

  const prompt = buildTeamRosterPrompt({
    teamName: "Design Team",
    task: "Design a new API",
    member: writer,
    allMembers: members,
  });

  assertStringIncludes(prompt, "INTERNAL");
  assertStringIncludes(prompt, "write-down rules");
});

Deno.test("buildTeamRosterPrompt: shows unrestricted when no ceiling", () => {
  const members = createTestMembers();
  const researcher = members[1]; // no ceiling

  const prompt = buildTeamRosterPrompt({
    teamName: "Design Team",
    task: "Design a new API",
    member: researcher,
    allMembers: members,
  });

  assertStringIncludes(prompt, "unrestricted");
});

// ─── Collaboration instructions ──────────────────────────────────────────────

Deno.test("buildTeamRosterPrompt: includes sessions_send instruction", () => {
  const members = createTestMembers();

  const prompt = buildTeamRosterPrompt({
    teamName: "Design Team",
    task: "Design a new API",
    member: members[0],
    allMembers: members,
  });

  assertStringIncludes(prompt, "sessions_send");
});
