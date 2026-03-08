/**
 * Team tool executor — input parsing, execution, and dispatch.
 *
 * Handles team_create, team_status, team_disband, and team_message
 * tool calls from the LLM. Returns null for unrecognized tool names
 * to allow chaining with other executors.
 *
 * @module
 */

import type { ClassificationLevel } from "../../core/types/classification.ts";
import { parseClassification } from "../../core/types/classification.ts";
import type { SessionId } from "../../core/types/session.ts";
import type { TeamMemberDefinition, TeamId, TeamInstance } from "./types.ts";
import type { TeamToolContext } from "./tool_definitions.ts";
import { TEAM_TOOL_NAMES } from "./tool_definitions.ts";
import { createLogger } from "../../core/logger/logger.ts";

const log = createLogger("team-tools");

/** Min/max bounds for timeout values (seconds). */
const MIN_TIMEOUT_SECONDS = 60;
const MAX_TIMEOUT_SECONDS = 86_400;

/** Clamp a timeout value to safe bounds. */
function clampTimeout(value: number): number {
  return Math.max(MIN_TIMEOUT_SECONDS, Math.min(MAX_TIMEOUT_SECONDS, Math.floor(value)));
}

/** Check if a session is the team creator or a team member. */
function isCreatorOrMember(team: TeamInstance, sessionId: SessionId): boolean {
  if (team.createdBy === sessionId) return true;
  return team.members.some((m) => m.sessionId === sessionId);
}

// ─── Input parsing ───────────────────────────────────────────────────────────

/** Parse a member definition from LLM input. */
function parseMemberInput(
  raw: Record<string, unknown>,
): TeamMemberDefinition | string {
  const role = raw.role;
  if (typeof role !== "string" || role.length === 0) {
    return "Member role must be a non-empty string";
  }

  const description = raw.description;
  if (typeof description !== "string" || description.length === 0) {
    return "Member description must be a non-empty string";
  }

  const isLead = raw.is_lead === true;
  const model = typeof raw.model === "string" ? raw.model : undefined;
  const initialTask = typeof raw.initial_task === "string"
    ? raw.initial_task
    : undefined;

  let classificationCeiling: ClassificationLevel | undefined;
  if (typeof raw.classification_ceiling === "string") {
    const parsed = parseClassification(raw.classification_ceiling);
    if (!parsed.ok) return parsed.error;
    classificationCeiling = parsed.value;
  }

  return {
    role,
    description,
    isLead,
    model,
    classificationCeiling,
    initialTask,
  };
}

/** Parse members array from LLM input. */
function parseMembersInput(
  raw: unknown,
): readonly TeamMemberDefinition[] | string {
  if (!Array.isArray(raw) || raw.length === 0) {
    return "Members must be a non-empty array";
  }

  const members: TeamMemberDefinition[] = [];
  for (const item of raw) {
    if (typeof item !== "object" || item === null) {
      return "Each member must be an object";
    }
    const parsed = parseMemberInput(item as Record<string, unknown>);
    if (typeof parsed === "string") return parsed;
    members.push(parsed);
  }

  return members;
}

// ─── Executors ───────────────────────────────────────────────────────────────

/** Execute team_create. */
async function executeTeamCreate(
  ctx: TeamToolContext,
  input: Record<string, unknown>,
): Promise<string> {
  const name = input.name;
  if (typeof name !== "string" || name.length === 0) {
    return "Error: team_create requires a non-empty 'name' argument.";
  }

  const task = input.task;
  if (typeof task !== "string" || task.length === 0) {
    return "Error: team_create requires a non-empty 'task' argument.";
  }

  const membersResult = parseMembersInput(input.members);
  if (typeof membersResult === "string") {
    return `Error: ${membersResult}`;
  }

  let classificationCeiling: ClassificationLevel | undefined;
  if (typeof input.classification_ceiling === "string") {
    const parsed = parseClassification(input.classification_ceiling);
    if (!parsed.ok) return `Error: ${parsed.error}`;
    classificationCeiling = parsed.value;
  }

  const idleTimeoutSeconds = typeof input.idle_timeout_seconds === "number"
    ? clampTimeout(input.idle_timeout_seconds)
    : undefined;

  const maxLifetimeSeconds = typeof input.max_lifetime_seconds === "number"
    ? clampTimeout(input.max_lifetime_seconds)
    : undefined;

  const result = await ctx.teamManager.createTeam(
    {
      name,
      task,
      members: membersResult,
      idleTimeoutSeconds,
      maxLifetimeSeconds,
      classificationCeiling,
    },
    ctx.callerSessionId,
  );

  if (!result.ok) return `Error: ${result.error}`;

  const team = result.value;
  return JSON.stringify({
    team_id: team.id,
    name: team.name,
    status: team.status,
    members: team.members.map((m) => ({
      role: m.role,
      session_id: m.sessionId,
      is_lead: m.isLead,
    })),
  });
}

/** Execute team_status. */
async function executeTeamStatus(
  ctx: TeamToolContext,
  input: Record<string, unknown>,
): Promise<string> {
  const teamId = input.team_id;
  if (typeof teamId !== "string" || teamId.length === 0) {
    return "Error: team_status requires a non-empty 'team_id' argument.";
  }

  const result = await ctx.teamManager.fetchTeamStatus(teamId as TeamId);
  if (!result.ok) return `Error: ${result.error}`;

  const team = result.value;

  if (!isCreatorOrMember(team, ctx.callerSessionId)) {
    log.warn("Unauthorized team_status attempt", {
      operation: "team_status",
      teamId,
      callerSessionId: ctx.callerSessionId,
      createdBy: team.createdBy,
    });
    return "Error: Team status denied: caller is not the creator or a member";
  }

  return JSON.stringify({
    team_id: team.id,
    name: team.name,
    status: team.status,
    aggregate_taint: team.aggregateTaint,
    members: team.members.map((m) => ({
      role: m.role,
      session_id: m.sessionId,
      is_lead: m.isLead,
      status: m.status,
      current_taint: m.currentTaint,
      last_activity: m.lastActivityAt.toISOString(),
      last_output: m.lastOutput ?? null,
    })),
    created_at: team.createdAt.toISOString(),
    idle_timeout_seconds: team.idleTimeoutSeconds,
    max_lifetime_seconds: team.maxLifetimeSeconds,
    classification_ceiling: team.classificationCeiling,
  });
}

/** Execute team_disband. */
async function executeTeamDisband(
  ctx: TeamToolContext,
  input: Record<string, unknown>,
): Promise<string> {
  const teamId = input.team_id;
  if (typeof teamId !== "string" || teamId.length === 0) {
    return "Error: team_disband requires a non-empty 'team_id' argument.";
  }

  const reason = typeof input.reason === "string" ? input.reason : undefined;

  const result = await ctx.teamManager.disbandTeam(
    teamId as TeamId,
    ctx.callerSessionId,
    reason,
  );

  if (!result.ok) return `Error: ${result.error}`;

  return JSON.stringify({
    team_id: result.value.id,
    status: result.value.status,
    aggregate_taint: result.value.aggregateTaint,
  });
}

/** Execute team_message. */
async function executeTeamMessage(
  ctx: TeamToolContext,
  input: Record<string, unknown>,
): Promise<string> {
  const teamId = input.team_id;
  if (typeof teamId !== "string" || teamId.length === 0) {
    return "Error: team_message requires a non-empty 'team_id' argument.";
  }

  const message = input.message;
  if (typeof message !== "string" || message.length === 0) {
    return "Error: team_message requires a non-empty 'message' argument.";
  }

  const role = typeof input.role === "string" ? input.role : "";

  const statusResult = await ctx.teamManager.fetchTeamStatus(teamId as TeamId);
  if (statusResult.ok && !isCreatorOrMember(statusResult.value, ctx.callerSessionId)) {
    log.warn("Unauthorized team_message attempt", {
      operation: "team_message",
      teamId,
      callerSessionId: ctx.callerSessionId,
      createdBy: statusResult.value.createdBy,
    });
    return "Error: Team message denied: caller is not the creator or a member";
  }

  const result = await ctx.teamManager.deliverTeamMessage(
    teamId as TeamId,
    ctx.callerSessionId,
    role,
    message,
  );

  if (!result.ok) return `Error: ${result.error}`;

  return JSON.stringify({ delivered: true, target_role: role || "lead" });
}

// ─── Executor dispatch ───────────────────────────────────────────────────────

/** Map of team tool names to their executor functions. */
const TEAM_EXECUTORS: Readonly<
  Record<string, (ctx: TeamToolContext, input: Record<string, unknown>) => Promise<string>>
> = {
  team_create: executeTeamCreate,
  team_status: executeTeamStatus,
  team_disband: executeTeamDisband,
  team_message: executeTeamMessage,
};

/**
 * Create a tool executor for team tools.
 *
 * Returns null for non-team tool names (allowing chaining).
 */
export function createTeamToolExecutor(
  ctx: TeamToolContext | undefined,
): (name: string, input: Record<string, unknown>) => Promise<string | null> {
  return (
    name: string,
    input: Record<string, unknown>,
  ): Promise<string | null> => {
    if (!TEAM_TOOL_NAMES.has(name)) return Promise.resolve(null);

    if (!ctx) {
      return Promise.resolve("Agent teams are not available in this context.");
    }

    const executor = TEAM_EXECUTORS[name];
    if (!executor) return Promise.resolve(null);

    log.info("Team tool invoked", {
      operation: name,
      callerSessionId: ctx.callerSessionId,
    });

    return executor(ctx, input);
  };
}
