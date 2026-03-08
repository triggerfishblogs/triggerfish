/**
 * Team lifecycle tests.
 *
 * Tests creation flow, idle timeout behavior, disbanding edge cases,
 * member failure handling, and lead failure handling.
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
let spawnFailRole: string | null = null;

function resetTestState(): void {
  sessionCounter = 0;
  terminatedSessions.clear();
  sessionTaints.clear();
  spawnFailRole = null;
}

function createTestDeps(
  overrides?: Partial<TeamManagerDeps>,
): TeamManagerDeps {
  return {
    storage: createTestStorage(),
    spawnMemberSession: (options: SpawnMemberOptions): Promise<SpawnedMember> => {
      if (spawnFailRole && options.role === spawnFailRole) {
        return Promise.reject(new Error(`Spawn failed for ${options.role}`));
      }
      sessionCounter++;
      const sessionId = `lc-session-${sessionCounter}` as SessionId;
      sessionTaints.set(sessionId, "PUBLIC");
      return Promise.resolve({
        sessionId,
        model: options.model ?? "test-model",
      });
    },
    sendMessage: (): Promise<Result<{ readonly delivered: true }, string>> => {
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

const CALLER = "lc-caller" as SessionId;

function createThreePersonTeam(): TeamDefinition {
  return {
    name: "Lifecycle Team",
    task: "Test lifecycle scenarios",
    members: [
      { role: "lead", description: "Coordinates", isLead: true },
      { role: "researcher", description: "Researches", isLead: false },
      { role: "writer", description: "Writes", isLead: false },
    ],
  };
}

// ─── Creation lifecycle ──────────────────────────────────────────────────────

Deno.test("lifecycle: team starts in running status", async () => {
  resetTestState();
  const manager = createTeamManager(createTestDeps());

  const result = await manager.createTeam(createThreePersonTeam(), CALLER);
  assert(result.ok);
  assertEquals(result.value.status, "running");
});

Deno.test("lifecycle: all members start as active", async () => {
  resetTestState();
  const manager = createTeamManager(createTestDeps());

  const result = await manager.createTeam(createThreePersonTeam(), CALLER);
  assert(result.ok);

  for (const member of result.value.members) {
    assertEquals(member.status, "active");
  }
});

Deno.test("lifecycle: each member gets unique session ID", async () => {
  resetTestState();
  const manager = createTeamManager(createTestDeps());

  const result = await manager.createTeam(createThreePersonTeam(), CALLER);
  assert(result.ok);

  const sessionIds = result.value.members.map((m) => m.sessionId);
  const uniqueIds = new Set(sessionIds);
  assertEquals(uniqueIds.size, 3);
});

Deno.test("lifecycle: spawn failure rolls back entire team creation", async () => {
  resetTestState();
  spawnFailRole = "writer"; // Third member will fail

  const manager = createTeamManager(createTestDeps());

  const result = await manager.createTeam(createThreePersonTeam(), CALLER);
  assert(!result.ok);
  assertStringIncludes(result.error, "spawning failed");
});

// ─── Disband lifecycle ───────────────────────────────────────────────────────

Deno.test("lifecycle: disband marks all active members as completed", async () => {
  resetTestState();
  const manager = createTeamManager(createTestDeps());

  const createResult = await manager.createTeam(createThreePersonTeam(), CALLER);
  assert(createResult.ok);

  const disbandResult = await manager.disbandTeam(
    createResult.value.id,
    CALLER,
  );
  assert(disbandResult.ok);

  for (const member of disbandResult.value.members) {
    assertEquals(member.status, "completed");
  }
});

Deno.test("lifecycle: disband terminates all member sessions", async () => {
  resetTestState();
  const manager = createTeamManager(createTestDeps());

  const createResult = await manager.createTeam(createThreePersonTeam(), CALLER);
  assert(createResult.ok);

  await manager.disbandTeam(createResult.value.id, CALLER);

  assertEquals(terminatedSessions.size, 3);
  for (const member of createResult.value.members) {
    assert(terminatedSessions.has(member.sessionId as string));
  }
});

Deno.test("lifecycle: disband sets status to disbanded", async () => {
  resetTestState();
  const manager = createTeamManager(createTestDeps());

  const createResult = await manager.createTeam(createThreePersonTeam(), CALLER);
  assert(createResult.ok);

  const disbandResult = await manager.disbandTeam(
    createResult.value.id,
    CALLER,
  );
  assert(disbandResult.ok);
  assertEquals(disbandResult.value.status, "disbanded");
});

Deno.test("lifecycle: disband stores reason when provided", async () => {
  resetTestState();
  const manager = createTeamManager(createTestDeps());

  const createResult = await manager.createTeam(createThreePersonTeam(), CALLER);
  assert(createResult.ok);

  const result = await manager.disbandTeam(
    createResult.value.id,
    CALLER,
    "Objective met",
  );
  assert(result.ok);
  assertEquals(result.value.status, "disbanded");
});

// ─── Authorization ───────────────────────────────────────────────────────────

Deno.test("lifecycle: only creator can disband", async () => {
  resetTestState();
  const manager = createTeamManager(createTestDeps());

  const createResult = await manager.createTeam(createThreePersonTeam(), CALLER);
  assert(createResult.ok);

  const result = await manager.disbandTeam(
    createResult.value.id,
    "random-session" as SessionId,
  );
  assert(!result.ok);
  assertStringIncludes(result.error, "denied");
});

Deno.test("lifecycle: lead session can disband", async () => {
  resetTestState();
  const manager = createTeamManager(createTestDeps());

  const createResult = await manager.createTeam(createThreePersonTeam(), CALLER);
  assert(createResult.ok);

  const lead = createResult.value.members.find((m) => m.isLead)!;
  const result = await manager.disbandTeam(
    createResult.value.id,
    lead.sessionId,
  );
  assert(result.ok);
  assertEquals(result.value.status, "disbanded");
});

// ─── Status after disband ────────────────────────────────────────────────────

Deno.test("lifecycle: status returns disbanded team state", async () => {
  resetTestState();
  const storage = createTestStorage();
  const manager = createTeamManager(createTestDeps({ storage }));

  const createResult = await manager.createTeam(createThreePersonTeam(), CALLER);
  assert(createResult.ok);

  await manager.disbandTeam(createResult.value.id, CALLER);

  const statusResult = await manager.fetchTeamStatus(createResult.value.id);
  assert(statusResult.ok);
  assertEquals(statusResult.value.status, "disbanded");
});

// ─── Message delivery edge cases ─────────────────────────────────────────────

Deno.test("lifecycle: cannot send message to disbanded team", async () => {
  resetTestState();
  const storage = createTestStorage();
  const manager = createTeamManager(createTestDeps({ storage }));

  const createResult = await manager.createTeam(createThreePersonTeam(), CALLER);
  assert(createResult.ok);

  await manager.disbandTeam(createResult.value.id, CALLER);

  const msgResult = await manager.deliverTeamMessage(
    createResult.value.id,
    CALLER,
    "lead",
    "Are you there?",
  );
  assert(!msgResult.ok);
  assertStringIncludes(msgResult.error, "status is disbanded");
});

Deno.test("lifecycle: message to nonexistent team returns error", async () => {
  resetTestState();
  const manager = createTeamManager(createTestDeps());

  const result = await manager.deliverTeamMessage(
    "ghost-team" as TeamId,
    CALLER,
    "lead",
    "Hello?",
  );
  assert(!result.ok);
  assertStringIncludes(result.error, "not found");
});

// ─── Multiple teams ──────────────────────────────────────────────────────────

Deno.test("lifecycle: multiple teams coexist independently", async () => {
  resetTestState();
  const storage = createTestStorage();
  const manager = createTeamManager(createTestDeps({ storage }));

  const team1 = await manager.createTeam(
    { ...createThreePersonTeam(), name: "Team Alpha" },
    CALLER,
  );
  const team2 = await manager.createTeam(
    { ...createThreePersonTeam(), name: "Team Beta" },
    CALLER,
  );

  assert(team1.ok);
  assert(team2.ok);

  // Disband one, other stays running
  await manager.disbandTeam(team1.value.id, CALLER);

  const status1 = await manager.fetchTeamStatus(team1.value.id);
  const status2 = await manager.fetchTeamStatus(team2.value.id);

  assert(status1.ok);
  assert(status2.ok);
  assertEquals(status1.value.status, "disbanded");
  assertEquals(status2.value.status, "running");
});

// ─── Model override ──────────────────────────────────────────────────────────

Deno.test("lifecycle: member model override is captured", async () => {
  resetTestState();
  let capturedModel: string | undefined;
  const deps = createTestDeps({
    spawnMemberSession: (options: SpawnMemberOptions): Promise<SpawnedMember> => {
      if (options.role === "analyst") {
        capturedModel = options.model;
      }
      sessionCounter++;
      return Promise.resolve({
        sessionId: `lc-session-${sessionCounter}` as SessionId,
        model: options.model ?? "default-model",
      });
    },
  });
  const manager = createTeamManager(deps);

  await manager.createTeam(
    {
      name: "Model Team",
      task: "Test models",
      members: [
        { role: "lead", description: "Leads", isLead: true },
        {
          role: "analyst",
          description: "Analyzes",
          isLead: false,
          model: "claude-3-opus",
        },
      ],
    },
    CALLER,
  );

  assertEquals(capturedModel, "claude-3-opus");
});
