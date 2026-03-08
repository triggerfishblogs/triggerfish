/**
 * Agent team module — persistent multi-agent collaboration.
 *
 * @module
 */

export type {
  TeamDefinition,
  TeamId,
  TeamInstance,
  TeamMemberDefinition,
  TeamMemberInstance,
  TeamMemberStatus,
  TeamStatus,
} from "./types.ts";

export {
  DEFAULT_IDLE_TIMEOUT_SECONDS,
  DEFAULT_MAX_LIFETIME_SECONDS,
  DISBAND_GRACE_PERIOD_SECONDS,
  LIFETIME_GRACE_PERIOD_SECONDS,
  TEAM_STORAGE_PREFIX,
} from "./types.ts";

export type {
  SpawnedMember,
  SpawnMemberOptions,
  TeamManager,
  TeamManagerDeps,
} from "./manager.ts";

export { createTeamManager } from "./manager.ts";

export { buildTeamRosterPrompt } from "./roster.ts";
export type { RosterPromptOptions } from "./roster.ts";

export type { TeamToolContext } from "./tool_definitions.ts";

export {
  getTeamToolDefinitions,
  TEAM_SYSTEM_PROMPT,
  TEAM_TOOL_NAMES,
} from "./tool_definitions.ts";

export { createTeamToolExecutor } from "./tool_executors.ts";

export type { LifecycleMonitor } from "./lifecycle.ts";
export { createLifecycleMonitor } from "./lifecycle.ts";

export {
  computeAggregateTaint,
  buildStorageKey,
  findLeadMember,
  findMemberByRole,
  refreshMemberTaints,
} from "./helpers.ts";

export {
  serializeTeamInstance,
  deserializeTeamInstance,
} from "./serialization.ts";

export { validateTeamDefinition } from "./validation.ts";

export {
  spawnAllMembers,
  buildPlaceholderMembers,
  deliverInitialTasks,
} from "./spawning.ts";
