/**
 * TeamManager unit tests.
 *
 * Tests team creation, validation, disbanding, message delivery,
 * and team listing through the TeamManager interface.
 */
import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import type { ClassificationLevel, Result } from "../../../src/core/types/classification.ts";
import type { SessionId } from "../../../src/core/types/session.ts";
import type {
  SpawnedMember,
  SpawnMemberOptions,
  TeamManagerDeps,
} from "../../../src/agent/team/manager.ts";
import { createTeamManager } from "../../../src/agent/team/manager.ts";
import type {
  TeamDefinition,
  TeamId,
} from "../../../src/agent/team/types.ts";

// ─── Test helpers ────────────────────────────────────────────────────────────

/** In-memory storage provider for tests. */
function createTestStorage(): import("../../../src/core/storage/provider.ts").StorageProvider {
  const store = new Map<string, string>();
  return {
    set(key: string, value: string) { store.set(key, value); return Promise.resolve(); },
    get(key: string) { return Promise.resolve(store.get(key) ?? null); },
    delete(key: string) { store.delete(key); return Promise.resolve(); },
    list(prefix?: string) {
      const keys = [...store.keys()];
      return Promise.resolve(prefix ? keys.filter((k) => k.startsWith(prefix)) : keys);
    },
    close() { store.clear(); return Promise.resolve(); },
  };
}

let sessionCounter = 0;
const terminatedSessions = new Set<string>();
const sessionTaints = new Map<string, ClassificationLevel>();

function resetTestState(): void {
  sessionCounter = 0;
  terminatedSessions.clear();
  sessionTaints.clear();
}

function createTestDeps(
  overrides?: Partial<TeamManagerDeps>,
): TeamManagerDeps {
  return {
    storage: createTestStorage(),
    spawnMemberSession: (options: SpawnMemberOptions): Promise<SpawnedMember> => {
      sessionCounter++;
      const sessionId = `test-session-${sessionCounter}` as SessionId;
      sessionTaints.set(sessionId, "PUBLIC");
      return Promise.resolve({
        sessionId,
        model: options.model ?? "test-model",
      });
    },
    sendMessage: (
      _fromId: SessionId,
      _toId: SessionId,
      _content: string,
    ): Promise<Result<{ readonly delivered: true }, string>> => {
      return Promise.resolve({ ok: true, value: { delivered: true } });
    },
    getSessionTaint: (sessionId: SessionId): Promise<ClassificationLevel | null> => {
      return Promise.resolve(sessionTaints.get(sessionId as string) ?? null);
    },
    terminateSession: (sessionId: SessionId): Promise<void> => {
      terminatedSessions.add(sessionId as string);
      return Promise.resolve();
    },
    ...overrides,
  };
}

function createValidDefinition(
  overrides?: Partial<TeamDefinition>,
): TeamDefinition {
  return {
    name: "Test Team",
    task: "Build a test feature",
    members: [
      {
        role: "lead",
        description: "Coordinates work",
        isLead: true,
      },
      {
        role: "researcher",
        description: "Researches topics",
        isLead: false,
      },
    ],
    ...overrides,
  };
}

const CALLER = "caller-session" as SessionId;

// ─── Creation tests ──────────────────────────────────────────────────────────

Deno.test("createTeam: spawns sessions and returns team instance", async () => {
  resetTestState();
  const deps = createTestDeps();
  const manager = createTeamManager(deps);
  const def = createValidDefinition();

  const result = await manager.createTeam(def, CALLER);

  assert(result.ok);
  const team = result.value;
  assertEquals(team.name, "Test Team");
  assertEquals(team.task, "Build a test feature");
  assertEquals(team.status, "running");
  assertEquals(team.members.length, 2);
  assertEquals(team.aggregateTaint, "PUBLIC");
  assertEquals(team.createdBy, CALLER);
  manager.stopAllMonitors();
});

Deno.test("createTeam: members have correct roles and session IDs", async () => {
  resetTestState();
  const deps = createTestDeps();
  const manager = createTeamManager(deps);

  const result = await manager.createTeam(createValidDefinition(), CALLER);

  assert(result.ok);
  const lead = result.value.members.find((m) => m.isLead);
  const researcher = result.value.members.find((m) => m.role === "researcher");

  assert(lead !== undefined);
  assert(researcher !== undefined);
  assertEquals(lead.role, "lead");
  assertEquals(researcher.role, "researcher");
  assert(lead.sessionId !== researcher.sessionId);
  manager.stopAllMonitors();
});

Deno.test("createTeam: uses custom idle and lifetime timeouts", async () => {
  resetTestState();
  const deps = createTestDeps();
  const manager = createTeamManager(deps);

  const result = await manager.createTeam(
    createValidDefinition({
      idleTimeoutSeconds: 120,
      maxLifetimeSeconds: 7200,
    }),
    CALLER,
  );

  assert(result.ok);
  assertEquals(result.value.idleTimeoutSeconds, 120);
  assertEquals(result.value.maxLifetimeSeconds, 7200);
  manager.stopAllMonitors();
});

Deno.test("createTeam: applies default timeouts when not specified", async () => {
  resetTestState();
  const deps = createTestDeps();
  const manager = createTeamManager(deps);

  const result = await manager.createTeam(createValidDefinition(), CALLER);

  assert(result.ok);
  assertEquals(result.value.idleTimeoutSeconds, 300);
  assertEquals(result.value.maxLifetimeSeconds, 3600);
  manager.stopAllMonitors();
});

Deno.test("createTeam: persists team to storage", async () => {
  resetTestState();
  const storage = createTestStorage();
  const deps = createTestDeps({ storage });
  const manager = createTeamManager(deps);

  const result = await manager.createTeam(createValidDefinition(), CALLER);
  assert(result.ok);

  const keys = await storage.list("team:");
  assertEquals(keys.length, 1);

  const raw = await storage.get(keys[0]);
  assert(raw !== null);
  const parsed = JSON.parse(raw!);
  assertEquals(parsed.name, "Test Team");
  manager.stopAllMonitors();
});

// ─── Validation tests ────────────────────────────────────────────────────────

Deno.test("createTeam: rejects empty team name", async () => {
  resetTestState();
  const manager = createTeamManager(createTestDeps());

  const result = await manager.createTeam(
    createValidDefinition({ name: "" }),
    CALLER,
  );

  assert(!result.ok);
  assertStringIncludes(result.error, "name must not be empty");
});

Deno.test("createTeam: rejects empty task", async () => {
  resetTestState();
  const manager = createTeamManager(createTestDeps());

  const result = await manager.createTeam(
    createValidDefinition({ task: "" }),
    CALLER,
  );

  assert(!result.ok);
  assertStringIncludes(result.error, "task must not be empty");
});

Deno.test("createTeam: rejects zero members", async () => {
  resetTestState();
  const manager = createTeamManager(createTestDeps());

  const result = await manager.createTeam(
    createValidDefinition({ members: [] }),
    CALLER,
  );

  assert(!result.ok);
  assertStringIncludes(result.error, "at least one member");
});

Deno.test("createTeam: rejects multiple leads", async () => {
  resetTestState();
  const manager = createTeamManager(createTestDeps());

  const result = await manager.createTeam(
    createValidDefinition({
      members: [
        { role: "lead1", description: "First lead", isLead: true },
        { role: "lead2", description: "Second lead", isLead: true },
      ],
    }),
    CALLER,
  );

  assert(!result.ok);
  assertStringIncludes(result.error, "exactly one lead");
});

Deno.test("createTeam: rejects no leads", async () => {
  resetTestState();
  const manager = createTeamManager(createTestDeps());

  const result = await manager.createTeam(
    createValidDefinition({
      members: [
        { role: "worker1", description: "Worker", isLead: false },
        { role: "worker2", description: "Worker", isLead: false },
      ],
    }),
    CALLER,
  );

  assert(!result.ok);
  assertStringIncludes(result.error, "exactly one lead");
});

Deno.test("createTeam: rejects duplicate roles", async () => {
  resetTestState();
  const manager = createTeamManager(createTestDeps());

  const result = await manager.createTeam(
    createValidDefinition({
      members: [
        { role: "researcher", description: "First", isLead: true },
        { role: "researcher", description: "Second", isLead: false },
      ],
    }),
    CALLER,
  );

  assert(!result.ok);
  assertStringIncludes(result.error, "Duplicate");
});

// ─── Status tests ────────────────────────────────────────────────────────────

Deno.test("fetchTeamStatus: returns current team state", async () => {
  resetTestState();
  const deps = createTestDeps();
  const manager = createTeamManager(deps);

  const createResult = await manager.createTeam(createValidDefinition(), CALLER);
  assert(createResult.ok);

  const statusResult = await manager.fetchTeamStatus(createResult.value.id);
  assert(statusResult.ok);
  assertEquals(statusResult.value.name, "Test Team");
  assertEquals(statusResult.value.status, "running");
  manager.stopAllMonitors();
});

Deno.test("fetchTeamStatus: returns error for unknown team", async () => {
  resetTestState();
  const manager = createTeamManager(createTestDeps());

  const result = await manager.fetchTeamStatus("nonexistent" as TeamId);
  assert(!result.ok);
  assertStringIncludes(result.error, "not found");
});

Deno.test("fetchTeamStatus: refreshes member taints", async () => {
  resetTestState();
  const deps = createTestDeps();
  const manager = createTeamManager(deps);

  const createResult = await manager.createTeam(createValidDefinition(), CALLER);
  assert(createResult.ok);

  // Escalate taint for a member
  const leadSession = createResult.value.members.find((m) => m.isLead)!.sessionId;
  sessionTaints.set(leadSession as string, "CONFIDENTIAL");

  const statusResult = await manager.fetchTeamStatus(createResult.value.id);
  assert(statusResult.ok);
  assertEquals(statusResult.value.aggregateTaint, "CONFIDENTIAL");
  manager.stopAllMonitors();
});

// ─── Disband tests ───────────────────────────────────────────────────────────

Deno.test("disbandTeam: creator can disband", async () => {
  resetTestState();
  const deps = createTestDeps();
  const manager = createTeamManager(deps);

  const createResult = await manager.createTeam(createValidDefinition(), CALLER);
  assert(createResult.ok);

  const disbandResult = await manager.disbandTeam(
    createResult.value.id,
    CALLER,
    "Done",
  );

  assert(disbandResult.ok);
  assertEquals(disbandResult.value.status, "disbanded");
});

Deno.test("disbandTeam: terminates all member sessions", async () => {
  resetTestState();
  const deps = createTestDeps();
  const manager = createTeamManager(deps);

  const createResult = await manager.createTeam(createValidDefinition(), CALLER);
  assert(createResult.ok);

  await manager.disbandTeam(createResult.value.id, CALLER);

  for (const member of createResult.value.members) {
    assert(terminatedSessions.has(member.sessionId as string));
  }
});

Deno.test("disbandTeam: rejects unauthorized caller", async () => {
  resetTestState();
  const deps = createTestDeps();
  const manager = createTeamManager(deps);

  const createResult = await manager.createTeam(createValidDefinition(), CALLER);
  assert(createResult.ok);

  const result = await manager.disbandTeam(
    createResult.value.id,
    "unauthorized" as SessionId,
  );

  assert(!result.ok);
  assertStringIncludes(result.error, "denied");
  manager.stopAllMonitors();
});

Deno.test("disbandTeam: rejects already disbanded team", async () => {
  resetTestState();
  const deps = createTestDeps();
  const manager = createTeamManager(deps);

  const createResult = await manager.createTeam(createValidDefinition(), CALLER);
  assert(createResult.ok);

  await manager.disbandTeam(createResult.value.id, CALLER);

  const result = await manager.disbandTeam(createResult.value.id, CALLER);
  assert(!result.ok);
  assertStringIncludes(result.error, "cannot be disbanded");
});

// ─── Message tests ───────────────────────────────────────────────────────────

Deno.test("deliverTeamMessage: sends to specified role", async () => {
  resetTestState();
  let sentTo: SessionId | null = null;
  const deps = createTestDeps({
    sendMessage: (_from, to, _content) => {
      sentTo = to;
      return Promise.resolve({ ok: true as const, value: { delivered: true as const } });
    },
  });
  const manager = createTeamManager(deps);

  const createResult = await manager.createTeam(createValidDefinition(), CALLER);
  assert(createResult.ok);

  const researcher = createResult.value.members.find((m) => m.role === "researcher")!;

  const result = await manager.deliverTeamMessage(
    createResult.value.id,
    CALLER,
    "researcher",
    "Please research X",
  );

  assert(result.ok);
  assertEquals(sentTo, researcher.sessionId);
  manager.stopAllMonitors();
});

Deno.test("deliverTeamMessage: defaults to lead when no role specified", async () => {
  resetTestState();
  let sentTo: SessionId | null = null;
  const deps = createTestDeps({
    sendMessage: (_from, to, _content) => {
      sentTo = to;
      return Promise.resolve({ ok: true as const, value: { delivered: true as const } });
    },
  });
  const manager = createTeamManager(deps);

  const createResult = await manager.createTeam(createValidDefinition(), CALLER);
  assert(createResult.ok);

  const lead = createResult.value.members.find((m) => m.isLead)!;

  const result = await manager.deliverTeamMessage(
    createResult.value.id,
    CALLER,
    "",
    "Status update please",
  );

  assert(result.ok);
  assertEquals(sentTo, lead.sessionId);
  manager.stopAllMonitors();
});

Deno.test("deliverTeamMessage: rejects unknown role", async () => {
  resetTestState();
  const deps = createTestDeps();
  const manager = createTeamManager(deps);

  const createResult = await manager.createTeam(createValidDefinition(), CALLER);
  assert(createResult.ok);

  const result = await manager.deliverTeamMessage(
    createResult.value.id,
    CALLER,
    "nonexistent",
    "Hello",
  );

  assert(!result.ok);
  assertStringIncludes(result.error, "not found");
  manager.stopAllMonitors();
});

// ─── List tests ──────────────────────────────────────────────────────────────

Deno.test("listTeams: returns only teams created by caller", async () => {
  resetTestState();
  const storage = createTestStorage();
  const deps = createTestDeps({ storage });
  const manager = createTeamManager(deps);

  const otherCaller = "other-session" as SessionId;

  await manager.createTeam(createValidDefinition({ name: "Team A" }), CALLER);
  await manager.createTeam(createValidDefinition({ name: "Team B" }), CALLER);
  await manager.createTeam(createValidDefinition({ name: "Team C" }), otherCaller);

  const callerTeams = await manager.listTeams(CALLER);
  assertEquals(callerTeams.length, 2);

  const otherTeams = await manager.listTeams(otherCaller);
  assertEquals(otherTeams.length, 1);
  assertEquals(otherTeams[0].name, "Team C");
  manager.stopAllMonitors();
});
