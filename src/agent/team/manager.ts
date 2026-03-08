/**
 * Team manager — lifecycle management for agent teams.
 *
 * Composes validation, serialization, spawning, and lifecycle monitoring
 * into the TeamManager interface used by team tool executors.
 *
 * @module
 */

import type { ClassificationLevel, Result } from "../../core/types/classification.ts";
import type { SessionId } from "../../core/types/session.ts";
import type { StorageProvider } from "../../core/storage/provider.ts";
import { createLogger } from "../../core/logger/logger.ts";
import type {
  TeamDefinition,
  TeamId,
  TeamInstance,
  TeamMemberDefinition,
} from "./types.ts";
import {
  DEFAULT_IDLE_TIMEOUT_SECONDS,
  DEFAULT_MAX_LIFETIME_SECONDS,
  TEAM_STORAGE_PREFIX,
} from "./types.ts";
import { validateTeamDefinition } from "./validation.ts";
import { serializeTeamInstance, deserializeTeamInstance } from "./serialization.ts";
import {
  spawnAllMembers,
  buildPlaceholderMembers,
  deliverInitialTasks,
} from "./spawning.ts";
import {
  computeAggregateTaint,
  buildStorageKey,
  refreshMemberTaints,
  findLeadMember,
  findMemberByRole,
} from "./helpers.ts";
import { createLifecycleMonitor } from "./lifecycle.ts";

const log = createLogger("team-manager");

// ─── Public types ─────────────────────────────────────────────────────────────

/** Dependencies injected into the TeamManager. */
export interface TeamManagerDeps {
  /** Storage for persisting team state. */
  readonly storage: StorageProvider;
  /** Spawns an isolated agent session for a team member. */
  readonly spawnMemberSession: (options: SpawnMemberOptions) => Promise<SpawnedMember>;
  /** Sends a message from one session to another with write-down enforcement. */
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

  /**
   * Force-disband a team without authorization checks.
   *
   * Internal-only — used by lifecycle monitoring for auto-disband
   * on lifetime expiry. Not exposed to tool executors.
   */
  forceDisbandTeam(
    teamId: TeamId,
    reason?: string,
  ): Promise<Result<TeamInstance, string>>;

  /** Send a message to a team member from outside the team. */
  deliverTeamMessage(
    teamId: TeamId,
    callerSessionId: SessionId,
    role: string,
    message: string,
  ): Promise<Result<{ readonly delivered: true }, string>>;

  /** List teams created by a session. */
  listTeams(callerSessionId: SessionId): Promise<readonly TeamInstance[]>;

  /** Start background lifecycle monitoring for a team. */
  startLifecycleMonitor(teamId: TeamId): void;

  /** Stop lifecycle monitoring for a team. */
  stopLifecycleMonitor(teamId: TeamId): void;

  /** Stop all lifecycle monitors (cleanup on shutdown). */
  stopAllMonitors(): void;
}

// ─── Manager factory ─────────────────────────────────────────────────────────

/**
 * Create a TeamManager instance.
 *
 * Composes existing primitives (session spawning, messaging,
 * taint tracking) and adds team-specific lifecycle coordination.
 */
export function createTeamManager(deps: TeamManagerDeps): TeamManager {
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

      try {
        const members = await spawnAllMembers(definition, deps, placeholders);
        const teamId = crypto.randomUUID() as TeamId;

        const team: TeamInstance = {
          id: teamId,
          name: definition.name,
          task: definition.task,
          members,
          status: "running",
          aggregateTaint: computeAggregateTaint(members),
          createdAt: new Date(),
          createdBy,
          idleTimeoutSeconds: definition.idleTimeoutSeconds ?? DEFAULT_IDLE_TIMEOUT_SECONDS,
          maxLifetimeSeconds: definition.maxLifetimeSeconds ?? DEFAULT_MAX_LIFETIME_SECONDS,
          classificationCeiling: definition.classificationCeiling,
        };

        await deps.storage.set(buildStorageKey(teamId), serializeTeamInstance(team));
        deliverInitialTasks(definition, members, createdBy, deps);

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

      const updated: TeamInstance = { ...team, members: updatedMembers, aggregateTaint };
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

      await deps.storage.set(buildStorageKey(teamId), serializeTeamInstance(disbanded));
      monitor.stop(teamId);

      log.info("Team disbanded", {
        operation: "disbandTeam",
        teamId,
        teamName: team.name,
        finalTaint,
      });

      return { ok: true, value: disbanded };
    },

    async forceDisbandTeam(
      teamId: TeamId,
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

      log.info("Team force-disbanding (internal)", {
        operation: "forceDisbandTeam",
        teamId,
        teamName: team.name,
        reason,
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

      await deps.storage.set(buildStorageKey(teamId), serializeTeamInstance(disbanded));
      monitor.stop(teamId);

      log.info("Team force-disbanded", {
        operation: "forceDisbandTeam",
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

    async listTeams(callerSessionId: SessionId): Promise<readonly TeamInstance[]> {
      const keys = await deps.storage.list(TEAM_STORAGE_PREFIX);
      const teams: TeamInstance[] = [];

      for (const key of keys) {
        const raw = await deps.storage.get(key);
        if (!raw) continue;

        try {
          const team = deserializeTeamInstance(raw);
          if (team.createdBy === callerSessionId) {
            teams.push(team);
          }
        } catch (err: unknown) {
          log.warn("Team deserialization failed", {
            operation: "listTeams",
            callerSessionId,
            key,
            err,
          });
        }
      }

      return teams;
    },

    startLifecycleMonitor(teamId: TeamId): void {
      monitor.start(teamId);
    },

    stopLifecycleMonitor(teamId: TeamId): void {
      monitor.stop(teamId);
    },

    stopAllMonitors(): void {
      monitor.stopAll();
    },
  };

  const monitor = createLifecycleMonitor(deps, manager.forceDisbandTeam.bind(manager));

  return manager;
}
