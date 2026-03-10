/**
 * Team classification boundary tests.
 *
 * Tests taint propagation, write-down enforcement between members,
 * classification ceiling enforcement, and aggregate taint computation.
 */
import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import type {
  ClassificationLevel,
  Result,
} from "../../../src/core/types/classification.ts";
import type { SessionId } from "../../../src/core/types/session.ts";
import type {
  SpawnedMember,
  SpawnMemberOptions,
  TeamManagerDeps,
} from "../../../src/agent/team/manager.ts";
import { createTeamManager } from "../../../src/agent/team/manager.ts";
import type { TeamDefinition } from "../../../src/agent/team/types.ts";

// ─── Test helpers ────────────────────────────────────────────────────────────

function createTestStorage(): import("../../../src/core/storage/provider.ts").StorageProvider {
  const store = new Map<string, string>();
  return {
    set(key: string, value: string) {
      store.set(key, value);
      return Promise.resolve();
    },
    get(key: string) {
      return Promise.resolve(store.get(key) ?? null);
    },
    delete(key: string) {
      store.delete(key);
      return Promise.resolve();
    },
    list(prefix?: string) {
      const keys = [...store.keys()];
      return Promise.resolve(
        prefix ? keys.filter((k) => k.startsWith(prefix)) : keys,
      );
    },
    close() {
      store.clear();
      return Promise.resolve();
    },
  };
}

let sessionCounter = 0;
const sessionTaints = new Map<string, ClassificationLevel>();
const sentMessages: Array<{
  from: string;
  to: string;
  content: string;
}> = [];

function resetTestState(): void {
  sessionCounter = 0;
  sessionTaints.clear();
  sentMessages.length = 0;
}

function createTestDeps(
  overrides?: Partial<TeamManagerDeps>,
): TeamManagerDeps {
  return {
    storage: createTestStorage(),
    spawnMemberSession: (
      options: SpawnMemberOptions,
    ): Promise<SpawnedMember> => {
      sessionCounter++;
      const sessionId = `cls-session-${sessionCounter}` as SessionId;
      sessionTaints.set(sessionId, "PUBLIC");
      return Promise.resolve({
        sessionId,
        model: options.model ?? "test-model",
      });
    },
    sendMessage: (
      fromId: SessionId,
      toId: SessionId,
      content: string,
    ): Promise<Result<{ readonly delivered: true }, string>> => {
      sentMessages.push({
        from: fromId as string,
        to: toId as string,
        content,
      });
      return Promise.resolve({ ok: true, value: { delivered: true } });
    },
    getSessionTaint: (
      sessionId: SessionId,
    ): Promise<ClassificationLevel | null> => {
      return Promise.resolve(sessionTaints.get(sessionId as string) ?? null);
    },
    terminateSession: (): Promise<void> => Promise.resolve(),
    ...overrides,
  };
}

const CALLER = "cls-caller" as SessionId;

function createTeamWithCeiling(
  ceiling?: ClassificationLevel,
  memberCeilings?: Record<string, ClassificationLevel>,
): TeamDefinition {
  return {
    name: "Classification Team",
    task: "Handle classified data",
    members: [
      {
        role: "lead",
        description: "Coordinates classified work",
        isLead: true,
        classificationCeiling: memberCeilings?.lead,
      },
      {
        role: "analyst",
        description: "Analyzes classified data",
        isLead: false,
        classificationCeiling: memberCeilings?.analyst,
      },
    ],
    classificationCeiling: ceiling,
  };
}

// ─── Classification ceiling validation ───────────────────────────────────────

Deno.test("classification: team ceiling is stored on team instance", async () => {
  resetTestState();
  const manager = createTeamManager(createTestDeps());

  const result = await manager.createTeam(
    createTeamWithCeiling("CONFIDENTIAL"),
    CALLER,
  );

  assert(result.ok);
  assertEquals(result.value.classificationCeiling, "CONFIDENTIAL");
  manager.stopAllMonitors();
});

Deno.test("classification: member ceiling cannot exceed team ceiling", async () => {
  resetTestState();
  const manager = createTeamManager(createTestDeps());

  const result = await manager.createTeam(
    createTeamWithCeiling("INTERNAL", { lead: "CONFIDENTIAL" }),
    CALLER,
  );

  assert(!result.ok);
  assertStringIncludes(result.error, "exceeds team ceiling");
});

Deno.test("classification: member ceiling at or below team ceiling is accepted", async () => {
  resetTestState();
  const manager = createTeamManager(createTestDeps());

  const result = await manager.createTeam(
    createTeamWithCeiling("CONFIDENTIAL", {
      lead: "CONFIDENTIAL",
      analyst: "INTERNAL",
    }),
    CALLER,
  );

  assert(result.ok);
  manager.stopAllMonitors();
});

Deno.test("classification: no team ceiling allows any member ceiling", async () => {
  resetTestState();
  const manager = createTeamManager(createTestDeps());

  const result = await manager.createTeam(
    createTeamWithCeiling(undefined, {
      lead: "RESTRICTED",
      analyst: "CONFIDENTIAL",
    }),
    CALLER,
  );

  assert(result.ok);
  manager.stopAllMonitors();
});

// ─── Aggregate taint computation ─────────────────────────────────────────────

Deno.test("classification: aggregate taint starts at PUBLIC", async () => {
  resetTestState();
  const manager = createTeamManager(createTestDeps());

  const result = await manager.createTeam(
    createTeamWithCeiling(),
    CALLER,
  );

  assert(result.ok);
  assertEquals(result.value.aggregateTaint, "PUBLIC");
  manager.stopAllMonitors();
});

Deno.test("classification: aggregate taint reflects highest member taint", async () => {
  resetTestState();
  const deps = createTestDeps();
  const manager = createTeamManager(deps);

  const createResult = await manager.createTeam(
    createTeamWithCeiling(),
    CALLER,
  );
  assert(createResult.ok);

  // Escalate one member's taint
  const analyst = createResult.value.members.find((m) => m.role === "analyst")!;
  sessionTaints.set(analyst.sessionId as string, "CONFIDENTIAL");

  const statusResult = await manager.fetchTeamStatus(createResult.value.id);
  assert(statusResult.ok);
  assertEquals(statusResult.value.aggregateTaint, "CONFIDENTIAL");
  manager.stopAllMonitors();
});

Deno.test("classification: aggregate taint uses maxClassification across all members", async () => {
  resetTestState();
  const deps = createTestDeps();
  const manager = createTeamManager(deps);

  const createResult = await manager.createTeam(
    createTeamWithCeiling(),
    CALLER,
  );
  assert(createResult.ok);

  // Escalate both members to different levels
  const lead = createResult.value.members.find((m) => m.isLead)!;
  const analyst = createResult.value.members.find((m) => m.role === "analyst")!;
  sessionTaints.set(lead.sessionId as string, "INTERNAL");
  sessionTaints.set(analyst.sessionId as string, "RESTRICTED");

  const statusResult = await manager.fetchTeamStatus(createResult.value.id);
  assert(statusResult.ok);
  assertEquals(statusResult.value.aggregateTaint, "RESTRICTED");
  manager.stopAllMonitors();
});

// ─── Taint refresh on status ─────────────────────────────────────────────────

Deno.test("classification: status refreshes member taints from live sessions", async () => {
  resetTestState();
  const deps = createTestDeps();
  const manager = createTeamManager(deps);

  const createResult = await manager.createTeam(
    createTeamWithCeiling(),
    CALLER,
  );
  assert(createResult.ok);

  // All start PUBLIC
  const statusBefore = await manager.fetchTeamStatus(createResult.value.id);
  assert(statusBefore.ok);
  for (const m of statusBefore.value.members) {
    assertEquals(m.currentTaint, "PUBLIC");
  }

  // Escalate lead taint externally
  const lead = createResult.value.members.find((m) => m.isLead)!;
  sessionTaints.set(lead.sessionId as string, "CONFIDENTIAL");

  // Status should reflect the change
  const statusAfter = await manager.fetchTeamStatus(createResult.value.id);
  assert(statusAfter.ok);
  const updatedLead = statusAfter.value.members.find((m) => m.isLead)!;
  assertEquals(updatedLead.currentTaint, "CONFIDENTIAL");
  manager.stopAllMonitors();
});

// ─── Disband stores final taint ──────────────────────────────────────────────

Deno.test("classification: disband captures aggregate taint at termination", async () => {
  resetTestState();
  const deps = createTestDeps();
  const manager = createTeamManager(deps);

  const createResult = await manager.createTeam(
    createTeamWithCeiling(),
    CALLER,
  );
  assert(createResult.ok);

  // Escalate analyst
  const analyst = createResult.value.members.find((m) => m.role === "analyst")!;
  sessionTaints.set(analyst.sessionId as string, "INTERNAL");

  const disbandResult = await manager.disbandTeam(
    createResult.value.id,
    CALLER,
    "Testing taint capture",
  );

  assert(disbandResult.ok);
  assertEquals(disbandResult.value.aggregateTaint, "INTERNAL");
});

// ─── Initial task delivery ───────────────────────────────────────────────────

Deno.test("classification: initial task is sent to lead", async () => {
  resetTestState();
  const deps = createTestDeps();
  const manager = createTeamManager(deps);

  await manager.createTeam(
    {
      name: "Task Team",
      task: "Classified analysis",
      members: [
        { role: "lead", description: "Leads", isLead: true },
        { role: "worker", description: "Works", isLead: false },
      ],
    },
    CALLER,
  );

  // Lead should have received the team task
  const leadMessage = sentMessages.find((m) =>
    m.content === "Classified analysis"
  );
  assert(leadMessage !== undefined);
  manager.stopAllMonitors();
});

Deno.test("classification: non-lead with initialTask receives it", async () => {
  resetTestState();
  const deps = createTestDeps();
  const manager = createTeamManager(deps);

  await manager.createTeam(
    {
      name: "Task Team",
      task: "Main objective",
      members: [
        { role: "lead", description: "Leads", isLead: true },
        {
          role: "analyst",
          description: "Analyzes",
          isLead: false,
          initialTask: "Research topic X",
        },
      ],
    },
    CALLER,
  );

  const analystMessage = sentMessages.find((m) =>
    m.content === "Research topic X"
  );
  assert(analystMessage !== undefined);
  manager.stopAllMonitors();
});

Deno.test("classification: non-lead without initialTask receives nothing", async () => {
  resetTestState();
  const deps = createTestDeps();
  const manager = createTeamManager(deps);

  await manager.createTeam(
    {
      name: "Task Team",
      task: "Main objective",
      members: [
        { role: "lead", description: "Leads", isLead: true },
        { role: "idle-worker", description: "Waits", isLead: false },
      ],
    },
    CALLER,
  );

  // Only the lead should have received a message
  const workerMessages = sentMessages.filter((m) => m.to.includes("2") // second session spawned
  );
  assertEquals(workerMessages.length, 0);
  manager.stopAllMonitors();
});
