/**
 * Team manager — lifecycle management for agent teams.
 *
 * Handles creation, disbanding, status queries, idle/lifetime timeouts,
 * and member health monitoring. Composes existing primitives:
 * OrchestratorFactory for session spawning, sessions_send for
 * communication, session taint for classification tracking.
 *
 * @module
 */

import type { ClassificationLevel, Result } from "../../core/types/classification.ts";
import {
  CLASSIFICATION_ORDER,
  maxClassification,
} from "../../core/types/classification.ts";
import type { SessionId } from "../../core/types/session.ts";
import type { StorageProvider } from "../../core/storage/provider.ts";
import { createLogger } from "../../core/logger/logger.ts";
import type {
  SerializedTeamInstance,
  SerializedTeamMember,
  TeamDefinition,
  TeamId,
  TeamInstance,
  TeamMemberDefinition,
  TeamMemberInstance,
} from "./types.ts";
import {
  DEFAULT_IDLE_TIMEOUT_SECONDS,
  DEFAULT_MAX_LIFETIME_SECONDS,
  LIFETIME_GRACE_PERIOD_SECONDS,
  TEAM_STORAGE_PREFIX,
} from "./types.ts";
import { buildTeamRosterPrompt } from "./roster.ts";

const log = createLogger("team-manager");

/** Dependencies injected into the TeamManager. */
export interface TeamManagerDeps {
  /** Storage for persisting team state. */
  readonly storage: StorageProvider;
  /**
   * Spawns an isolated agent session. Returns session ID and a function
   * to send messages to the session. Simplified interface over
   * OrchestratorFactory to avoid direct gateway dependency.
   */
  readonly spawnMemberSession: (options: SpawnMemberOptions) => Promise<SpawnedMember>;
  /**
   * Sends a message from one session to another. Wraps sessions_send
   * with write-down enforcement.
   */
  readonly sendMessage: (
    fromId: SessionId,
    toId: SessionId,
    content: string,
  ) => Promise<Result<{ readonly delivered: true }, string>>;
  /** Retrieves current taint for a session. */
  readonly getSessionTaint: (sessionId: SessionId) => Promise<ClassificationLevel | null>;
  /** Terminates a session. */
  readonly terminateSession: (sessionId: SessionId) => Promise<void>;
  /**
   * Notify the creating session about a lifecycle event.
   * Used for lead failure, all-idle, and lifetime timeout warnings.
   * Optional — lifecycle monitoring is skipped when not provided.
   */
  readonly notifyCreator?: (
    creatorSessionId: SessionId,
    message: string,
  ) => Promise<void>;
}

/** Options for spawning a team member session. */
export interface SpawnMemberOptions {
  readonly role: string;
  readonly description: string;
  readonly teamRosterPrompt: string;
  readonly model?: string;
  readonly classificationCeiling?: ClassificationLevel;
  readonly tools?: TeamMemberDefinition["tools"];
}

/** Result of spawning a member session. */
export interface SpawnedMember {
  readonly sessionId: SessionId;
  readonly model: string;
}

/** The team manager interface. */
export interface TeamManager {
  /** Create a new team from a definition. */
  createTeam(
    definition: TeamDefinition,
    createdBy: SessionId,
  ): Promise<Result<TeamInstance, string>>;

  /** Get the current status of a team. */
  fetchTeamStatus(teamId: TeamId): Promise<Result<TeamInstance, string>>;

  /** Disband an active team. Only lead or creating session can disband. */
  disbandTeam(
    teamId: TeamId,
    callerSessionId: SessionId,
    reason?: string,
  ): Promise<Result<TeamInstance, string>>;

  /** Send a message to a team member from outside the team. */
  deliverTeamMessage(
    teamId: TeamId,
    callerSessionId: SessionId,
    role: string,
    message: string,
  ): Promise<Result<{ readonly delivered: true }, string>>;

  /** List all teams for an agent. */
  listTeams(agentId: string): Promise<readonly TeamInstance[]>;

  /**
   * Start background lifecycle monitoring for a team.
   * Monitors idle timeouts, lifetime timeout, and member health.
   */
  startLifecycleMonitor(teamId: TeamId): void;

  /** Stop lifecycle monitoring for a team. */
  stopLifecycleMonitor(teamId: TeamId): void;

  /** Stop all lifecycle monitors (cleanup on shutdown). */
  stopAllMonitors(): void;
}

// ─── Validation ──────────────────────────────────────────────────────────────

/** Validate a team definition before creation. */
function validateTeamDefinition(
  definition: TeamDefinition,
): Result<true, string> {
  if (!definition.name || definition.name.trim().length === 0) {
    return { ok: false, error: "Team name must not be empty" };
  }

  if (!definition.task || definition.task.trim().length === 0) {
    return { ok: false, error: "Team task must not be empty" };
  }

  if (!definition.members || definition.members.length === 0) {
    return { ok: false, error: "Team must have at least one member" };
  }

  const leads = definition.members.filter((m) => m.isLead);
  if (leads.length !== 1) {
    return {
      ok: false,
      error: `Team must have exactly one lead, found ${leads.length}`,
    };
  }

  const roles = new Set<string>();
  for (const member of definition.members) {
    if (!member.role || member.role.trim().length === 0) {
      return { ok: false, error: "Team member role must not be empty" };
    }
    if (roles.has(member.role)) {
      return { ok: false, error: `Duplicate team member role: ${member.role}` };
    }
    roles.add(member.role);
  }

  return validateMemberCeilings(definition);
}

/** Validate member classification ceilings against team ceiling. */
function validateMemberCeilings(
  definition: TeamDefinition,
): Result<true, string> {
  if (!definition.classificationCeiling) {
    return { ok: true, value: true };
  }

  const teamCeilingOrder = CLASSIFICATION_ORDER[definition.classificationCeiling];

  for (const member of definition.members) {
    if (member.classificationCeiling) {
      const memberCeilingOrder = CLASSIFICATION_ORDER[member.classificationCeiling];
      if (memberCeilingOrder > teamCeilingOrder) {
        return {
          ok: false,
          error:
            `Member "${member.role}" ceiling ${member.classificationCeiling} exceeds team ceiling ${definition.classificationCeiling}`,
        };
      }
    }
  }

  return { ok: true, value: true };
}

// ─── Serialization ───────────────────────────────────────────────────────────

/** Serialize a team instance for storage. */
function serializeTeamInstance(team: TeamInstance): string {
  const serialized: SerializedTeamInstance = {
    id: team.id,
    name: team.name,
    task: team.task,
    members: team.members.map(serializeTeamMember),
    status: team.status,
    aggregateTaint: team.aggregateTaint,
    createdAt: team.createdAt.toISOString(),
    createdBy: team.createdBy as string,
    idleTimeoutSeconds: team.idleTimeoutSeconds,
    maxLifetimeSeconds: team.maxLifetimeSeconds,
    classificationCeiling: team.classificationCeiling,
  };
  return JSON.stringify(serialized);
}

/** Serialize a single team member. */
function serializeTeamMember(member: TeamMemberInstance): SerializedTeamMember {
  return {
    role: member.role,
    description: member.description,
    isLead: member.isLead,
    sessionId: member.sessionId as string,
    model: member.model,
    classificationCeiling: member.classificationCeiling,
    status: member.status,
    currentTaint: member.currentTaint,
    lastActivityAt: member.lastActivityAt.toISOString(),
  };
}

/** Deserialize a team instance from storage. */
function deserializeTeamInstance(json: string): TeamInstance {
  const data: SerializedTeamInstance = JSON.parse(json);
  return {
    id: data.id as TeamId,
    name: data.name,
    task: data.task,
    members: data.members.map(deserializeTeamMember),
    status: data.status,
    aggregateTaint: data.aggregateTaint,
    createdAt: new Date(data.createdAt),
    createdBy: data.createdBy as SessionId,
    idleTimeoutSeconds: data.idleTimeoutSeconds,
    maxLifetimeSeconds: data.maxLifetimeSeconds,
    classificationCeiling: data.classificationCeiling,
  };
}

/** Deserialize a single team member. */
function deserializeTeamMember(data: SerializedTeamMember): TeamMemberInstance {
  return {
    role: data.role,
    description: data.description,
    isLead: data.isLead,
    sessionId: data.sessionId as SessionId,
    model: data.model,
    classificationCeiling: data.classificationCeiling,
    status: data.status,
    currentTaint: data.currentTaint,
    lastActivityAt: new Date(data.lastActivityAt),
  };
}

// ─── Aggregate taint ─────────────────────────────────────────────────────────

/** Compute aggregate taint across all team members. */
function computeAggregateTaint(
  members: readonly TeamMemberInstance[],
): ClassificationLevel {
  let aggregate: ClassificationLevel = "PUBLIC";
  for (const member of members) {
    aggregate = maxClassification(aggregate, member.currentTaint);
  }
  return aggregate;
}

// ─── Storage helpers ─────────────────────────────────────────────────────────

/** Build the storage key for a team. */
function buildStorageKey(teamId: TeamId): string {
  return `${TEAM_STORAGE_PREFIX}${teamId}`;
}

// ─── Member spawning ─────────────────────────────────────────────────────────

/** Spawn all member sessions and build member instances. */
async function spawnAllMembers(
  definition: TeamDefinition,
  deps: TeamManagerDeps,
  placeholderMembers: readonly TeamMemberInstance[],
): Promise<TeamMemberInstance[]> {
  const members: TeamMemberInstance[] = [];
  const now = new Date();

  for (const memberDef of definition.members) {
    const rosterPrompt = buildTeamRosterPrompt({
      teamName: definition.name,
      task: definition.task,
      member: placeholderMembers.find((m) => m.role === memberDef.role)!,
      allMembers: placeholderMembers,
    });

    const spawned = await deps.spawnMemberSession({
      role: memberDef.role,
      description: memberDef.description,
      teamRosterPrompt: rosterPrompt,
      model: memberDef.model,
      classificationCeiling: memberDef.classificationCeiling,
      tools: memberDef.tools,
    });

    members.push({
      role: memberDef.role,
      description: memberDef.description,
      isLead: memberDef.isLead,
      sessionId: spawned.sessionId,
      model: spawned.model,
      classificationCeiling: memberDef.classificationCeiling,
      status: "active",
      currentTaint: "PUBLIC",
      lastActivityAt: now,
    });
  }

  return members;
}

/** Build placeholder member instances before sessions are spawned. */
function buildPlaceholderMembers(
  definition: TeamDefinition,
): TeamMemberInstance[] {
  const now = new Date();
  return definition.members.map((m) => ({
    role: m.role,
    description: m.description,
    isLead: m.isLead,
    sessionId: `pending-${m.role}` as SessionId,
    model: m.model ?? "default",
    classificationCeiling: m.classificationCeiling,
    status: "active" as const,
    currentTaint: "PUBLIC" as const,
    lastActivityAt: now,
  }));
}

// ─── Initial task delivery ───────────────────────────────────────────────────

/** Send initial tasks to team members after creation. */
async function deliverInitialTasks(
  definition: TeamDefinition,
  members: readonly TeamMemberInstance[],
  createdBy: SessionId,
  deps: TeamManagerDeps,
): Promise<void> {
  for (const memberDef of definition.members) {
    const memberInstance = members.find((m) => m.role === memberDef.role);
    if (!memberInstance) continue;

    const taskContent = resolveInitialTask(memberDef, definition.task);
    if (!taskContent) continue;

    const result = await deps.sendMessage(
      createdBy,
      memberInstance.sessionId,
      taskContent,
    );

    if (!result.ok) {
      log.warn("Initial task delivery failed for team member", {
        operation: "deliverInitialTasks",
        role: memberDef.role,
        sessionId: memberInstance.sessionId,
        err: result.error,
      });
    }
  }
}

/** Resolve what initial task to send to a member. */
function resolveInitialTask(
  memberDef: TeamMemberDefinition,
  teamTask: string,
): string | null {
  if (memberDef.initialTask) return memberDef.initialTask;
  if (memberDef.isLead) return teamTask;
  return null;
}

// ─── Taint refresh ───────────────────────────────────────────────────────────

/** Refresh member taint levels from live sessions. */
async function refreshMemberTaints(
  members: readonly TeamMemberInstance[],
  deps: TeamManagerDeps,
): Promise<TeamMemberInstance[]> {
  const updated: TeamMemberInstance[] = [];
  for (const member of members) {
    if (member.status === "completed" || member.status === "failed") {
      updated.push(member);
      continue;
    }
    const taint = await deps.getSessionTaint(member.sessionId);
    updated.push(taint !== null ? { ...member, currentTaint: taint } : member);
  }
  return updated;
}

// ─── Find member helpers ─────────────────────────────────────────────────────

/** Find the lead member in a team. */
function findLeadMember(
  team: TeamInstance,
): TeamMemberInstance | undefined {
  return team.members.find((m) => m.isLead);
}

/** Find a member by role. */
function findMemberByRole(
  team: TeamInstance,
  role: string,
): TeamMemberInstance | undefined {
  return team.members.find((m) => m.role === role);
}

// ─── Lifecycle monitoring ──────────────────────────────────────────────────────

/** Check interval for lifecycle monitoring (30 seconds). */
const LIFECYCLE_CHECK_INTERVAL_MS = 30_000;

/** State tracked per team for lifecycle monitoring. */
interface MonitorState {
  readonly intervalId: number;
  nudgedMembers: Set<string>;
  lifetimeWarned: boolean;
}

/** Check if a member has been idle too long and handle accordingly. */
async function checkMemberIdle(
  team: TeamInstance,
  member: TeamMemberInstance,
  nudgedMembers: Set<string>,
  deps: TeamManagerDeps,
): Promise<TeamMemberInstance> {
  if (member.status !== "active" && member.status !== "idle") return member;

  const idleMs = Date.now() - member.lastActivityAt.getTime();
  const idleThresholdMs = team.idleTimeoutSeconds * 1_000;

  if (idleMs < idleThresholdMs) {
    nudgedMembers.delete(member.role);
    return member;
  }

  if (!nudgedMembers.has(member.role)) {
    nudgedMembers.add(member.role);
    log.info("Nudging idle team member", {
      operation: "checkMemberIdle",
      teamId: team.id,
      role: member.role,
      idleSeconds: Math.floor(idleMs / 1_000),
    });
    const lead = team.members.find((m) => m.isLead);
    const nudgeTarget = member.isLead ? "the lead" : lead?.role ?? "another teammate";
    await deps.sendMessage(
      team.createdBy,
      member.sessionId,
      `You have been idle for ${Math.floor(idleMs / 1_000)} seconds. ` +
      `If your work is complete, send your results to ${nudgeTarget}.`,
    );
    return member;
  }

  if (idleMs >= idleThresholdMs * 2) {
    log.info("Terminating idle team member", {
      operation: "checkMemberIdle",
      teamId: team.id,
      role: member.role,
    });
    await deps.terminateSession(member.sessionId);
    const lead = team.members.find((m) => m.isLead);
    if (lead && lead.sessionId !== member.sessionId) {
      await deps.sendMessage(
        team.createdBy,
        lead.sessionId,
        `Team member "${member.role}" has been terminated due to inactivity.`,
      );
    }
    return { ...member, status: "completed" };
  }

  return member;
}

/** Check team lifetime and handle timeout. */
async function checkLifetimeTimeout(
  team: TeamInstance,
  monitorState: MonitorState,
  deps: TeamManagerDeps,
): Promise<boolean> {
  const elapsedMs = Date.now() - team.createdAt.getTime();
  const lifetimeMs = team.maxLifetimeSeconds * 1_000;
  const graceMs = LIFETIME_GRACE_PERIOD_SECONDS * 1_000;

  if (elapsedMs < lifetimeMs) return false;

  if (!monitorState.lifetimeWarned) {
    monitorState.lifetimeWarned = true;
    const lead = team.members.find((m) => m.isLead);
    if (lead && (lead.status === "active" || lead.status === "idle")) {
      log.info("Team lifetime limit reached, warning lead", {
        operation: "checkLifetimeTimeout",
        teamId: team.id,
      });
      await deps.sendMessage(
        team.createdBy,
        lead.sessionId,
        "Team lifetime limit reached. Wrapping up — you have " +
        `${LIFETIME_GRACE_PERIOD_SECONDS} seconds to produce a final output.`,
      );
    }
    return false;
  }

  if (elapsedMs >= lifetimeMs + graceMs) {
    log.info("Team lifetime grace period expired, auto-disbanding", {
      operation: "checkLifetimeTimeout",
      teamId: team.id,
    });
    return true;
  }

  return false;
}

/** Detect lead failure (session taint returns null = session gone). */
async function checkLeadHealth(
  team: TeamInstance,
  deps: TeamManagerDeps,
): Promise<boolean> {
  const lead = team.members.find((m) => m.isLead);
  if (!lead || lead.status !== "active") return false;

  const taint = await deps.getSessionTaint(lead.sessionId);
  if (taint !== null) return false;

  log.warn("Lead session failure detected", {
    operation: "checkLeadHealth",
    teamId: team.id,
    leadSessionId: lead.sessionId,
  });

  if (deps.notifyCreator) {
    await deps.notifyCreator(
      team.createdBy,
      `Team "${team.name}" lead has failed. Team is paused. ` +
      `Use team_disband to clean up or team_message to redirect work.`,
    );
  }

  return true;
}

/** Detect member failure and notify the lead. */
async function checkMemberHealth(
  team: TeamInstance,
  member: TeamMemberInstance,
  deps: TeamManagerDeps,
): Promise<TeamMemberInstance> {
  if (member.status !== "active" && member.status !== "idle") return member;
  if (member.isLead) return member;

  const taint = await deps.getSessionTaint(member.sessionId);
  if (taint !== null) return member;

  log.warn("Team member session failure detected", {
    operation: "checkMemberHealth",
    teamId: team.id,
    role: member.role,
    sessionId: member.sessionId,
  });

  const lead = team.members.find((m) => m.isLead);
  if (lead && (lead.status === "active" || lead.status === "idle")) {
    await deps.sendMessage(
      team.createdBy,
      lead.sessionId,
      `Team member "${member.role}" has failed. ` +
      `Continue with remaining members or disband the team.`,
    );
  }

  return { ...member, status: "failed" };
}

// ─── Manager factory ─────────────────────────────────────────────────────────

/**
 * Create a TeamManager instance.
 *
 * The manager composes existing primitives (session spawning, messaging,
 * taint tracking) and adds team-specific lifecycle coordination.
 */
export function createTeamManager(deps: TeamManagerDeps): TeamManager {
  const monitors = new Map<string, MonitorState>();

  /** Run one lifecycle check tick for a team. */
  async function runLifecycleTick(
    teamId: TeamId,
    monitorState: MonitorState,
  ): Promise<void> {
    const raw = await deps.storage.get(buildStorageKey(teamId));
    if (!raw) {
      stopMonitor(teamId);
      return;
    }

    const team = deserializeTeamInstance(raw);
    if (team.status !== "running") {
      stopMonitor(teamId);
      return;
    }

    const shouldDisband = await checkLifetimeTimeout(
      team,
      monitorState,
      deps,
    );
    if (shouldDisband) {
      stopMonitor(teamId);
      await manager.disbandTeam(teamId, team.createdBy, "Lifetime limit reached");
      return;
    }

    const leadFailed = await checkLeadHealth(team, deps);
    if (leadFailed) {
      const pausedMembers = team.members.map((m) =>
        m.isLead ? { ...m, status: "failed" as const } : m
      );
      const paused: TeamInstance = { ...team, status: "paused", members: pausedMembers };
      await deps.storage.set(buildStorageKey(teamId), serializeTeamInstance(paused));
      stopMonitor(teamId);
      return;
    }

    let membersChanged = false;
    const updatedMembers: TeamMemberInstance[] = [];
    for (const member of team.members) {
      let updated = await checkMemberHealth(team, member, deps);
      updated = await checkMemberIdle(
        team,
        updated,
        monitorState.nudgedMembers,
        deps,
      );
      if (updated !== member) membersChanged = true;
      updatedMembers.push(updated);
    }

    if (membersChanged) {
      const updated: TeamInstance = {
        ...team,
        members: updatedMembers,
        aggregateTaint: computeAggregateTaint(updatedMembers),
      };
      await deps.storage.set(buildStorageKey(teamId), serializeTeamInstance(updated));

      const allIdle = updatedMembers
        .filter((m) => m.status === "active" || m.status === "idle")
        .length === 0;
      if (allIdle && deps.notifyCreator) {
        await deps.notifyCreator(
          team.createdBy,
          `All members of team "${team.name}" are inactive. ` +
          `Use team_message to inject new instructions or team_disband to clean up.`,
        );
        stopMonitor(teamId);
      }
    }
  }

  /** Stop a single monitor. */
  function stopMonitor(teamId: TeamId): void {
    const state = monitors.get(teamId as string);
    if (state) {
      clearInterval(state.intervalId);
      monitors.delete(teamId as string);
      log.info("Lifecycle monitor stopped", {
        operation: "stopLifecycleMonitor",
        teamId,
      });
    }
  }

  const manager: TeamManager = {
    async createTeam(
      definition: TeamDefinition,
      createdBy: SessionId,
    ): Promise<Result<TeamInstance, string>> {
      const validation = validateTeamDefinition(definition);
      if (!validation.ok) return validation;

      log.info("Team creation started", {
        operation: "createTeam",
        teamName: definition.name,
        memberCount: definition.members.length,
        createdBy,
      });

      const placeholders = buildPlaceholderMembers(definition);

      let members: TeamMemberInstance[];
      try {
        members = await spawnAllMembers(definition, deps, placeholders);
      } catch (err: unknown) {
        log.error("Team member spawning failed", {
          operation: "createTeam",
          teamName: definition.name,
          err,
        });
        return {
          ok: false,
          error: `Team member spawning failed: ${err instanceof Error ? err.message : String(err)}`,
        };
      }

      const teamId = crypto.randomUUID() as TeamId;
      const now = new Date();

      const team: TeamInstance = {
        id: teamId,
        name: definition.name,
        task: definition.task,
        members,
        status: "running",
        aggregateTaint: computeAggregateTaint(members),
        createdAt: now,
        createdBy,
        idleTimeoutSeconds: definition.idleTimeoutSeconds ?? DEFAULT_IDLE_TIMEOUT_SECONDS,
        maxLifetimeSeconds: definition.maxLifetimeSeconds ?? DEFAULT_MAX_LIFETIME_SECONDS,
        classificationCeiling: definition.classificationCeiling,
      };

      await deps.storage.set(buildStorageKey(teamId), serializeTeamInstance(team));

      await deliverInitialTasks(definition, members, createdBy, deps);

      log.info("Team created", {
        operation: "createTeam",
        teamId,
        teamName: definition.name,
        memberRoles: members.map((m) => m.role),
      });

      if (deps.notifyCreator) {
        manager.startLifecycleMonitor(teamId);
      }

      return { ok: true, value: team };
    },

    async fetchTeamStatus(
      teamId: TeamId,
    ): Promise<Result<TeamInstance, string>> {
      const raw = await deps.storage.get(buildStorageKey(teamId));
      if (!raw) {
        return { ok: false, error: `Team not found: ${teamId}` };
      }

      const team = deserializeTeamInstance(raw);

      if (team.status !== "running" && team.status !== "paused") {
        return { ok: true, value: team };
      }

      const updatedMembers = await refreshMemberTaints(team.members, deps);
      const aggregateTaint = computeAggregateTaint(updatedMembers);

      const updated: TeamInstance = {
        ...team,
        members: updatedMembers,
        aggregateTaint,
      };

      await deps.storage.set(buildStorageKey(teamId), serializeTeamInstance(updated));

      return { ok: true, value: updated };
    },

    async disbandTeam(
      teamId: TeamId,
      callerSessionId: SessionId,
      reason?: string,
    ): Promise<Result<TeamInstance, string>> {
      const raw = await deps.storage.get(buildStorageKey(teamId));
      if (!raw) {
        return { ok: false, error: `Team not found: ${teamId}` };
      }

      const team = deserializeTeamInstance(raw);

      if (team.status !== "running" && team.status !== "paused") {
        return {
          ok: false,
          error: `Team cannot be disbanded in status: ${team.status}`,
        };
      }

      const isCreator = callerSessionId === team.createdBy;
      const lead = findLeadMember(team);
      const isLead = lead !== undefined && callerSessionId === lead.sessionId;

      if (!isCreator && !isLead) {
        log.warn("Unauthorized disband attempt", {
          operation: "disbandTeam",
          teamId,
          callerSessionId,
          createdBy: team.createdBy,
        });
        return {
          ok: false,
          error: "Team disband denied: only the lead or creating session can disband",
        };
      }

      log.info("Team disbanding", {
        operation: "disbandTeam",
        teamId,
        teamName: team.name,
        reason,
        disbandedBy: callerSessionId,
      });

      for (const member of team.members) {
        if (member.status === "active" || member.status === "idle") {
          await deps.terminateSession(member.sessionId);
        }
      }

      const updatedMembers = await refreshMemberTaints(team.members, deps);
      const finalTaint = computeAggregateTaint(updatedMembers);

      const disbanded: TeamInstance = {
        ...team,
        members: updatedMembers.map((m) => ({
          ...m,
          status: m.status === "active" || m.status === "idle" ? "completed" as const : m.status,
        })),
        status: "disbanded",
        aggregateTaint: finalTaint,
      };

      await deps.storage.set(
        buildStorageKey(teamId),
        serializeTeamInstance(disbanded),
      );

      manager.stopLifecycleMonitor(teamId);

      log.info("Team disbanded", {
        operation: "disbandTeam",
        teamId,
        teamName: team.name,
        finalTaint,
      });

      return { ok: true, value: disbanded };
    },

    async deliverTeamMessage(
      teamId: TeamId,
      callerSessionId: SessionId,
      role: string,
      message: string,
    ): Promise<Result<{ readonly delivered: true }, string>> {
      const raw = await deps.storage.get(buildStorageKey(teamId));
      if (!raw) {
        return { ok: false, error: `Team not found: ${teamId}` };
      }

      const team = deserializeTeamInstance(raw);

      if (team.status !== "running") {
        return {
          ok: false,
          error: `Team message delivery denied: team status is ${team.status}`,
        };
      }

      const target = role
        ? findMemberByRole(team, role)
        : findLeadMember(team);

      if (!target) {
        return {
          ok: false,
          error: `Team member not found: ${role || "lead"}`,
        };
      }

      if (target.status !== "active" && target.status !== "idle") {
        return {
          ok: false,
          error: `Team member "${target.role}" is not active (status: ${target.status})`,
        };
      }

      return deps.sendMessage(callerSessionId, target.sessionId, message);
    },

    async listTeams(agentId: string): Promise<readonly TeamInstance[]> {
      const prefix = `${TEAM_STORAGE_PREFIX}`;
      const keys = await deps.storage.list(prefix);
      const teams: TeamInstance[] = [];

      for (const key of keys) {
        const raw = await deps.storage.get(key);
        if (!raw) continue;

        try {
          const team = deserializeTeamInstance(raw);
          // Filter by agent context — for now return all teams
          // since teams are stored globally
          teams.push(team);
        } catch (err: unknown) {
          log.warn("Team deserialization failed", {
            operation: "listTeams",
            agentId,
            key,
            err,
          });
        }
      }

      return teams;
    },

    startLifecycleMonitor(teamId: TeamId): void {
      if (monitors.has(teamId as string)) return;

      const monitorState: MonitorState = {
        intervalId: setInterval(
          () => {
            runLifecycleTick(teamId, monitorState).catch((err) => {
              log.error("Lifecycle tick failed", {
                operation: "startLifecycleMonitor",
                teamId,
                err,
              });
            });
          },
          LIFECYCLE_CHECK_INTERVAL_MS,
        ),
        nudgedMembers: new Set(),
        lifetimeWarned: false,
      };

      monitors.set(teamId as string, monitorState);
      log.info("Lifecycle monitor started", {
        operation: "startLifecycleMonitor",
        teamId,
      });
    },

    stopLifecycleMonitor(teamId: TeamId): void {
      stopMonitor(teamId);
    },

    stopAllMonitors(): void {
      for (const [id] of monitors) {
        stopMonitor(id as TeamId);
      }
    },
  };

  return manager;
}
