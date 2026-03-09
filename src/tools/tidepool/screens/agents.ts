/**
 * Active Agents screen types.
 *
 * Defines the session card, team hierarchy, and detail panel types.
 *
 * @module
 */

import type { ClassificationLevel } from "../../../core/types/classification.ts";
import type { StatusLevel } from "../components/status_dot.ts";

/** Session group categories for the left panel. */
export type SessionGroup = "main" | "teams" | "background";

/** Session card data for the agents list. */
export interface AgentSessionCard {
  readonly sessionId: string;
  readonly label: string;
  readonly model?: string;
  readonly taint: ClassificationLevel;
  readonly status: StatusLevel;
  readonly group: SessionGroup;
  readonly lastActivity?: string;
  /** Team info (only for team members). */
  readonly teamId?: string;
  readonly teamRole?: string;
}

/** Team hierarchy data. */
export interface AgentTeamCard {
  readonly teamId: string;
  readonly name: string;
  readonly status: StatusLevel;
  readonly taint: ClassificationLevel;
  readonly members: readonly AgentSessionCard[];
}

/** Detail panel data for a selected session. */
export interface AgentDetailData {
  readonly sessionId: string;
  readonly label: string;
  readonly model?: string;
  readonly taint: ClassificationLevel;
  readonly status: StatusLevel;
  readonly role?: string;
  readonly teamId?: string;
  readonly ceiling?: ClassificationLevel;
  readonly tokenCount?: number;
  readonly createdAt?: string;
  readonly lastActivity?: string;
}

/** Real-time agent events (topic: "agents"). */
export type AgentEventType =
  | "session_updated"
  | "session_created"
  | "session_terminated"
  | "team_created"
  | "team_updated"
  | "team_disbanded";
