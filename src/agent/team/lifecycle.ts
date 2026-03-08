/**
 * Team lifecycle monitoring — idle timeouts, lifetime limits, health checks.
 *
 * Runs periodic checks on active teams and takes corrective action:
 * nudging idle members, terminating unresponsive sessions, warning
 * about lifetime limits, and notifying the creator of failures.
 *
 * @module
 */

import type { Result } from "../../core/types/classification.ts";
import type { TeamId, TeamInstance, TeamMemberInstance } from "./types.ts";
import { LIFETIME_GRACE_PERIOD_SECONDS } from "./types.ts";
import type { TeamManagerDeps } from "./manager.ts";
import { serializeTeamInstance } from "./serialization.ts";
import { deserializeTeamInstance } from "./serialization.ts";
import { computeAggregateTaint, buildStorageKey } from "./helpers.ts";
import { createLogger } from "../../core/logger/logger.ts";

const log = createLogger("team-lifecycle");

/** Check interval for lifecycle monitoring (30 seconds). */
const LIFECYCLE_CHECK_INTERVAL_MS = 30_000;

/** State tracked per team for lifecycle monitoring. */
interface MonitorState {
  readonly intervalId: number;
  nudgedMembers: Set<string>;
  lifetimeWarned: boolean;
}

/** Lifecycle monitor for active teams. */
export interface LifecycleMonitor {
  /** Start monitoring a team. */
  start(teamId: TeamId): void;
  /** Stop monitoring a team. */
  stop(teamId: TeamId): void;
  /** Stop all active monitors. */
  stopAll(): void;
}

/**
 * Create a lifecycle monitor that periodically checks team health.
 *
 * @param deps - Team manager dependencies for storage, messaging, taint
 * @param forceDisbandTeam - Callback to force-disband a team on lifetime expiry (no auth check)
 */
export function createLifecycleMonitor(
  deps: TeamManagerDeps,
  forceDisbandTeam: (
    teamId: TeamId,
    reason?: string,
  ) => Promise<Result<TeamInstance, string>>,
): LifecycleMonitor {
  const monitors = new Map<string, MonitorState>();

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
      await forceDisbandTeam(teamId, "Lifetime limit reached");
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

  return {
    start(teamId: TeamId): void {
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

    stop(teamId: TeamId): void {
      stopMonitor(teamId);
    },

    stopAll(): void {
      for (const [id] of monitors) {
        stopMonitor(id as TeamId);
      }
    },
  };
}

// ─── Individual health checks ─────────────────────────────────────────────────

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
