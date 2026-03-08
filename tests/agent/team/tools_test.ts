/**
 * Team tool executor tests.
 *
 * Tests individual tool calls via createTeamToolExecutor,
 * including validation of untrusted LLM input.
 */
import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import type { ClassificationLevel, Result } from "../../../src/core/types/classification.ts";
import type { SessionId } from "../../../src/core/types/session.ts";
import type { TeamManager } from "../../../src/agent/team/manager.ts";
import type { TeamId, TeamInstance } from "../../../src/agent/team/types.ts";
import {
  createTeamToolExecutor,
  getTeamToolDefinitions,
  TEAM_SYSTEM_PROMPT,
} from "../../../src/agent/team/tools.ts";
import type { TeamToolContext } from "../../../src/agent/team/tools.ts";

// ─── Test helpers ────────────────────────────────────────────────────────────

const CALLER = "test-caller" as SessionId;

function createMockTeamInstance(overrides?: Partial<TeamInstance>): TeamInstance {
  return {
    id: "team-123" as TeamId,
    name: "Test Team",
    task: "Build something",
    members: [
      {
        role: "lead",
        description: "Coordinates",
        isLead: true,
        sessionId: "sess-lead" as SessionId,
        model: "gpt-4",
        status: "active",
        currentTaint: "PUBLIC" as ClassificationLevel,
        lastActivityAt: new Date("2026-01-01"),
      },
      {
        role: "worker",
        description: "Does work",
        isLead: false,
        sessionId: "sess-worker" as SessionId,
        model: "gpt-4",
        status: "active",
        currentTaint: "PUBLIC" as ClassificationLevel,
        lastActivityAt: new Date("2026-01-01"),
      },
    ],
    status: "running",
    aggregateTaint: "PUBLIC",
    createdAt: new Date("2026-01-01"),
    createdBy: CALLER,
    idleTimeoutSeconds: 300,
    maxLifetimeSeconds: 3600,
    ...overrides,
  };
}

function createMockManager(overrides?: Partial<TeamManager>): TeamManager {
  return {
    createTeam: async () => ({
      ok: true,
      value: createMockTeamInstance(),
    }),
    fetchTeamStatus: async () => ({
      ok: true,
      value: createMockTeamInstance(),
    }),
    disbandTeam: async () => ({
      ok: true,
      value: createMockTeamInstance({ status: "disbanded" }),
    }),
    deliverTeamMessage: async () => ({
      ok: true,
      value: { delivered: true as const },
    }),
    listTeams: async () => [],
    ...overrides,
  };
}

function createTestContext(
  managerOverrides?: Partial<TeamManager>,
): TeamToolContext {
  return {
    teamManager: createMockManager(managerOverrides),
    callerSessionId: CALLER,
  };
}

function createTestExecutor(
  managerOverrides?: Partial<TeamManager>,
): (name: string, input: Record<string, unknown>) => Promise<string | null> {
  return createTeamToolExecutor(createTestContext(managerOverrides));
}

// ─── Definition tests ────────────────────────────────────────────────────────

Deno.test("getTeamToolDefinitions: returns 4 tool definitions", () => {
  const defs = getTeamToolDefinitions();
  assertEquals(defs.length, 4);

  const names = defs.map((d) => d.name);
  assert(names.includes("team_create"));
  assert(names.includes("team_status"));
  assert(names.includes("team_disband"));
  assert(names.includes("team_message"));
});

Deno.test("TEAM_SYSTEM_PROMPT: contains tool names", () => {
  assertStringIncludes(TEAM_SYSTEM_PROMPT, "team_create");
  assertStringIncludes(TEAM_SYSTEM_PROMPT, "team_status");
  assertStringIncludes(TEAM_SYSTEM_PROMPT, "team_message");
  assertStringIncludes(TEAM_SYSTEM_PROMPT, "team_disband");
});

// ─── Executor chaining tests ─────────────────────────────────────────────────

Deno.test("executor: returns null for unknown tool names", async () => {
  const exec = createTestExecutor();
  const result = await exec("unknown_tool", {});
  assertEquals(result, null);
});

Deno.test("executor: returns unavailable message when no context", async () => {
  const exec = createTeamToolExecutor(undefined);
  const result = await exec("team_create", {});
  assert(result !== null);
  assertStringIncludes(result!, "not available");
});

// ─── team_create tests ───────────────────────────────────────────────────────

Deno.test("team_create: validates required name", async () => {
  const exec = createTestExecutor();
  const result = await exec("team_create", { task: "x", members: [] });
  assert(result !== null);
  assertStringIncludes(result!, "Error");
  assertStringIncludes(result!, "name");
});

Deno.test("team_create: validates required task", async () => {
  const exec = createTestExecutor();
  const result = await exec("team_create", { name: "Team", members: [] });
  assert(result !== null);
  assertStringIncludes(result!, "Error");
  assertStringIncludes(result!, "task");
});

Deno.test("team_create: validates members array", async () => {
  const exec = createTestExecutor();
  const result = await exec("team_create", {
    name: "Team",
    task: "Build",
    members: "not-an-array",
  });
  assert(result !== null);
  assertStringIncludes(result!, "Error");
});

Deno.test("team_create: returns team_id on success", async () => {
  const exec = createTestExecutor();
  const result = await exec("team_create", {
    name: "My Team",
    task: "Build feature",
    members: [
      { role: "lead", description: "Leads", is_lead: true },
      { role: "dev", description: "Develops", is_lead: false },
    ],
  });

  assert(result !== null);
  const parsed = JSON.parse(result!);
  assertEquals(parsed.team_id, "team-123");
  assertEquals(parsed.name, "Test Team");
  assertEquals(parsed.status, "running");
  assertEquals(parsed.members.length, 2);
});

Deno.test("team_create: parses classification_ceiling", async () => {
  let receivedDef: { classificationCeiling?: ClassificationLevel } | null = null;
  const exec = createTestExecutor({
    createTeam: async (def) => {
      receivedDef = def;
      return { ok: true, value: createMockTeamInstance() };
    },
  });

  await exec("team_create", {
    name: "Secure Team",
    task: "Handle secrets",
    members: [
      { role: "lead", description: "Leads", is_lead: true },
    ],
    classification_ceiling: "CONFIDENTIAL",
  });

  assert(receivedDef !== null);
  assertEquals(receivedDef!.classificationCeiling, "CONFIDENTIAL");
});

Deno.test("team_create: rejects invalid classification_ceiling", async () => {
  const exec = createTestExecutor();
  const result = await exec("team_create", {
    name: "Team",
    task: "Build",
    members: [{ role: "lead", description: "Leads", is_lead: true }],
    classification_ceiling: "SUPER_SECRET",
  });

  assert(result !== null);
  assertStringIncludes(result!, "Error");
  assertStringIncludes(result!, "Invalid classification");
});

// ─── team_status tests ───────────────────────────────────────────────────────

Deno.test("team_status: validates required team_id", async () => {
  const exec = createTestExecutor();
  const result = await exec("team_status", {});
  assert(result !== null);
  assertStringIncludes(result!, "Error");
  assertStringIncludes(result!, "team_id");
});

Deno.test("team_status: returns team state", async () => {
  const exec = createTestExecutor();
  const result = await exec("team_status", { team_id: "team-123" });

  assert(result !== null);
  const parsed = JSON.parse(result!);
  assertEquals(parsed.team_id, "team-123");
  assertEquals(parsed.status, "running");
  assertEquals(parsed.aggregate_taint, "PUBLIC");
  assertEquals(parsed.members.length, 2);
});

Deno.test("team_status: returns error for missing team", async () => {
  const exec = createTestExecutor({
    fetchTeamStatus: async () => ({
      ok: false,
      error: "Team not found: missing-id",
    }),
  });

  const result = await exec("team_status", { team_id: "missing-id" });
  assert(result !== null);
  assertStringIncludes(result!, "Error");
  assertStringIncludes(result!, "not found");
});

// ─── team_disband tests ──────────────────────────────────────────────────────

Deno.test("team_disband: validates required team_id", async () => {
  const exec = createTestExecutor();
  const result = await exec("team_disband", {});
  assert(result !== null);
  assertStringIncludes(result!, "Error");
});

Deno.test("team_disband: returns disbanded status", async () => {
  const exec = createTestExecutor();
  const result = await exec("team_disband", {
    team_id: "team-123",
    reason: "Complete",
  });

  assert(result !== null);
  const parsed = JSON.parse(result!);
  assertEquals(parsed.status, "disbanded");
});

// ─── team_message tests ──────────────────────────────────────────────────────

Deno.test("team_message: validates required team_id", async () => {
  const exec = createTestExecutor();
  const result = await exec("team_message", { message: "hi" });
  assert(result !== null);
  assertStringIncludes(result!, "Error");
});

Deno.test("team_message: validates required message", async () => {
  const exec = createTestExecutor();
  const result = await exec("team_message", { team_id: "team-123" });
  assert(result !== null);
  assertStringIncludes(result!, "Error");
  assertStringIncludes(result!, "message");
});

Deno.test("team_message: returns delivery confirmation", async () => {
  const exec = createTestExecutor();
  const result = await exec("team_message", {
    team_id: "team-123",
    role: "worker",
    message: "Check status",
  });

  assert(result !== null);
  const parsed = JSON.parse(result!);
  assertEquals(parsed.delivered, true);
  assertEquals(parsed.target_role, "worker");
});

Deno.test("team_message: defaults role to lead", async () => {
  const exec = createTestExecutor();
  const result = await exec("team_message", {
    team_id: "team-123",
    message: "Status update",
  });

  assert(result !== null);
  const parsed = JSON.parse(result!);
  assertEquals(parsed.target_role, "lead");
});
