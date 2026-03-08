/**
 * Team executor factory — wires TeamManager to real gateway infrastructure.
 *
 * Bridges the TeamManagerDeps interface to OrchestratorFactory (session spawning),
 * EnhancedSessionManager (taint queries, session termination), and sessions_send
 * (inter-session messaging with write-down enforcement).
 *
 * @module
 */

import type { ClassificationLevel } from "../../../core/types/classification.ts";
import type { Result } from "../../../core/types/classification.ts";
import type { SessionId } from "../../../core/types/session.ts";
import type { StorageProvider } from "../../../core/storage/provider.ts";
import type { OrchestratorFactory } from "../../../scheduler/service_types.ts";
import type { EnhancedSessionManager } from "../../sessions.ts";
import {
  createTeamManager,
  type SpawnMemberOptions,
  type SpawnedMember,
  type TeamManager,
} from "../../../agent/team/manager.ts";
import {
  createTeamToolExecutor,
  type TeamToolContext,
} from "../../../agent/team/tools.ts";
import type { SubsystemExecutor } from "../../tools/executor/executor_types.ts";
import { createLogger } from "../../../core/logger/logger.ts";

const log = createLogger("team-wiring");

/** Options for building the team executor. */
export interface TeamExecutorOptions {
  /** Storage for persisting team state. */
  readonly storage: StorageProvider;
  /** Factory for spawning isolated agent sessions. */
  readonly orchestratorFactory: OrchestratorFactory;
  /** Session manager for taint queries and termination. */
  readonly sessionManager: EnhancedSessionManager;
  /** Caller's session ID (injected, not from LLM). */
  readonly callerSessionId: SessionId;
  /** Live taint getter for the caller session. */
  readonly getCallerTaint: () => ClassificationLevel;
}

/** Build spawnMemberSession from OrchestratorFactory. */
function buildSpawnMemberSession(
  factory: OrchestratorFactory,
): (options: SpawnMemberOptions) => Promise<SpawnedMember> {
  return async (options: SpawnMemberOptions): Promise<SpawnedMember> => {
    const channelId = `team-member-${options.role}-${Date.now()}`;

    log.info("Spawning team member session", {
      operation: "spawnMemberSession",
      role: options.role,
      channelId,
    });

    const { session } = await factory.create(channelId, {
      ceiling: options.classificationCeiling,
    });

    return {
      sessionId: session.id,
      model: options.model ?? "default",
    };
  };
}

/** Build sendMessage from EnhancedSessionManager. */
function buildSendMessage(
  sessionManager: EnhancedSessionManager,
): (
  fromId: SessionId,
  toId: SessionId,
  content: string,
) => Promise<Result<{ readonly delivered: true }, string>> {
  return async (
    fromId: SessionId,
    toId: SessionId,
    content: string,
  ): Promise<Result<{ readonly delivered: true }, string>> => {
    const target = await sessionManager.get(toId);
    if (!target) {
      return { ok: false, error: `Target session not found: ${toId}` };
    }

    return sessionManager.sessionsSend(
      fromId,
      toId,
      content,
      target.taint,
    );
  };
}

/** Build getSessionTaint from EnhancedSessionManager. */
function buildGetSessionTaint(
  sessionManager: EnhancedSessionManager,
): (sessionId: SessionId) => Promise<ClassificationLevel | null> {
  return async (sessionId: SessionId): Promise<ClassificationLevel | null> => {
    const session = await sessionManager.get(sessionId);
    return session?.taint ?? null;
  };
}

/** Build terminateSession from EnhancedSessionManager. */
function buildTerminateSession(
  sessionManager: EnhancedSessionManager,
): (sessionId: SessionId) => Promise<void> {
  return async (sessionId: SessionId): Promise<void> => {
    log.info("Terminating team member session", {
      operation: "terminateSession",
      sessionId,
    });
    await sessionManager.delete(sessionId);
  };
}

/**
 * Build a TeamManager wired to real gateway infrastructure.
 *
 * Composes OrchestratorFactory, EnhancedSessionManager, and sessions_send
 * into the TeamManagerDeps interface expected by createTeamManager.
 */
export function buildTeamManager(opts: {
  readonly storage: StorageProvider;
  readonly orchestratorFactory: OrchestratorFactory;
  readonly sessionManager: EnhancedSessionManager;
  readonly callerSessionId: SessionId;
}): TeamManager {
  const sendMessage = buildSendMessage(opts.sessionManager);
  return createTeamManager({
    storage: opts.storage,
    spawnMemberSession: buildSpawnMemberSession(opts.orchestratorFactory),
    sendMessage,
    getSessionTaint: buildGetSessionTaint(opts.sessionManager),
    terminateSession: buildTerminateSession(opts.sessionManager),
    notifyCreator: async (creatorSessionId: SessionId, message: string) => {
      log.info("Notifying team creator", {
        operation: "notifyCreator",
        creatorSessionId,
        preview: message.slice(0, 100),
      });
      await sendMessage(opts.callerSessionId, creatorSessionId, message);
    },
  });
}

/**
 * Build the team tool executor for the main session.
 *
 * Returns a SubsystemExecutor that handles team_create, team_status,
 * team_disband, and team_message tool calls.
 */
export function buildTeamExecutor(
  opts: TeamExecutorOptions,
): SubsystemExecutor {
  const teamManager = buildTeamManager({
    storage: opts.storage,
    orchestratorFactory: opts.orchestratorFactory,
    sessionManager: opts.sessionManager,
    callerSessionId: opts.callerSessionId,
  });

  const ctx: TeamToolContext = {
    teamManager,
    callerSessionId: opts.callerSessionId,
    getCallerTaint: opts.getCallerTaint,
  };

  return createTeamToolExecutor(ctx);
}
