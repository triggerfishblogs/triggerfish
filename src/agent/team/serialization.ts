/**
 * Team instance serialization and deserialization.
 *
 * Converts between runtime TeamInstance/TeamMemberInstance and their
 * JSON-safe serialized forms for StorageProvider persistence.
 *
 * @module
 */

import type { SessionId } from "../../core/types/session.ts";
import type {
  SerializedTeamInstance,
  SerializedTeamMember,
  TeamId,
  TeamInstance,
  TeamMemberInstance,
} from "./types.ts";

/** Serialize a team instance for storage. */
export function serializeTeamInstance(team: TeamInstance): string {
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
    lastOutput: member.lastOutput,
  };
}

/** Deserialize a team instance from storage. */
export function deserializeTeamInstance(json: string): TeamInstance {
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
    lastOutput: data.lastOutput,
  };
}
