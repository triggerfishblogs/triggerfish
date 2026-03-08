/**
 * Agent team types — definitions for persistent multi-agent collaboration.
 *
 * Teams are persistent groups of agent sessions that collaborate on
 * open-ended work. Each member has its own role, tools, model, and
 * classification ceiling. Communication is explicit via sessions_send.
 *
 * @module
 */

import type { ClassificationLevel } from "../../core/types/classification.ts";
import type { SessionId } from "../../core/types/session.ts";

/** Branded type for team identifiers. */
export type TeamId = string & { readonly __brand: unique symbol };

/** Role definition provided at team creation time. */
export interface TeamMemberDefinition {
  /** Unique role identifier within the team (e.g., "researcher", "architect"). */
  readonly role: string;

  /** Natural language description of what this member does. Injected into system prompt. */
  readonly description: string;

  /** Whether this member is the team lead. Exactly one per team. */
  readonly isLead: boolean;

  /** Tool profile override. If omitted, inherits the creating agent's profile. */
  readonly tools?: {
    readonly profile?: string;
    readonly allow?: readonly string[];
    readonly deny?: readonly string[];
  };

  /** Model override. If omitted, inherits the creating agent's model. */
  readonly model?: string;

  /** Classification ceiling for this member. If omitted, no ceiling. */
  readonly classificationCeiling?: ClassificationLevel;

  /**
   * Optional initial instructions sent to this member at team creation.
   * If omitted and this member is the lead, the team's task is sent instead.
   * If omitted and this member is not the lead, the member idles until
   * it receives work from another member.
   */
  readonly initialTask?: string;
}

/** Full team definition provided to team_create. */
export interface TeamDefinition {
  /** Human-readable team name. */
  readonly name: string;

  /** The task or objective for the team. Sent to the lead at creation. */
  readonly task: string;

  /** Member definitions. Must contain exactly one member with isLead: true. */
  readonly members: readonly TeamMemberDefinition[];

  /**
   * Maximum idle time in seconds before a member session is terminated.
   * Applies per member. Default: 300 (5 minutes).
   */
  readonly idleTimeoutSeconds?: number;

  /**
   * Maximum total lifetime in seconds for the team. After this, the team
   * is automatically disbanded. Default: 3600 (1 hour).
   */
  readonly maxLifetimeSeconds?: number;

  /**
   * Classification ceiling for the entire team. If set, no member can be
   * created with a higher ceiling, and any member whose taint exceeds this
   * level causes the team to pause and notify the owner.
   */
  readonly classificationCeiling?: ClassificationLevel;
}

/** Member status within an active team. */
export type TeamMemberStatus = "active" | "idle" | "completed" | "failed";

/** Runtime state of a single team member. */
export interface TeamMemberInstance {
  readonly role: string;
  readonly description: string;
  readonly isLead: boolean;
  readonly sessionId: SessionId;
  readonly model: string;
  readonly classificationCeiling?: ClassificationLevel;
  readonly status: TeamMemberStatus;
  readonly currentTaint: ClassificationLevel;
  readonly lastActivityAt: Date;
  /** Last text output produced by this member's agent turn (truncated). */
  readonly lastOutput?: string;
}

/** Overall team status. */
export type TeamStatus =
  | "running"
  | "paused"
  | "completed"
  | "disbanded"
  | "timed_out";

/** Runtime state of an active team. */
export interface TeamInstance {
  readonly id: TeamId;
  readonly name: string;
  readonly task: string;
  readonly members: readonly TeamMemberInstance[];
  readonly status: TeamStatus;
  readonly aggregateTaint: ClassificationLevel;
  readonly createdAt: Date;
  readonly createdBy: SessionId;
  readonly idleTimeoutSeconds: number;
  readonly maxLifetimeSeconds: number;
  readonly classificationCeiling?: ClassificationLevel;
}

/** Default idle timeout per member in seconds. */
export const DEFAULT_IDLE_TIMEOUT_SECONDS = 300;

/** Default maximum team lifetime in seconds. */
export const DEFAULT_MAX_LIFETIME_SECONDS = 3600;

/** Grace period in seconds for members to flush work during disband. */
export const DISBAND_GRACE_PERIOD_SECONDS = 30;

/** Grace period in seconds for lead to wrap up after lifetime timeout. */
export const LIFETIME_GRACE_PERIOD_SECONDS = 60;

/** Storage key prefix for team instances. */
export const TEAM_STORAGE_PREFIX = "team:";

/** Serializable form of TeamInstance for storage. */
export interface SerializedTeamInstance {
  readonly id: string;
  readonly name: string;
  readonly task: string;
  readonly members: readonly SerializedTeamMember[];
  readonly status: TeamStatus;
  readonly aggregateTaint: ClassificationLevel;
  readonly createdAt: string;
  readonly createdBy: string;
  readonly idleTimeoutSeconds: number;
  readonly maxLifetimeSeconds: number;
  readonly classificationCeiling?: ClassificationLevel;
}

/** Serializable form of TeamMemberInstance. */
export interface SerializedTeamMember {
  readonly role: string;
  readonly description: string;
  readonly isLead: boolean;
  readonly sessionId: string;
  readonly model: string;
  readonly classificationCeiling?: ClassificationLevel;
  readonly status: TeamMemberStatus;
  readonly currentTaint: ClassificationLevel;
  readonly lastActivityAt: string;
  readonly lastOutput?: string;
}
