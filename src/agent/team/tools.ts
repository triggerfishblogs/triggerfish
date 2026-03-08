/**
 * Team tool definitions, executor, and system prompt section.
 *
 * Four agent-facing tools: team_create, team_status, team_disband,
 * team_message. Follows the standard pattern: definitions + executor
 * factory + system prompt constant.
 *
 * @module
 */

import type { ToolDefinition } from "../../core/types/tool.ts";
import type { ClassificationLevel } from "../../core/types/classification.ts";
import { parseClassification } from "../../core/types/classification.ts";
import type { SessionId } from "../../core/types/session.ts";
import type { TeamManager } from "./manager.ts";
import type { TeamId, TeamMemberDefinition } from "./types.ts";
import { createLogger } from "../../core/logger/logger.ts";

const log = createLogger("team-tools");

// ─── Tool context ────────────────────────────────────────────────────────────

/** Context required by team tool executors. */
export interface TeamToolContext {
  /** The team manager instance. */
  readonly teamManager: TeamManager;
  /** The caller's session ID (injected, not from LLM). */
  readonly callerSessionId: SessionId;
  /** Live taint getter for the caller session. */
  readonly getCallerTaint?: () => ClassificationLevel;
}

// ─── Tool definitions ────────────────────────────────────────────────────────

function buildTeamCreateDef(): ToolDefinition {
  return {
    name: "team_create",
    description:
      "Create a persistent team of agents that collaborate on a task. " +
      "Define member roles, tools, and models. One member must be the lead.",
    parameters: {
      name: {
        type: "string",
        description: "Team name",
        required: true,
      },
      task: {
        type: "string",
        description: "The team's objective",
        required: true,
      },
      members: {
        type: "array",
        description: "Team member definitions",
        required: true,
        items: {
          type: "object",
          properties: {
            role: { type: "string", description: "Role identifier" },
            description: { type: "string", description: "What this member does" },
            is_lead: { type: "boolean", description: "Whether this is the team lead" },
            model: { type: "string", description: "Model override (optional)" },
            classification_ceiling: { type: "string", description: "Max classification (optional)" },
            initial_task: { type: "string", description: "Initial instructions (optional)" },
          },
        },
      },
      idle_timeout_seconds: {
        type: "number",
        description: "Per-member idle timeout. Default 300.",
      },
      max_lifetime_seconds: {
        type: "number",
        description: "Team lifetime limit. Default 3600.",
      },
      classification_ceiling: {
        type: "string",
        description: "Team-wide classification ceiling (optional)",
      },
    },
  };
}

function buildTeamStatusDef(): ToolDefinition {
  return {
    name: "team_status",
    description: "Check the current state of an active team.",
    parameters: {
      team_id: {
        type: "string",
        description: "Team ID",
        required: true,
      },
    },
  };
}

function buildTeamDisbandDef(): ToolDefinition {
  return {
    name: "team_disband",
    description:
      "Disband an active team. Only the team lead or the session that " +
      "created the team can disband it.",
    parameters: {
      team_id: {
        type: "string",
        description: "Team ID",
        required: true,
      },
      reason: {
        type: "string",
        description: "Why the team is being disbanded (optional)",
      },
    },
  };
}

function buildTeamMessageDef(): ToolDefinition {
  return {
    name: "team_message",
    description:
      "Send a message to a team member from outside the team. " +
      "Useful for providing additional context, redirecting work, or asking for updates.",
    parameters: {
      team_id: {
        type: "string",
        description: "Team ID",
        required: true,
      },
      role: {
        type: "string",
        description: "Target member role. Defaults to lead.",
      },
      message: {
        type: "string",
        description: "Message content",
        required: true,
      },
    },
  };
}

/** Get all team tool definitions. */
export function getTeamToolDefinitions(): readonly ToolDefinition[] {
  return [
    buildTeamCreateDef(),
    buildTeamStatusDef(),
    buildTeamDisbandDef(),
    buildTeamMessageDef(),
  ];
}

// ─── Tool names ──────────────────────────────────────────────────────────────

/** All team tool names recognized by the executor. */
const TEAM_TOOLS = new Set([
  "team_create",
  "team_status",
  "team_disband",
  "team_message",
]);

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
    ? input.idle_timeout_seconds
    : undefined;

  const maxLifetimeSeconds = typeof input.max_lifetime_seconds === "number"
    ? input.max_lifetime_seconds
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
  return async (
    name: string,
    input: Record<string, unknown>,
  ): Promise<string | null> => {
    if (!TEAM_TOOLS.has(name)) return null;

    if (!ctx) {
      return "Agent teams are not available in this context.";
    }

    const executor = TEAM_EXECUTORS[name];
    if (!executor) return null;

    log.info("Team tool invoked", {
      operation: name,
      callerSessionId: ctx.callerSessionId,
    });

    return executor(ctx, input);
  };
}

// ─── System prompt ───────────────────────────────────────────────────────────

/** System prompt section explaining team tools to the LLM. */
export const TEAM_SYSTEM_PROMPT = `## Agent Teams

You can create persistent teams of collaborating agents using team_create.
Each team member gets its own session, role, and tools. One member is the lead
who coordinates the work and decides when the team is done.

- Use team_create to define roles and spawn the team
- Use team_status to check progress
- Use team_message to send instructions to a specific member
- Use team_disband to shut down the team

Team members communicate with each other via sessions_send. You do not need to
relay messages between them. Once created, the team operates autonomously until
the lead disbands it, the lifetime limit is reached, or you disband it manually.

Teams are best for open-ended tasks that benefit from specialized roles working
in parallel: research + analysis + writing, architecture + implementation + review,
or any task where different perspectives need to iterate on each other's work.`;
