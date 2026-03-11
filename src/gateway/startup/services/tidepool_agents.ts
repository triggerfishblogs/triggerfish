/**
 * Tidepool agents topic — session list and team list builders.
 *
 * Provides the data for the Tidepool "agents" screen, including
 * the main session, background sessions, and active teams.
 *
 * @module
 */

import { createLogger } from "../../../core/logger/mod.ts";
import type { CoreInfraResult } from "../infra/core_infra.ts";
import type { ToolInfraResult } from "../tools/tool_infra.ts";

const log = createLogger("tidepool-topics");

/** Serialize taint history events for client transport. */
function serializeTaintHistory(
  history: readonly {
    readonly timestamp: Date;
    readonly previousLevel: string;
    readonly newLevel: string;
    readonly reason: string;
    readonly sourceId?: string;
  }[],
): Record<string, unknown>[] {
  return history.map((e) => ({
    timestamp: e.timestamp?.toISOString?.() ?? null,
    previousLevel: e.previousLevel,
    newLevel: e.newLevel,
    reason: e.reason,
    sourceId: e.sourceId ?? null,
  }));
}

/** Data returned by the agent list builder. */
export interface AgentListData {
  readonly sessions: Record<string, unknown>[];
  readonly teams: Record<string, unknown>[];
}

/** Build the agent session list and team list from available data. */
export async function buildAgentListDataAsync(
  coreInfra: CoreInfraResult,
  toolInfra: ToolInfraResult,
): Promise<AgentListData> {
  const sessions: Record<string, unknown>[] = [];

  const mainState = toolInfra.state.session;
  sessions.push({
    sessionId: "main",
    label: "Main Session",
    group: "main",
    status: "green",
    taint: mainState.taint,
    channelId: mainState.channelId ?? null,
    createdAt: mainState.createdAt?.toISOString?.() ?? null,
    history: serializeTaintHistory(mainState.history ?? []),
  });

  if (coreInfra.enhancedSessionManager) {
    try {
      const managed = await coreInfra.enhancedSessionManager.sessionsList();
      for (const s of managed) {
        sessions.push({
          sessionId: s.id,
          label: `Session ${String(s.channelId)}`,
          group: "background",
          status: "gray",
          taint: s.taint ?? "PUBLIC",
          channelId: s.channelId,
          createdAt: s.createdAt?.toISOString?.() ?? null,
          history: serializeTaintHistory(s.history ?? []),
        });
      }
    } catch (err) {
      log.warn("Session list retrieval failed", {
        operation: "sessionsList",
        err,
      });
    }
  }

  const teams = await buildTeamListFromStorage(coreInfra);

  return { sessions, teams };
}

/** Map team status strings to StatusLevel dot colors. */
function teamStatusToLevel(status: string): string {
  switch (status) {
    case "running":
      return "green";
    case "paused":
      return "yellow";
    case "completed":
      return "gray";
    case "disbanded":
    case "timed_out":
      return "red";
    default:
      return "gray";
  }
}

/** Map member status strings to StatusLevel dot colors. */
function memberStatusToLevel(status: string): string {
  switch (status) {
    case "active":
      return "green";
    case "idle":
      return "yellow";
    case "completed":
      return "gray";
    case "failed":
      return "red";
    default:
      return "gray";
  }
}

/** Parsed team shape from storage JSON. */
interface StoredTeam {
  readonly id: string;
  readonly name: string;
  readonly status: string;
  readonly aggregateTaint: string;
  readonly createdAt: string;
  readonly maxLifetimeSeconds: number;
  readonly members: readonly StoredTeamMember[];
}

/** Parsed team member shape from storage JSON. */
interface StoredTeamMember {
  readonly role: string;
  readonly description: string;
  readonly isLead: boolean;
  readonly sessionId: string;
  readonly status: string;
  readonly currentTaint: string;
  readonly lastActivityAt: string;
  readonly lastOutput?: string;
  readonly model?: string;
}

/**
 * Check if a "running" team has exceeded its lifetime.
 *
 * When the daemon restarts, lifecycle monitor timers are lost.
 * Teams that were "running" at shutdown remain "running" in storage
 * forever. This detects those zombies and marks them timed_out.
 */
async function autoExpireZombieTeam(
  key: string,
  team: StoredTeam,
  storage: CoreInfraResult["storage"],
): Promise<string> {
  if (team.status !== "running" && team.status !== "paused") {
    return team.status;
  }

  const createdMs = new Date(team.createdAt).getTime();
  const lifetimeMs = (team.maxLifetimeSeconds || 3600) * 1_000;
  const graceMs = 60_000;

  if (Date.now() < createdMs + lifetimeMs + graceMs) {
    return team.status;
  }

  log.info("Auto-expiring zombie team past lifetime", {
    operation: "autoExpireZombieTeam",
    teamId: team.id,
    teamName: team.name,
    createdAt: team.createdAt,
    maxLifetimeSeconds: team.maxLifetimeSeconds,
  });

  const expired = {
    ...team,
    status: "timed_out",
    members: team.members.map((m) =>
      m.status === "active" || m.status === "idle"
        ? { ...m, status: "completed" }
        : m
    ),
  };
  await storage.set(key, JSON.stringify(expired));
  return "timed_out";
}

/** Fetch active teams from storage and convert to AgentTeamCard format. */
async function buildTeamListFromStorage(
  coreInfra: CoreInfraResult,
): Promise<Record<string, unknown>[]> {
  const teams: Record<string, unknown>[] = [];

  try {
    const keys = await coreInfra.storage.list("team:");
    for (const key of keys) {
      const raw = await coreInfra.storage.get(key);
      if (!raw) continue;

      try {
        const team = JSON.parse(raw) as StoredTeam;
        const effectiveStatus = await autoExpireZombieTeam(
          key,
          team,
          coreInfra.storage,
        );

        if (effectiveStatus !== "running" && effectiveStatus !== "paused") {
          continue;
        }

        teams.push({
          teamId: team.id,
          name: team.name,
          status: teamStatusToLevel(effectiveStatus),
          rawStatus: effectiveStatus,
          taint: team.aggregateTaint,
          members: team.members.map((m) => ({
            sessionId: m.sessionId,
            label: `${m.isLead ? "Lead" : "Member"}: ${m.role}`,
            model: m.model ?? null,
            taint: m.currentTaint,
            status: memberStatusToLevel(m.status),
            group: "teams",
            teamId: team.id,
            teamRole: m.role,
            lastActivity: m.lastActivityAt,
            lastOutput: m.lastOutput ?? null,
          })),
        });
      } catch (parseErr) {
        log.warn("Team deserialization failed in tidepool builder", {
          operation: "buildTeamListFromStorage",
          key,
          err: parseErr,
        });
      }
    }
  } catch (err) {
    log.warn("Team storage list failed", {
      operation: "buildTeamListFromStorage",
      err,
    });
  }

  return teams;
}
