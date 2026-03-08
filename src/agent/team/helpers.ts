/**
 * Team helper functions — taint computation, storage keys, member lookups.
 *
 * Pure utility functions shared across team manager, lifecycle monitoring,
 * and serialization modules.
 *
 * @module
 */

import type { ClassificationLevel } from "../../core/types/classification.ts";
import { maxClassification } from "../../core/types/classification.ts";
import type { TeamId, TeamInstance, TeamMemberInstance } from "./types.ts";
import { TEAM_STORAGE_PREFIX } from "./types.ts";
import type { TeamManagerDeps } from "./manager.ts";

/** Compute aggregate taint across all team members. */
export function computeAggregateTaint(
  members: readonly TeamMemberInstance[],
): ClassificationLevel {
  let aggregate: ClassificationLevel = "PUBLIC";
  for (const member of members) {
    aggregate = maxClassification(aggregate, member.currentTaint);
  }
  return aggregate;
}

/** Build the storage key for a team. */
export function buildStorageKey(teamId: TeamId): string {
  return `${TEAM_STORAGE_PREFIX}${teamId}`;
}

/** Find the lead member in a team. */
export function findLeadMember(
  team: TeamInstance,
): TeamMemberInstance | undefined {
  return team.members.find((m) => m.isLead);
}

/** Find a member by role. */
export function findMemberByRole(
  team: TeamInstance,
  role: string,
): TeamMemberInstance | undefined {
  return team.members.find((m) => m.role === role);
}

/** Refresh member taint levels from live sessions. */
export async function refreshMemberTaints(
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
